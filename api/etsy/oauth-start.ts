import { buildCookie, buildEtsyAuthorizeUrl, createPkcePair, readSavedEtsyCredentials, requireAdmin, requirePost, sendJson } from './_shared.js';

const REQUIRED_SCOPES = ['listings_r', 'shops_r'];

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response)) return;

  const redirectUri = String(request.body?.redirectUri || '').trim();
  if (!redirectUri) {
    sendJson(response, 400, {
      error: 'A redirect URI is required to start Etsy OAuth.',
      details: 'Pass the exact callback URL for the current deployment.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const { credentials, error } = await readSavedEtsyCredentials();
  if (error) {
    sendJson(response, 500, {
      error: 'Etsy credentials could not be loaded from the server.',
      details: error,
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  if (!credentials?.keystring || !credentials.shared_secret) {
    sendJson(response, 400, {
      error: 'Etsy credentials must be saved before connecting.',
      details: 'Save your Etsy keystring and shared secret in Dashboard -> Settings -> Etsy first.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const { verifier, challenge, state } = createPkcePair();
  const flowPayload = Buffer.from(JSON.stringify({
    state,
    verifier,
    redirectUri,
    createdAt: new Date().toISOString(),
  }), 'utf8').toString('base64url');

  response.setHeader('Set-Cookie', buildCookie('etsy_oauth_flow', flowPayload, { maxAge: 600 }));

  const authorizeUrl = buildEtsyAuthorizeUrl({
    clientId: credentials.keystring,
    redirectUri,
    scopes: REQUIRED_SCOPES,
    state,
    codeChallenge: challenge,
  });

  sendJson(response, 200, {
    authorizeUrl,
    redirectUri,
    scopes: REQUIRED_SCOPES,
  });
}
