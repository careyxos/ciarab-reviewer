import { UserProfile, DailyUsageState, UsageLogItem, CLIENT_AI_COSTS } from '../types/auth';

const TOKEN_KEY = 'chobee_token';
const USER_KEY = 'chobee_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {}
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Client API Helper
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`API endpoint ${endpoint} returned HTML instead of JSON.`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}

// Fallback Local Mock Store for local preview if /api is not backed by netlify functions
export function getLocalMockUser(): { user: UserProfile; usage: DailyUsageState } | null {
  try {
    const raw = localStorage.getItem('chobee_local_mock_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveLocalMockUser(data: { user: UserProfile; usage: DailyUsageState }) {
  try {
    localStorage.setItem('chobee_local_mock_user', JSON.stringify(data));
  } catch (e) {}
}
