import { Handler, HandlerEvent } from '@netlify/functions';
import { verifySessionToken, extractTokenFromHeader } from './lib/security';
import { reserveTokens, refundTokens } from './lib/tokenManager';
import { recordAIUsageLog, getUserById } from './lib/db';
import { callServerGemini, ServerGenerationOptions } from './lib/gemini';
import { AI_COSTS } from './lib/types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const token = extractTokenFromHeader(event.headers);
    if (!token) {
      return {
        statusCode: 401,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Authentication required. Please log in to generate study materials.' }),
      };
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return {
        statusCode: 401,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Session expired or invalid. Please log in again.' }),
      };
    }

    const user = await getUserById(payload.userId);
    if (!user || user.is_disabled) {
      return {
        statusCode: 403,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Account not found or has been disabled.' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { content, options, actionType = 'flashcards' } = body;

    if (!content || !content.trim()) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Content is required to generate study material.' }),
      };
    }

    const validAction: keyof typeof AI_COSTS = (actionType in AI_COSTS) ? actionType : 'flashcards';

    // 1. Check balance and reserve tokens atomically
    const tokenReservation = await reserveTokens(user.id, validAction);
    if (!tokenReservation.success) {
      return {
        statusCode: 402, // Payment Required / Limit Exceeded
        headers: JSON_HEADERS,
        body: JSON.stringify({
          error: tokenReservation.error,
          code: 'OUT_OF_TOKENS',
          remaining: tokenReservation.remaining,
          cost: tokenReservation.cost,
        }),
      };
    }

    // 2. Perform AI request
    const genOptions: ServerGenerationOptions = {
      title: options?.title || 'Lecture Reviewer',
      category: options?.category || 'General',
      themeColor: options?.themeColor || 'pink',
      cardCount: options?.cardCount || 10,
      questionTypes: options?.questionTypes || ['multiple_choice', 'true_false'],
      difficulty: options?.difficulty || 'Mixed',
      language: options?.language || 'Taglish',
    };

    try {
      const generated = await callServerGemini(content, genOptions);

      // Record successful AI usage log
      await recordAIUsageLog({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: user.id,
        action_type: validAction,
        tokens_used: tokenReservation.cost,
        timestamp: new Date().toISOString(),
        success: true,
        user_email: user.email,
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: true,
          data: generated,
          tokens: {
            cost: tokenReservation.cost,
            remaining: tokenReservation.remaining,
            allocated: tokenReservation.allocated,
            used: tokenReservation.used,
          },
        }),
      };
    } catch (aiErr: any) {
      console.error('AI generation failed, executing token refund:', aiErr);
      
      // Auto-refund tokens on failure
      await refundTokens(user.id, validAction, tokenReservation.cost);

      await recordAIUsageLog({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: user.id,
        action_type: validAction,
        tokens_used: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error_message: aiErr?.message || 'AI generation error',
        user_email: user.email,
      });

      return {
        statusCode: 502,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          error: 'AI service was temporarily unable to process your request. Your tokens have been fully refunded.',
          details: aiErr?.message,
        }),
      };
    }
  } catch (err: any) {
    console.error('ai-generate error:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
