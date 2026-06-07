const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

const getSupabaseConfig = () => {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '');
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

const sendJson = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload);
};

const isAuthorizedAdminRequest = async (request: any) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return true;
  }

  const authHeader = String(request.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return false;
  }

  const sessionResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return sessionResponse.ok;
};

const getSavedPrintifyApiKey = async () => {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return '';
  }

  const credentialsResponse = await fetch(`${supabaseUrl}/rest/v1/printify_credentials?id=eq.default&select=api_key`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!credentialsResponse.ok) {
    return '';
  }

  const rows = await credentialsResponse.json().catch(() => []);
  return String(rows?.[0]?.api_key || '').trim();
};

const buildPrintifyPath = (body: any) => {
  const mode = String(body?.mode || '');
  const shopId = String(body?.shopId || '').trim();
  const blueprintId = String(body?.blueprintId || '').trim();
  const printProviderId = String(body?.printProviderId || '').trim();

  if (mode === 'shops') {
    return '/shops.json';
  }

  if (mode === 'shop-products' && /^\d+$/.test(shopId)) {
    return `/shops/${shopId}/products.json`;
  }

  if (mode === 'blueprints') {
    return '/catalog/blueprints.json';
  }

  if (mode === 'blueprint' && /^\d+$/.test(blueprintId)) {
    return `/catalog/blueprints/${blueprintId}.json`;
  }

  if (mode === 'providers' && /^\d+$/.test(blueprintId)) {
    return `/catalog/blueprints/${blueprintId}/print_providers.json`;
  }

  if (mode === 'variants' && /^\d+$/.test(blueprintId) && /^\d+$/.test(printProviderId)) {
    return `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json?show-out-of-stock=1`;
  }

  if (mode === 'shipping' && /^\d+$/.test(blueprintId) && /^\d+$/.test(printProviderId)) {
    return `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`;
  }

  return null;
};

const normalizeApiKey = (value: unknown) => {
  const token = String(value || '').trim();
  return token.replace(/^Bearer\s+/i, '').trim();
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const bodyApiKey = normalizeApiKey(request.body?.apiKey);
  const isTokenValidationRequest = request.body?.mode === 'shops' && Boolean(bodyApiKey);
  const isAuthorized = isTokenValidationRequest || await isAuthorizedAdminRequest(request);
  if (!isAuthorized) {
    sendJson(response, 401, { error: 'Admin authentication is required before connecting to Printify.' });
    return;
  }

  const savedApiKey = isTokenValidationRequest ? '' : await getSavedPrintifyApiKey();
  const apiKey = bodyApiKey || savedApiKey;
  if (!apiKey) {
    sendJson(response, 400, { error: 'Printify API Access Token is required.' });
    return;
  }

  const path = buildPrintifyPath(request.body);
  if (!path) {
    sendJson(response, 400, { error: 'Unsupported or invalid Printify catalog request.' });
    return;
  }

  try {
    const printifyResponse = await fetch(`${PRINTIFY_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
    });

    const text = await printifyResponse.text();
    const payload = text ? JSON.parse(text) : null;

    sendJson(response, printifyResponse.status, payload);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify request failed.',
      details: error?.message || String(error),
    });
  }
}
