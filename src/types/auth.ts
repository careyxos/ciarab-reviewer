export type UserRole = 'free' | 'premium' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  referralCode: string;
  referredBy?: string;
  dailyTokenLimit: number;
  avatarUrl?: string;
  lastSeenAt?: string;
  updatedAt?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface DailyUsageState {
  allocated: number;
  used: number;
  remaining: number;
  resetCountdown: string;
}

export interface UsageLogItem {
  id: string;
  actionType: string;
  tokensUsed: number;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

export const CLIENT_AI_COSTS = {
  flashcards: 10,
  quiz: 15,
  summary: 10,
  studyGuide: 20,
  chat: 2,
  regenerate: 5,
} as const;
