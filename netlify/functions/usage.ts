import { Handler, HandlerEvent } from '@netlify/functions';
import { verifySessionToken, extractTokenFromHeader } from './lib/security';
import { getDailyUsage, getAIUsageLogs, getUserById } from './lib/db';
import { getResetCountdown, getTodayString } from './lib/tokenManager';
import { AI_COSTS } from './lib/types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    if (!payload) {
      return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Session expired' }) };
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'User not found' }) };
    }

    const today = getTodayString();
    const usage = await getDailyUsage(user.id, today);

    // Hard enforcement: Free users are always capped at 100 tokens
    if (user.role === 'free' && usage.tokens_allocated > 100) {
      usage.tokens_allocated = 100;
      usage.tokens_remaining = Math.min(100, Math.max(0, 100 - usage.tokens_used));
      const { saveDailyUsage } = await import('./lib/db');
      await saveDailyUsage(usage);
    }
    const logs = await getAIUsageLogs(user.id, 25);
    const countdown = getResetCountdown();

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        today: {
          date: today,
          allocated: usage.tokens_allocated,
          used: usage.tokens_used,
          remaining: usage.tokens_remaining,
          countdown: {
            formatted: countdown.formatted,
            hours: countdown.hours,
            minutes: countdown.minutes,
            seconds: countdown.seconds,
            totalSeconds: countdown.totalSeconds,
          },
        },
        costs: AI_COSTS,
        history: logs.map((log) => ({
          id: log.id,
          actionType: log.action_type,
          tokensUsed: log.tokens_used,
          timestamp: log.timestamp,
          success: log.success,
          errorMessage: log.error_message,
        })),
      }),
    };
  } catch (err: any) {
    console.error('Usage endpoint error:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
