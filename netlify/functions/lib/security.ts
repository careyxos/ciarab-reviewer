import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from './types';

const SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'chobee-safe-study-companion-key-2026-mayor-cia';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CHOBEE-${code}`;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export function createSessionToken(user: User): string {
  const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 days
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');

    // Case 1: Standard 3-part JWT (e.g. Supabase Auth access_token)
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const decoded = JSON.parse(payloadJson);
      
      // Check expiration if present
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      const userId = decoded.sub || decoded.userId || decoded.id || '';
      const email = decoded.email || decoded.user_metadata?.email || '';
      const role = decoded.app_metadata?.role || decoded.user_metadata?.role || decoded.role || 'user';
      const exp = decoded.exp || Math.floor(Date.now() / 1000) + 86400;

      if (!userId && !email) return null;

      return {
        userId,
        email,
        role,
        exp,
      };
    }

    // Case 2: Custom 2-part session token (encodedPayload.signature)
    if (parts.length === 2) {
      const [encodedPayload, signature] = parts;
      
      const expectedSignature = crypto
        .createHmac('sha256', SECRET)
        .update(encodedPayload)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;

      return payload;
    }

    return null;
  } catch (err) {
    return null;
  }
}

export function extractTokenFromHeader(headerOrHeaders?: any): string | null {
  if (!headerOrHeaders) return null;
  let header = '';
  if (typeof headerOrHeaders === 'string') {
    header = headerOrHeaders;
  } else if (typeof headerOrHeaders === 'object') {
    header = headerOrHeaders.authorization || headerOrHeaders.Authorization || headerOrHeaders.AUTHORIZATION || '';
  }
  if (!header) return null;
  if (header.startsWith('Bearer ') || header.startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return header.trim();
}
