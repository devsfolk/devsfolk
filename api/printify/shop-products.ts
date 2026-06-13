import { callPrintify, requireAdmin, requireApiKey, requirePost, sendJson, sendPrintifyResult } from './_shared';

const REQUIRED_SCOPES = ['shops.read', 'products.read'];

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response)) return;

  const apiKey = await requireApiKey(request, response);
  if (!apiKey) return;

  const shopId = String(request.body?.shopId || '').trim();
  if (!/^\d+$/.test(shopId)) {
    sendJson(response, 400, {
      error: 'A valid numeric Printify Shop ID is required for shop product sync.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  try {
    const result = await callPrintify(apiKey, `/shops/${shopId}/products.json`);
    sendPrintifyResult(response, result.status, result.payload, 'Printify shop product sync failed.', REQUIRED_SCOPES);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify shop product sync failed.',
      details: error?.message || String(error),
      requiredScopes: REQUIRED_SCOPES,
    });
  }
}
