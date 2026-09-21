import { Handler, HandlerEvent } from '@netlify/functions';
import { verifySessionToken, extractTokenFromHeader } from './lib/security';
import { listAllUsers, getUserById, updateUser, getAllAIUsageLogs, getDailyUsage } from './lib/db';
import { getTodayString } from './lib/tokenManager';

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

  try {
    const token = extractTokenFromHeader(event.headers);
    if (!token) {
      return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const payload = verifySessionToken(token);
    const ADMIN_EMAILS = [
      'careysison21@gmail.com',
      'ciarabernadette12@gmail.com',
      'carey@chobee.app',
      ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().split(',').map((e: string) => e.trim()) : [])
    ];

    const isEmailAdmin = Boolean(payload?.email && ADMIN_EMAILS.includes(payload.email.toLowerCase().trim()));
    const adminUser = payload?.userId ? await getUserById(payload.userId) : null;

    if (!payload || (!isEmailAdmin && (!adminUser || adminUser.role !== 'admin' || adminUser.is_disabled))) {
      return {
        statusCode: 403,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Access denied: Admin privileges required.' }),
      };
    }

    const pathParts = event.path.split('/').filter(Boolean);
    const subRoute = pathParts[pathParts.length - 1]; // 'metrics', 'users', 'update'

    // --- 1. ADMIN METRICS & DASHBOARD ---
    if (event.httpMethod === 'GET' && subRoute === 'metrics') {
      const allLogs = await getAllAIUsageLogs(200);
      const today = getTodayString();

      // Check Supabase if configured
      let allUsers: any[] = await listAllUsers();
      const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (sbUrl && sbKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(sbUrl, sbKey);
          const { data: dbProfiles } = await sb.from('profiles').select('*');
          if (dbProfiles && dbProfiles.length > 0) {
            const mapped = dbProfiles.map((p) => ({
              id: p.id,
              email: p.email,
              display_name: p.display_name,
              role: p.role,
              daily_token_limit: p.daily_token_limit,
              referral_code: p.referral_code,
              referred_by: p.referred_by,
              created_at: p.created_at,
              last_login: p.last_login_at,
              is_disabled: p.is_disabled,
            }));
            const emails = new Set(mapped.map((m) => m.email.toLowerCase()));
            allUsers = [...mapped, ...allUsers.filter((u) => !emails.has(u.email.toLowerCase()))];
          }
        } catch (e) {}
      }

      // Active today: users with login today or logs today
      const activeUserIds = new Set<string>();
      allUsers.forEach((u) => {
        if (u.last_login && u.last_login.startsWith(today)) activeUserIds.add(u.id);
      });
      allLogs.forEach((l) => {
        if (l.timestamp.startsWith(today)) activeUserIds.add(l.user_id);
      });

      const todayLogs = allLogs.filter((l) => l.timestamp.startsWith(today));
      const totalTokensConsumedToday = todayLogs.reduce((acc, l) => acc + (l.tokens_used > 0 ? l.tokens_used : 0), 0);

      // Feature count
      const featureCounts: Record<string, number> = {};
      allLogs.forEach((l) => {
        featureCounts[l.action_type] = (featureCounts[l.action_type] || 0) + 1;
      });
      let mostUsedFeature = 'flashcards';
      let maxFeatureCount = 0;
      Object.entries(featureCounts).forEach(([feat, count]) => {
        if (count > maxFeatureCount) {
          maxFeatureCount = count;
          mostUsedFeature = feat;
        }
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          metrics: {
            totalUsers: allUsers.length,
            activeUsersToday: activeUserIds.size,
            aiRequestsToday: todayLogs.length,
            totalTokensConsumedToday,
            mostUsedFeature,
          },
        }),
      };
    }

    // --- 2. USER LIST ---
    if (event.httpMethod === 'GET' && (subRoute === 'users' || subRoute === 'admin')) {
      const today = getTodayString();
      const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (sbUrl && sbKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(sbUrl, sbKey);
          const { data: dbProfiles } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
          if (dbProfiles && dbProfiles.length > 0) {
            const { data: usages } = await sb.from('daily_usage').select('*').eq('date', today);
            const usageMap = new Map((usages || []).map((u: any) => [u.user_id, u]));

            const mapped = dbProfiles.map((p) => {
              const uUsage = usageMap.get(p.id);
              return {
                id: p.id,
                email: p.email,
                displayName: p.display_name,
                role: p.role,
                dailyTokenLimit: p.daily_token_limit,
                referralCode: p.referral_code,
                referredBy: p.referred_by,
                createdAt: p.created_at,
                lastLogin: p.last_login_at,
                isDisabled: Boolean(p.is_disabled),
                todayUsage: {
                  used: uUsage?.tokens_used || 0,
                  remaining: uUsage?.tokens_remaining ?? (p.daily_token_limit || 100),
                },
              };
            });

            return {
              statusCode: 200,
              headers: JSON_HEADERS,
              body: JSON.stringify({ users: mapped }),
            };
          }
        } catch (e) {}
      }

      const allUsers = await listAllUsers();
      const userDetails = await Promise.all(
        allUsers.map(async (u) => {
          const usage = await getDailyUsage(u.id, today);
          return {
            id: u.id,
            email: u.email,
            displayName: u.display_name,
            role: u.role,
            dailyTokenLimit: u.daily_token_limit,
            referralCode: u.referral_code,
            referredBy: u.referred_by,
            createdAt: u.created_at,
            lastLogin: u.last_login,
            isDisabled: u.is_disabled,
            todayUsage: {
              used: usage.tokens_used,
              remaining: usage.tokens_remaining,
            },
          };
        })
      );

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ users: userDetails }),
      };
    }

    // --- 3. UPDATE USER LIMIT OR STATUS ---
    if (event.httpMethod === 'POST' && (subRoute === 'update' || subRoute === 'user-update')) {
      const body = JSON.parse(event.body || '{}');
      const { targetUserId, dailyTokenLimit, isDisabled, role } = body;

      if (!targetUserId) {
        return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'targetUserId is required' }) };
      }

      const updates: any = {};
      if (typeof dailyTokenLimit === 'number' && dailyTokenLimit >= 0) {
        updates.daily_token_limit = dailyTokenLimit;
      }
      if (typeof isDisabled === 'boolean') {
        updates.is_disabled = isDisabled;
      }
      if (role && ['free', 'premium', 'admin'].includes(role)) {
        updates.role = role;
        if (typeof dailyTokenLimit !== 'number') {
          updates.daily_token_limit = role === 'admin' ? 999999 : role === 'premium' ? 500 : 100;
        }
      }

      const updated = await updateUser(targetUserId, updates);
      if (!updated) {
        return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'User not found' }) };
      }

      const effectiveLimit = updates.daily_token_limit ?? dailyTokenLimit;

      // Update in Supabase if configured
      const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (sbUrl && sbKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(sbUrl, sbKey);
          const sbUpdates: any = {};
          if (typeof updates.daily_token_limit === 'number') sbUpdates.daily_token_limit = updates.daily_token_limit;
          if (typeof updates.is_disabled === 'boolean') sbUpdates.is_disabled = updates.is_disabled;
          if (updates.role) {
            sbUpdates.role = updates.role;
            sbUpdates.plan = updates.role === 'admin' ? 'unlimited' : updates.role === 'premium' ? 'pro' : 'free';
          }
          await sb.from('profiles').update(sbUpdates).eq('id', targetUserId);

          if (typeof effectiveLimit === 'number') {
            const today = getTodayString();
            await sb.from('daily_usage').update({
              tokens_allocated: effectiveLimit,
              tokens_remaining: effectiveLimit,
            }).eq('user_id', targetUserId).eq('date', today);
          }
        } catch (e) {
          console.warn('Supabase admin update error:', e);
        }
      }

      // Also adjust today's usage remaining in local db if limit increased or role changed
      if (typeof effectiveLimit === 'number') {
        const today = getTodayString();
        const usage = await getDailyUsage(targetUserId, today);
        usage.tokens_allocated = effectiveLimit;
        usage.tokens_remaining = Math.max(0, effectiveLimit - usage.tokens_used);
        const { saveDailyUsage } = await import('./lib/db');
        await saveDailyUsage(usage);
      }

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ success: true, user: updated }),
      };
    }

    return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Route not found' }) };
  } catch (err: any) {
    console.error('Admin endpoint error:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
