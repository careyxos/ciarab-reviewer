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
    const [encodedPayload, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(encodedPayload)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

export function extractTokenFromHeader(header?: string): string | null {
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return header.trim();
}
