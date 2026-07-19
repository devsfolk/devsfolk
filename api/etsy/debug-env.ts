import { getSupabaseConfig, requireAdmin, sendJson } from './_shared.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (!await requireAdmin(request, response)) {
    return;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();

  sendJson(response, 200, {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
    hasEtsyEncryptionKey: Boolean(String(process.env.ETSY_TOKEN_ENCRYPTION_KEY || '').trim()),
    supabaseUrlLength: supabaseUrl.length,
    serviceRoleKeyLength: supabaseServiceRoleKey.length,
    nodeEnv: String(process.env.NODE_ENV || ''),
    vercelEnv: String(process.env.VERCEL_ENV || ''),
  });
}
