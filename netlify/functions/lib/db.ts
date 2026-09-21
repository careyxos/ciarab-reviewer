import fs from 'fs';
import path from 'path';
import { User, DailyUsage, AIUsageLog, StudyMaterialRecord, DEFAULT_ROLE_LIMITS } from './types';

interface DatabaseSchema {
  users: Record<string, User>; // key: user.id
  dailyUsage: Record<string, DailyUsage>; // key: `${userId}_${date}`
  usageLogs: AIUsageLog[];
  materials: Record<string, StudyMaterialRecord>; // key: material.id
}

const IS_SERVERLESS = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE_PATH = IS_SERVERLESS 
  ? path.join('/tmp', 'chobee-db.json')
  : path.join(process.cwd(), '.chobee-data', 'db.json');

// Memory cache for serverless execution lifecycle
let memoryDb: DatabaseSchema = {
  users: {},
  dailyUsage: {},
  usageLogs: [],
  materials: {},
};

function ensureDbDirectory() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Ignore directory creation error in read-only environments
    }
  }
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf8');
      if (content.trim()) {
        const parsed = JSON.parse(content);
        memoryDb = {
          users: parsed.users || {},
          dailyUsage: parsed.dailyUsage || {},
          usageLogs: parsed.usageLogs || [],
          materials: parsed.materials || {},
        };
        return memoryDb;
      }
    }
  } catch (err) {
    console.warn('Failed to load DB file, using in-memory state:', err);
  }
  return memoryDb;
}

function saveDatabase() {
  try {
    ensureDbDirectory();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    // In serverless contexts where filesystem might be transient, in-memory state persists across warm invocations
  }
}

import { getStore } from '@netlify/blobs';

let blobStoreInstance: any = null;
let blobStoreChecked = false;

function getBlobStore() {
  if (blobStoreChecked) return blobStoreInstance;
  blobStoreChecked = true;
  try {
    blobStoreInstance = getStore('chobee-cloud-data');
  } catch (e) {
    blobStoreInstance = null;
  }
  return blobStoreInstance;
}

export async function syncWithBlobStore() {
  const store = getBlobStore();
  if (!store) return;
  try {
    const cloudDb = await store.get('database_json', { type: 'json' });
    if (cloudDb && typeof cloudDb === 'object') {
      memoryDb.users = { ...memoryDb.users, ...(cloudDb.users || {}) };
      memoryDb.dailyUsage = { ...memoryDb.dailyUsage, ...(cloudDb.dailyUsage || {}) };
      if (Array.isArray(cloudDb.usageLogs)) {
        memoryDb.usageLogs = [...cloudDb.usageLogs, ...memoryDb.usageLogs].slice(0, 500);
      }
      memoryDb.materials = { ...memoryDb.materials, ...(cloudDb.materials || {}) };
    }
  } catch (err) {
    // Silent fallback
  }
}

export async function persistToBlobStore() {
  saveDatabase();
  const store = getBlobStore();
  if (!store) return;
  try {
    await store.setJSON('database_json', memoryDb);
  } catch (err) {
    // Silent fallback
  }
}

// Initialize on first load
loadDatabase();

async function getSupabaseAdmin() {
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(sbUrl, sbKey);
  } catch {
    return null;
  }
}

// --- USER OPERATIONS ---

function sanitizeUser(user: User): User {
  if (!user.daily_token_limit || user.daily_token_limit <= 0) {
    user.daily_token_limit = user.role === 'admin' ? 999999 : user.role === 'premium' ? 500 : 100;
  }
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();
  const normalized = email.toLowerCase().trim();
  let user = Object.values(memoryDb.users).find((u) => u.email.toLowerCase() === normalized);

  if (!user) {
    const sb = await getSupabaseAdmin();
    if (sb) {
      try {
        const { data: p } = await sb.from('profiles').select('*').ilike('email', normalized).maybeSingle();
        if (p) {
          user = {
            id: p.id,
            email: p.email,
            password_hash: '',
            display_name: p.display_name || p.email.split('@')[0],
            role: p.role,
            daily_token_limit: p.daily_token_limit ?? (p.role === 'admin' ? 999999 : 100),
            referral_code: p.referral_code || 'CHOBEE-USER',
            referred_by: p.referred_by,
            created_at: p.created_at,
            last_login: p.last_login_at || p.created_at,
            is_disabled: Boolean(p.is_disabled),
          };
          memoryDb.users[p.id] = user;
        }
      } catch (e) {}
    }
  }

  return user ? sanitizeUser({ ...user }) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();
  let user = memoryDb.users[id];

  if (!user) {
    const sb = await getSupabaseAdmin();
    if (sb) {
      try {
        const { data: p } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
        if (p) {
          user = {
            id: p.id,
            email: p.email,
            password_hash: '',
            display_name: p.display_name || p.email.split('@')[0],
            role: p.role,
            daily_token_limit: p.daily_token_limit ?? (p.role === 'admin' ? 999999 : 100),
            referral_code: p.referral_code || 'CHOBEE-USER',
            referred_by: p.referred_by,
            created_at: p.created_at,
            last_login: p.last_login_at || p.created_at,
            is_disabled: Boolean(p.is_disabled),
          };
          memoryDb.users[id] = user;
        }
      } catch (e) {}
    }
  }

  return user ? sanitizeUser({ ...user }) : null;
}

export async function getUserByReferralCode(code: string): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();
  const normalized = code.toUpperCase().trim();
  const user = Object.values(memoryDb.users).find((u) => u.referral_code.toUpperCase() === normalized);
  return user ? sanitizeUser({ ...user }) : null;
}

export async function createUser(user: User): Promise<User> {
  loadDatabase();
  await syncWithBlobStore();
  const sanitized = sanitizeUser({ ...user });
  memoryDb.users[user.id] = sanitized;
  await persistToBlobStore();
  return { ...sanitized };
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();

  const sb = await getSupabaseAdmin();
  if (sb) {
    try {
      const sbUpdates: any = {};
      if (updates.display_name !== undefined) sbUpdates.display_name = updates.display_name;
      if (updates.role !== undefined) {
        sbUpdates.role = updates.role;
        sbUpdates.plan = updates.role === 'admin' ? 'unlimited' : updates.role === 'premium' ? 'pro' : 'free';
      }
      if (updates.daily_token_limit !== undefined) sbUpdates.daily_token_limit = updates.daily_token_limit;
      if (updates.is_disabled !== undefined) sbUpdates.is_disabled = updates.is_disabled;
      if (updates.last_login !== undefined) sbUpdates.last_login_at = updates.last_login;
      await sb.from('profiles').update(sbUpdates).eq('id', id);
    } catch (e) {}
  }

  let user = memoryDb.users[id];
  if (!user) {
    user = await getUserById(id);
    if (!user) return null;
  }

  const updated = sanitizeUser({ ...user, ...updates });
  memoryDb.users[id] = updated;
  await persistToBlobStore();
  return { ...updated };
}

export async function listAllUsers(): Promise<User[]> {
  loadDatabase();
  await syncWithBlobStore();
  return Object.values(memoryDb.users).map((u) => sanitizeUser({ ...u }));
}

// --- DAILY USAGE & TOKEN OPERATIONS ---

export async function getDailyUsage(userId: string, date: string): Promise<DailyUsage> {
  loadDatabase();
  await syncWithBlobStore();
  const user = await getUserById(userId);
  const roleLimit = user?.daily_token_limit ?? (user?.role === 'admin' ? 999999 : user?.role === 'premium' ? 500 : 100);

  const key = `${userId}_${date}`;
  const existing = memoryDb.dailyUsage[key];
  if (existing) {
    return { ...existing };
  }

  // If not found, initialize new day entry based on user's daily limit
  const newUsage: DailyUsage = {
    id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    date,
    tokens_allocated: roleLimit,
    tokens_used: 0,
    tokens_remaining: roleLimit,
    last_reset_time: new Date().toISOString(),
  };

  memoryDb.dailyUsage[key] = newUsage;
  saveDatabase();
  await persistToBlobStore();
  return { ...newUsage };
}

export async function saveDailyUsage(usage: DailyUsage): Promise<DailyUsage> {
  loadDatabase();
  const key = `${usage.user_id}_${usage.date}`;
  memoryDb.dailyUsage[key] = { ...usage };
  saveDatabase();
  await persistToBlobStore();
  return { ...usage };
}

// --- AI USAGE LOGS ---

export async function recordAIUsageLog(log: AIUsageLog): Promise<AIUsageLog> {
  loadDatabase();
  memoryDb.usageLogs.unshift({ ...log });
  if (memoryDb.usageLogs.length > 500) {
    memoryDb.usageLogs = memoryDb.usageLogs.slice(0, 500);
  }
  saveDatabase();
  return log;
}

export async function getAIUsageLogs(userId: string, limit = 20): Promise<AIUsageLog[]> {
  loadDatabase();
  return memoryDb.usageLogs
    .filter((l) => l.user_id === userId)
    .slice(0, limit);
}

export async function getAllAIUsageLogs(limit = 50): Promise<AIUsageLog[]> {
  loadDatabase();
  return memoryDb.usageLogs.slice(0, limit);
}

// --- STUDY MATERIALS ---

export async function saveStudyMaterial(material: StudyMaterialRecord): Promise<StudyMaterialRecord> {
  loadDatabase();
  memoryDb.materials[material.id] = { ...material };
  saveDatabase();
  return { ...material };
}

export async function getUserStudyMaterials(userId: string): Promise<StudyMaterialRecord[]> {
  loadDatabase();
  return Object.values(memoryDb.materials)
    .filter((m) => m.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}
