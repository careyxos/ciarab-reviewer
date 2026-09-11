export type UserRole = 'free' | 'premium' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  daily_token_limit: number;
  referral_code: string;
  referred_by?: string;
  created_at: string;
  last_login: string;
  is_disabled: boolean;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  tokens_allocated: number;
  tokens_used: number;
  tokens_remaining: number;
  last_reset_time: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  action_type: keyof typeof AI_COSTS;
  tokens_used: number;
  timestamp: string;
  success: boolean;
  error_message?: string;
  user_email?: string;
}

export interface StudyMaterialRecord {
  id: string;
  user_id: string;
  title: string;
  category: 'Tourism' | 'Accounting' | 'Events' | 'General';
  data: any;
  created_at: string;
  updated_at: string;
}

export const AI_COSTS = {
  flashcards: 10,
  quiz: 15,
  summary: 10,
  studyGuide: 20,
  chat: 2,
  regenerate: 5,
} as const;

export const DEFAULT_ROLE_LIMITS: Record<UserRole, number> = {
  free: 100,
  premium: 500,
  admin: 999999,
};
