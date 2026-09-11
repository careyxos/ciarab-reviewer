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

// --- USER OPERATIONS ---

function sanitizeUser(user: User): User {
  if (user.role === 'free' && user.daily_token_limit > 100) {
    user.daily_token_limit = 100;
  }
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();
  const normalized = email.toLowerCase().trim();
  const user = Object.values(memoryDb.users).find((u) => u.email.toLowerCase() === normalized);
  return user ? sanitizeUser({ ...user }) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  loadDatabase();
  await syncWithBlobStore();
  const user = memoryDb.users[id];
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
  const user = memoryDb.users[id];
  if (!user) return null;
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
  const isFree = !user || user.role === 'free';
  const roleLimit = isFree ? 100 : (user.role === 'admin' ? 999999 : (user.daily_token_limit || 500));

  const key = `${userId}_${date}`;
  const existing = memoryDb.dailyUsage[key];
  if (existing) {
    if (isFree && (existing.tokens_allocated > 100 || existing.tokens_remaining > 100)) {
      existing.tokens_allocated = 100;
      existing.tokens_remaining = Math.min(100, Math.max(0, 100 - (existing.tokens_used || 0)));
      await persistToBlobStore();
    }
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
