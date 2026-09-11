import { AI_COSTS } from './types';
import { getDailyUsage, saveDailyUsage, getUserById, recordAIUsageLog } from './db';

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getResetCountdown(): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  totalSeconds: number;
} {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffMs = tomorrow.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}h ${pad(minutes)}m`;

  return { hours, minutes, seconds, formatted, totalSeconds };
}

export async function reserveTokens(
  userId: string,
  actionType: keyof typeof AI_COSTS
): Promise<{
  success: boolean;
  cost: number;
  remaining: number;
  allocated: number;
  used: number;
  error?: string;
}> {
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, cost: 0, remaining: 0, allocated: 0, used: 0, error: 'User not found' };
  }

  if (user.is_disabled) {
    return {
      success: false,
      cost: 0,
      remaining: 0,
      allocated: 0,
      used: 0,
      error: 'Your account has been temporarily disabled. Please contact the administrator.',
    };
  }

  const cost = AI_COSTS[actionType] || 10;
  const today = getTodayString();
  const usage = await getDailyUsage(userId, today);

  // Admin users have unlimited tokens
  if (user.role === 'admin') {
    usage.tokens_used += cost;
    await saveDailyUsage(usage);
    return {
      success: true,
      cost,
      remaining: 999999,
      allocated: 999999,
      used: usage.tokens_used,
    };
  }

  if (usage.tokens_remaining < cost) {
    return {
      success: false,
      cost,
      remaining: usage.tokens_remaining,
      allocated: usage.tokens_allocated,
      used: usage.tokens_used,
      error: "You're out of AI tokens for today 💤 Your daily study credits will reset tomorrow.",
    };
  }

  // Atomic deduction
  usage.tokens_used += cost;
  usage.tokens_remaining -= cost;
  await saveDailyUsage(usage);

  return {
    success: true,
    cost,
    remaining: usage.tokens_remaining,
    allocated: usage.tokens_allocated,
    used: usage.tokens_used,
  };
}

export async function refundTokens(
  userId: string,
  actionType: keyof typeof AI_COSTS,
  amount?: number
): Promise<void> {
  try {
    const cost = amount ?? (AI_COSTS[actionType] || 10);
    const today = getTodayString();
    const usage = await getDailyUsage(userId, today);

    usage.tokens_used = Math.max(0, usage.tokens_used - cost);
    usage.tokens_remaining = Math.min(usage.tokens_allocated, usage.tokens_remaining + cost);
    await saveDailyUsage(usage);

    await recordAIUsageLog({
      id: `refund-${Date.now()}`,
      user_id: userId,
      action_type: actionType,
      tokens_used: -cost,
      timestamp: new Date().toISOString(),
      success: true,
      error_message: 'Refunded due to AI processing failure',
    });
  } catch (err) {
    console.error('Failed to refund tokens:', err);
  }
}
