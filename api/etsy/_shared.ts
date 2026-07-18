import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { decrypt, encrypt, type EncryptedPayload } from '../../src/lib/serverCrypto.js';

export const ETSY_API_BASE = 'https://api.etsy.com/v3/application';
export const ETSY_OAUTH_CONNECT_URL = 'https://www.etsy.com/oauth/connect';
export const ETSY_OAUTH_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

export interface EtsyCredentialsRow {
  keystring: string;
  shared_secret: string;
}

export interface EtsyEncryptedTokenMeta {
  access: {
    iv: string;
    authTag: string;
  };
  refresh: {
    iv: string;
    authTag: string;
  };
}

export const getSupabaseConfig = () => {
  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '');
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

export const getSupabaseServiceClient = () => {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export const sendJson = (response: any, status: number, payload: unknown) => {
  response.status(status).json(payload);
};

export const requirePost = (request: any, response: any) => {
  if (request.method === 'POST') {
    return true;
  }

  response.setHeader('Allow', 'POST');
  sendJson(response, 405, { error: 'Method not allowed' });
  return false;
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

export const requireAdmin = async (request: any, response: any, options?: { allowTokenValidation?: boolean }) => {
  if (options?.allowTokenValidation && String(request.body?.apiKey || '').trim()) {
    return true;
  }

  const isAuthorized = await isAuthorizedAdminRequest(request);
  if (!isAuthorized) {
    sendJson(response, 401, { error: 'Admin authentication is required to connect Etsy.' });
    return false;
  }

  return true;
};

export const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce<Record<string, string>>((accumulator, item) => {
    const index = item.indexOf('=');
    if (index === -1) {
      return accumulator;
    }

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
};

export const buildCookie = (name: string, value: string, options?: { maxAge?: number; httpOnly?: boolean }) => {
  const { maxAge = 600, httpOnly = true } = options || {};
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${name}=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
    ...(httpOnly ? ['HttpOnly'] : []),
    ...(secure ? ['Secure'] : []),
  ];

  return parts.join('; ');
};

export const clearCookie = (name: string) => buildCookie(name, '', { maxAge: 0 });

export const base64UrlEncode = (buffer: Buffer) => buffer
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

export const createPkcePair = () => {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  const state = base64UrlEncode(randomBytes(24));

  return { verifier, challenge, state };
};

export const buildEtsyAuthorizeUrl = (params: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
}) => {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scopes.join(' '),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${ETSY_OAUTH_CONNECT_URL}?${query.toString()}`;
};

export const getSavedEtsyCredentials = async (): Promise<EtsyCredentialsRow | null> => {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('etsy_credentials')
    .select('keystring, shared_secret')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    keystring: String(data.keystring || '').trim(),
    shared_secret: String(data.shared_secret || '').trim(),
  };
};

export const getEtsyApiKeyHeader = async () => {
  const credentials = await getSavedEtsyCredentials();
  if (!credentials?.keystring || !credentials.shared_secret) {
    return '';
  }

  return `${credentials.keystring}:${credentials.shared_secret}`;
};

export const buildAuthorizationHeader = (accessToken: string) => `Bearer ${accessToken}`;

export const normalizeEtsyList = (payload: any) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && (
    Object.prototype.hasOwnProperty.call(payload, 'shop_id') ||
    Object.prototype.hasOwnProperty.call(payload, 'listing_id')
  )) {
    return [payload];
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

export const readEtsyResponse = async (etsyResponse: Response) => {
  const text = await etsyResponse.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
      details: `Etsy returned a non-JSON response with status ${etsyResponse.status}.`,
    };
  }
};

export const callEtsy = async (path: string, options: {
  apiKeyHeader: string;
  accessToken?: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}) => {
  const response = await fetch(`${ETSY_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'x-api-key': options.apiKeyHeader,
      ...(options.accessToken ? { Authorization: buildAuthorizationHeader(options.accessToken) } : {}),
      ...(options.body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return {
    status: response.status,
    payload: await readEtsyResponse(response),
  };
};

export const parseEtsyUserIdFromAccessToken = (accessToken: string) => {
  const [userId] = String(accessToken || '').split('.');
  return /^\d+$/.test(userId) ? userId : '';
};

export const parseTokenMeta = (value: string | null | undefined): EtsyEncryptedTokenMeta | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      parsed.access &&
      parsed.refresh &&
      typeof parsed.access.iv === 'string' &&
      typeof parsed.access.authTag === 'string' &&
      typeof parsed.refresh.iv === 'string' &&
      typeof parsed.refresh.authTag === 'string'
    ) {
      return parsed as EtsyEncryptedTokenMeta;
    }
  } catch {
    return null;
  }

  return null;
};

export const decryptToken = (ciphertext: string, meta: { iv: string; authTag: string }, base64Key: string) => {
  return decrypt({
    ciphertext,
    iv: meta.iv,
    authTag: meta.authTag,
  }, base64Key);
};

export const encryptToken = (plainText: string, base64Key: string): EncryptedPayload => encrypt(plainText, base64Key);

export const getTokenEncryptionKey = () => String(process.env.ETSY_TOKEN_ENCRYPTION_KEY || '').trim();

export const getEtsyTokenRow = async (shopId: string) => {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('etsy_shop_tokens')
    .select('*')
    .eq('shop_id', shopId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as any;
};

export const persistEtsyTokenRow = async (params: {
  shopId: string;
  accessToken: string;
  refreshToken: string;
  grantedScopes: string;
  expiresAt: Date;
}) => {
  const supabase = getSupabaseServiceClient();
  const encryptionKey = getTokenEncryptionKey();
  if (!supabase || !encryptionKey) {
    throw new Error('ETSY_TOKEN_ENCRYPTION_KEY is required to store Etsy tokens.');
  }

  const accessPayload = encryptToken(params.accessToken, encryptionKey);
  const refreshPayload = encryptToken(params.refreshToken, encryptionKey);
  const tokenMeta = JSON.stringify({
    access: { iv: accessPayload.iv, authTag: accessPayload.authTag },
    refresh: { iv: refreshPayload.iv, authTag: refreshPayload.authTag },
  });

  const existing = await getEtsyTokenRow(params.shopId);
  const payload = {
    shop_id: params.shopId,
    access_token: accessPayload.ciphertext,
    refresh_token: refreshPayload.ciphertext,
    token_iv: tokenMeta,
    granted_scopes: params.grantedScopes,
    expires_at: params.expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from('etsy_shop_tokens').update(payload).eq('id', existing.id);
    if (error) {
      throw new Error(`Failed to update Etsy token row: ${error.message}`);
    }
    return existing.id as string;
  }

  const { data, error } = await supabase.from('etsy_shop_tokens').insert(payload).select('id').maybeSingle();
  if (error) {
    throw new Error(`Failed to store Etsy tokens: ${error.message}`);
  }

  return String(data?.id || '');
};

export const getDecryptedEtsyAccessToken = async (shopId: string) => {
  const tokenRow = await getEtsyTokenRow(shopId);
  const encryptionKey = getTokenEncryptionKey();
  if (!tokenRow || !encryptionKey) {
    return null;
  }

  const meta = parseTokenMeta(tokenRow.token_iv);
  if (!meta) {
    return null;
  }

  const accessToken = decryptToken(tokenRow.access_token, meta.access, encryptionKey);
  const refreshToken = decryptToken(tokenRow.refresh_token, meta.refresh, encryptionKey);
  return {
    tokenRow,
    accessToken,
    refreshToken,
    expiresAt: new Date(tokenRow.expires_at),
  };
};

export const refreshEtsyAccessToken = async (shopId: string) => {
  const credentials = await getSavedEtsyCredentials();
  const encryptionKey = getTokenEncryptionKey();
  const current = await getDecryptedEtsyAccessToken(shopId);

  if (!credentials || !encryptionKey || !current) {
    throw new Error('Unable to refresh Etsy token: missing credentials or stored token.');
  }

  const response = await fetch(ETSY_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.keystring,
      refresh_token: current.refreshToken,
    }),
  });

  const payload = await readEtsyResponse(response);
  if (!response.ok) {
    throw new Error((payload as any)?.error || (payload as any)?.message || 'Etsy token refresh failed.');
  }

  const accessToken = String((payload as any)?.access_token || '').trim();
  const refreshToken = String((payload as any)?.refresh_token || current.refreshToken).trim();
  const expiresIn = Number((payload as any)?.expires_in || 3600);

  if (!accessToken) {
    throw new Error('Etsy token refresh returned an empty access token.');
  }

  await persistEtsyTokenRow({
    shopId,
    accessToken,
    refreshToken: refreshToken || current.refreshToken,
    grantedScopes: String((payload as any)?.scope || current.tokenRow.granted_scopes || ''),
    expiresAt: new Date(Date.now() + Math.max(60, expiresIn) * 1000),
  });

  return accessToken;
};

export const getValidEtsyAccessToken = async (shopId: string) => {
  const current = await getDecryptedEtsyAccessToken(shopId);
  if (!current) {
    return null;
  }

  const expiresAt = current.expiresAt.getTime();
  const safetyWindow = 5 * 60 * 1000;
  if (expiresAt - Date.now() > safetyWindow) {
    return current.accessToken;
  }

  return refreshEtsyAccessToken(shopId);
};

export const upsertEtsyShop = async (shop: {
  shopId: string;
  shopName?: string;
  tokenId?: string | null;
  status?: string;
  isEnabled?: boolean;
  lastSyncedAt?: string | null;
}) => {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error('Supabase service role key is required to store Etsy shop rows.');
  }

  const payload = {
    shop_id: shop.shopId,
    shop_name: shop.shopName ?? null,
    status: shop.status ?? 'connected',
    is_enabled: shop.isEnabled ?? true,
    last_synced_at: shop.lastSyncedAt ?? null,
    ...(shop.tokenId !== undefined ? { shop_token_id: shop.tokenId } : {}),
  };

  const { data: existing, error: existingError } = await supabase
    .from('etsy_shops')
    .select('id')
    .eq('shop_id', shop.shopId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check Etsy shop rows: ${existingError.message}`);
  }

  if (existing?.id) {
    const { error } = await supabase.from('etsy_shops').update(payload).eq('id', existing.id);
    if (error) {
      throw new Error(`Failed to update Etsy shop row: ${error.message}`);
    }
    return String(existing.id);
  }

  const { data, error } = await supabase.from('etsy_shops').insert({
    ...payload,
    connected_at: new Date().toISOString(),
  }).select('id').maybeSingle();
  if (error) {
    throw new Error(`Failed to create Etsy shop row: ${error.message}`);
  }

  return String(data?.id || '');
};
