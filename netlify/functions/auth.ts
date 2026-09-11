import { Handler, HandlerEvent } from '@netlify/functions';
import { 
  getUserByEmail, 
  createUser, 
  getUserById, 
  getUserByReferralCode, 
  updateUser 
} from './lib/db';
import { 
  hashPassword, 
  comparePassword, 
  createSessionToken, 
  verifySessionToken, 
  extractTokenFromHeader, 
  generateReferralCode 
} from './lib/security';
import { getDailyUsage } from './lib/db';
import { getResetCountdown, getTodayString } from './lib/tokenManager';
import { DEFAULT_ROLE_LIMITS, User } from './lib/types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  // Parse path: e.g. /.netlify/functions/auth/login or /api/auth/login
  const pathParts = event.path.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1]; // 'signup', 'login', 'me', 'reset-password', 'profile'

  try {
    // --- 1. SIGNUP ---
    if (event.httpMethod === 'POST' && (action === 'signup' || action === 'register')) {
      const body = JSON.parse(event.body || '{}');
      const { email, password, displayName, referralCode } = body;

      if (!email || !password || password.length < 6) {
        return {
          statusCode: 400,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'Valid email and a password with at least 6 characters are required.' }),
        };
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return {
          statusCode: 409,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'An account with this email already exists.' }),
        };
      }

      let referredByEmail: string | undefined = undefined;
      if (referralCode) {
        const referrer = await getUserByReferralCode(referralCode);
        if (referrer) {
          referredByEmail = referrer.display_name || referrer.email;
        }
      }

      const passwordHash = await hashPassword(password);
      const uniqueRefCode = generateReferralCode();
      const now = new Date().toISOString();

      // Strict whitelist: Only owner & whitelisted emails get admin; all others are strictly 'free' users
      const envAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
      const ADMIN_EMAILS = [
        'careysison21@gmail.com',
        'carey@chobee.app',
        ...(envAdmin ? envAdmin.toLowerCase().split(',').map((e) => e.trim()) : [])
      ];
      const isAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase());
      const role = isAdmin ? 'admin' : 'free';
      const dailyLimit = DEFAULT_ROLE_LIMITS[role];

      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        display_name: (displayName || email.split('@')[0]).trim(),
        role,
        daily_token_limit: dailyLimit,
        referral_code: uniqueRefCode,
        referred_by: referredByEmail,
        created_at: now,
        last_login: now,
        is_disabled: false,
      };

      await createUser(newUser);
      const token = createSessionToken(newUser);
      const today = getTodayString();
      const usage = await getDailyUsage(newUser.id, today);
      const countdown = getResetCountdown();

      return {
        statusCode: 201,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            displayName: newUser.display_name,
            role: newUser.role,
            referralCode: newUser.referral_code,
            referredBy: newUser.referred_by,
            dailyTokenLimit: newUser.daily_token_limit,
            createdAt: newUser.created_at,
          },
          usage: {
            allocated: usage.tokens_allocated,
            used: usage.tokens_used,
            remaining: usage.tokens_remaining,
            resetCountdown: countdown.formatted,
          },
        }),
      };
    }

    // --- 2. LOGIN ---
    if (event.httpMethod === 'POST' && action === 'login') {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'Email and password are required.' }),
        };
      }

      const envAdmin = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
      const ADMIN_EMAILS = [
        'careysison21@gmail.com',
        'carey@chobee.app',
        ...(envAdmin ? envAdmin.toLowerCase().split(',').map((e) => e.trim()) : [])
      ];
      const isWhitelistedAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase());

      let user = await getUserByEmail(email);
      if (!user) {
        // If whitelisted owner/admin attempts login, auto-create their account immediately with the password provided!
        if (isWhitelistedAdmin) {
          const passwordHash = await hashPassword(password);
          const uniqueRefCode = generateReferralCode();
          const now = new Date().toISOString();
          const newAdminUser: User = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            email: email.trim().toLowerCase(),
            password_hash: passwordHash,
            display_name: email.split('@')[0],
            role: 'admin',
            daily_token_limit: DEFAULT_ROLE_LIMITS.admin,
            referral_code: uniqueRefCode,
            created_at: now,
            last_login: now,
            is_disabled: false,
          };
          user = await createUser(newAdminUser);
        } else {
          return {
            statusCode: 401,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'Account not found. Please click "Sign Up (Free)" tab above to create your account first!' }),
          };
        }
      }

      if (user.is_disabled) {
        return {
          statusCode: 403,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'This account has been disabled by the administrator.' }),
        };
      }

      const matches = await comparePassword(password, user.password_hash);
      if (!matches) {
        // If it is the whitelisted admin owner, update password directly so owner is never locked out
        if (isWhitelistedAdmin) {
          const newHash = await hashPassword(password);
          await updateUser(user.id, { password_hash: newHash, role: 'admin', daily_token_limit: DEFAULT_ROLE_LIMITS.admin });
          user.role = 'admin';
        } else {
          return {
            statusCode: 401,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'Incorrect password. Click "Forgot password?" to reset it.' }),
          };
        }
      }

      await updateUser(user.id, { last_login: new Date().toISOString() });
      const token = createSessionToken(user);
      const today = getTodayString();
      const usage = await getDailyUsage(user.id, today);
      const countdown = getResetCountdown();

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          token,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            referralCode: user.referral_code,
            referredBy: user.referred_by,
            dailyTokenLimit: user.daily_token_limit,
            createdAt: user.created_at,
          },
          usage: {
            allocated: usage.tokens_allocated,
            used: usage.tokens_used,
            remaining: usage.tokens_remaining,
            resetCountdown: countdown.formatted,
          },
        }),
      };
    }

    // --- 3. GET CURRENT USER (/me) ---
    if (event.httpMethod === 'GET' && (action === 'me' || action === 'auth')) {
      const token = extractTokenFromHeader(event.headers.authorization);
      if (!token) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const payload = verifySessionToken(token);
      if (!payload) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Session expired or invalid.' }) };
      }

      const user = await getUserById(payload.userId);
      if (!user) {
        return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'User not found.' }) };
      }

      if (user.is_disabled) {
        return { statusCode: 403, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Account disabled.' }) };
      }

      const today = getTodayString();
      const usage = await getDailyUsage(user.id, today);
      const countdown = getResetCountdown();

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            referralCode: user.referral_code,
            referredBy: user.referred_by,
            dailyTokenLimit: user.daily_token_limit,
            createdAt: user.created_at,
            lastLogin: user.last_login,
          },
          usage: {
            allocated: usage.tokens_allocated,
            used: usage.tokens_used,
            remaining: usage.tokens_remaining,
            resetCountdown: countdown.formatted,
          },
        }),
      };
    }

    // --- 4. RESET PASSWORD ---
    if (event.httpMethod === 'POST' && (action === 'reset-password' || action === 'forgot-password')) {
      const body = JSON.parse(event.body || '{}');
      const { email, newPassword } = body;

      if (!email || !newPassword || newPassword.length < 6) {
        return {
          statusCode: 400,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'Email and new password with at least 6 characters required.' }),
        };
      }

      const user = await getUserByEmail(email);
      if (!user) {
        // Return 200 to prevent email enumeration
        return {
          statusCode: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify({ message: 'If the email exists, the password has been reset.' }),
        };
      }

      const passwordHash = await hashPassword(newPassword);
      await updateUser(user.id, { password_hash: passwordHash });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ message: 'Password updated successfully. You can now login.' }),
      };
    }

    // --- 5. UPDATE PROFILE ---
    if (event.httpMethod === 'PATCH' && action === 'profile') {
      const token = extractTokenFromHeader(event.headers.authorization);
      const payload = token ? verifySessionToken(token) : null;
      if (!payload) {
        return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const body = JSON.parse(event.body || '{}');
      const updates: Partial<User> = {};
      if (body.displayName && body.displayName.trim()) {
        updates.display_name = body.displayName.trim();
      }

      const updated = await updateUser(payload.userId, updates);
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          user: {
            id: updated?.id,
            email: updated?.email,
            displayName: updated?.display_name,
            role: updated?.role,
            referralCode: updated?.referral_code,
            referredBy: updated?.referred_by,
          },
        }),
      };
    }

    return {
      statusCode: 404,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: `Action '${action}' not found.` }),
    };
  } catch (err: any) {
    console.error('Auth error:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
