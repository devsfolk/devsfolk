import { callPrintify, requireAdmin, requireApiKey, requirePost, sendJson, sendPrintifyResult } from './_shared.js';

const REQUIRED_SCOPES = ['catalog.read'];

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response)) return;

  const apiKey = await requireApiKey(request, response);
  if (!apiKey) return;

  try {
    const result = await callPrintify(apiKey, '/catalog/blueprints.json');
    sendPrintifyResult(response, result.status, result.payload, 'Printify raw template lookup failed.', REQUIRED_SCOPES);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify raw template lookup failed.',
      details: error?.message || String(error),
      requiredScopes: REQUIRED_SCOPES,
    });
  }
}
