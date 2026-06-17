export const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

export const getSupabaseConfig = () => {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '');
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

export const sendJson = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload);
};

export const normalizeApiKey = (value: unknown) => {
  const token = String(value || '').trim();
  return token.replace(/^Bearer\s+/i, '').trim();
};

export const isAuthorizedAdminRequest = async (request: any) => {
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

export const getSavedPrintifyApiKey = async () => {
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

export const readPrintifyResponse = async (printifyResponse: any) => {
  const text = await printifyResponse.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
      details: `Printify returned a non-JSON response with status ${printifyResponse.status}.`,
    };
  }
};

export const callPrintify = async (apiKey: string, path: string) => {
  const printifyResponse = await fetch(`${PRINTIFY_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json;charset=utf-8',
      'User-Agent': 'devsfolk-app/1.0',
    },
  });

  return {
    status: printifyResponse.status,
    payload: await readPrintifyResponse(printifyResponse),
  };
};

export const getApiKeyForAdminRoute = async (request: any) => {
  const bodyApiKey = normalizeApiKey(request.body?.apiKey);
  return bodyApiKey || await getSavedPrintifyApiKey();
};

export const requirePost = (request: any, response: any) => {
  if (request.method === 'POST') {
    return true;
  }

  response.setHeader('Allow', 'POST');
  sendJson(response, 405, { error: 'Method not allowed' });
  return false;
};

export const requireAdmin = async (request: any, response: any, options?: { allowTokenValidation?: boolean }) => {
  if (options?.allowTokenValidation && normalizeApiKey(request.body?.apiKey)) {
    return true;
  }

  const isAuthorized = await isAuthorizedAdminRequest(request);
  if (!isAuthorized) {
    sendJson(response, 401, { error: 'Admin authentication is required before connecting to Printify.' });
    return false;
  }

  return true;
};

export const requireApiKey = async (request: any, response: any) => {
  const apiKey = await getApiKeyForAdminRoute(request);
  if (!apiKey) {
    sendJson(response, 400, { error: 'Printify API Access Token is required.' });
    return '';
  }

  return apiKey;
};

export const sendPrintifyResult = (response: any, status: number, payload: unknown, fallbackError: string, requiredScopes: string[]) => {
  if (status >= 400) {
    sendJson(response, status, {
      error: (payload as any)?.error || (payload as any)?.message || fallbackError,
      details: (payload as any)?.details || (payload as any)?.errors || payload,
      requiredScopes,
    });
    return;
  }

  sendJson(response, status, payload);
};
