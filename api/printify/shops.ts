import { callPrintify, requireAdmin, requireApiKey, requirePost, sendJson, sendPrintifyResult } from './_shared';

const REQUIRED_SCOPES = ['shops.read'];

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response, { allowTokenValidation: true })) return;

  const apiKey = await requireApiKey(request, response);
  if (!apiKey) return;

  try {
    const result = await callPrintify(apiKey, '/shops.json');
    sendPrintifyResult(response, result.status, result.payload, 'Printify shop lookup failed.', REQUIRED_SCOPES);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify shop lookup failed.',
      details: error?.message || String(error),
      requiredScopes: REQUIRED_SCOPES,
    });
  }
}
