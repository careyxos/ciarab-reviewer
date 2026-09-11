import { Handler, HandlerEvent } from '@netlify/functions';
import { verifySessionToken, extractTokenFromHeader } from './lib/security';
import { saveStudyMaterial, getUserStudyMaterials } from './lib/db';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // GET /api/materials - Get current user's materials
    if (event.httpMethod === 'GET') {
      const materials = await getUserStudyMaterials(payload.userId);
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ materials: materials.map((m) => m.data) }),
      };
    }

    // POST /api/materials - Save or update a study set
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { studySet } = body;

      if (!studySet || !studySet.id) {
        return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Valid studySet is required' }) };
      }

      const now = new Date().toISOString();
      const saved = await saveStudyMaterial({
        id: studySet.id,
        user_id: payload.userId,
        title: studySet.title || 'Untitled Reviewer',
        category: studySet.category || 'General',
        data: {
          ...studySet,
          userId: payload.userId,
          updatedAt: now,
        },
        created_at: studySet.createdAt || now,
        updated_at: now,
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ success: true, material: saved.data }),
      };
    }

    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    console.error('Materials endpoint error:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Internal server error' }),
    };
  }
};
