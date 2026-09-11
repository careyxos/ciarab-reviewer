import { Handler, HandlerEvent } from '@netlify/functions';
import { handler as authHandler } from './auth';
import { handler as adminHandler } from './admin';
import { handler as usageHandler } from './usage';
import { handler as materialsHandler } from './materials';
import { handler as aiGenerateHandler } from './ai-generate';

export const handler: Handler = async (event: HandlerEvent, context: any) => {
  const path = event.path || '';

  let res;
  if (path.includes('/api/auth') || path.includes('/auth')) {
    res = await authHandler(event, context);
  } else if (path.includes('/api/admin') || path.includes('/admin')) {
    res = await adminHandler(event, context);
  } else if (path.includes('/api/usage') || path.includes('/usage')) {
    res = await usageHandler(event, context);
  } else if (path.includes('/api/materials') || path.includes('/materials')) {
    res = await materialsHandler(event, context);
  } else if (path.includes('/api/ai-generate') || path.includes('/ai-generate')) {
    res = await aiGenerateHandler(event, context);
  }

  if (res) return res;

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: `API route not found: ${path}` }),
  };
};
