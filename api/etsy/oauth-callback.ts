import {
  clearCookie,
  callEtsy,
  getEtsyApiKeyHeader,
  normalizeEtsyList,
  parseCookies,
  parseEtsyUserIdFromAccessToken,
  readSavedEtsyCredentials,
  persistEtsyTokenRow,
  sendJson,
  upsertEtsyShop,
} from './_shared.js';

const REQUIRED_SCOPES = ['listings_r', 'shops_r'];
const DASHBOARD_REDIRECT = '/dashboard/etsy?etsyOAuth=success';

const redirect = (response: any, target: string, cookie?: string) => {
  if (cookie) {
    response.setHeader('Set-Cookie', cookie);
  }
  response.status(302);
  response.setHeader('Location', target);
  response.end();
};

const buildErrorRedirect = (message: string) => `${DASHBOARD_REDIRECT}&error=${encodeURIComponent(message)}`;

const parseFlow = (cookieHeader = '') => {
  const cookies = parseCookies(cookieHeader);
  const raw = cookies.etsy_oauth_flow;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      state: string;
      verifier: string;
      redirectUri: string;
      createdAt: string;
    };
  } catch {
    return null;
  }
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const { code, state, error, error_description: errorDescription } = request.query || {};
  const clearFlowCookie = clearCookie('etsy_oauth_flow');

  if (error) {
    redirect(response, buildErrorRedirect(String(errorDescription || error)), clearFlowCookie);
    return;
  }

  if (!code || !state) {
    redirect(response, buildErrorRedirect('Missing OAuth code or state.'), clearFlowCookie);
    return;
  }

  const flow = parseFlow(String(request.headers.cookie || ''));
  if (!flow || flow.state !== state) {
    redirect(response, buildErrorRedirect('OAuth state validation failed.'), clearFlowCookie);
    return;
  }

  const { credentials, error: credentialsError } = await readSavedEtsyCredentials();
  if (credentialsError) {
    redirect(response, buildErrorRedirect(credentialsError), clearFlowCookie);
    return;
  }

  if (!credentials?.keystring) {
    redirect(response, buildErrorRedirect('Etsy credentials were not found.'), clearFlowCookie);
    return;
  }

  try {
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: credentials.keystring,
        redirect_uri: flow.redirectUri,
        code: String(code),
        code_verifier: String(flow.verifier),
      }),
    });

    const tokenPayload = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok) {
      throw new Error((tokenPayload as any)?.error || (tokenPayload as any)?.message || 'Etsy token exchange failed.');
    }

    const accessToken = String((tokenPayload as any)?.access_token || '').trim();
    const refreshToken = String((tokenPayload as any)?.refresh_token || '').trim();
    const expiresIn = Number((tokenPayload as any)?.expires_in || 3600);

    if (!accessToken || !refreshToken) {
      throw new Error('Etsy token exchange did not return both access and refresh tokens.');
    }

    const userId = parseEtsyUserIdFromAccessToken(accessToken);
    if (!userId) {
      throw new Error('Etsy token exchange returned an access token without a numeric user ID prefix.');
    }

    const apiKeyHeader = await getEtsyApiKeyHeader();
    if (!apiKeyHeader) {
      throw new Error('Etsy keystring and shared secret must be saved before connecting a shop.');
    }

    const shopResponses = await Promise.all([
      callEtsy(`/users/${userId}/shops`, { apiKeyHeader, accessToken, method: 'GET' }),
      callEtsy('/shops', { apiKeyHeader, accessToken, method: 'GET' }),
    ]);

    const shops = shopResponses.flatMap((entry) => normalizeEtsyList(entry.payload));
    const firstShop = shops[0] || null;
    const shopId = String(firstShop?.shop_id || firstShop?.shopId || '').trim();
    const shopName = String(firstShop?.shop_name || firstShop?.title || firstShop?.name || '').trim();

    if (!shopId) {
      throw new Error('Etsy did not return a connected shop for this account.');
    }

    const tokenRowId = await persistEtsyTokenRow({
      shopId,
      accessToken,
      refreshToken,
      grantedScopes: String((tokenPayload as any)?.scope || REQUIRED_SCOPES.join(' ')),
      expiresAt: new Date(Date.now() + Math.max(60, expiresIn) * 1000),
    });

    await upsertEtsyShop({
      shopId,
      shopName: shopName || `Etsy Shop ${shopId}`,
      tokenId: tokenRowId || null,
      status: 'connected',
      isEnabled: true,
      lastSyncedAt: null,
    });

    redirect(response, DASHBOARD_REDIRECT, clearFlowCookie);
  } catch (callbackError: any) {
    redirect(
      response,
      buildErrorRedirect(String(callbackError?.message || callbackError || 'Etsy OAuth failed.')),
      clearFlowCookie,
    );
  }
}
