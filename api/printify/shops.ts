import { callPrintify, requireAdmin, requireApiKey, requirePost, sendJson, sendPrintifyResult } from './_shared.js';

const REQUIRED_SCOPES = ['shops.read'];

export default async function handler(request: any, response: any) {
  // Top-level guard: if anything throws unexpectedly, always return JSON
  try {
    if (!requirePost(request, response)) return;
    if (!await requireAdmin(request, response, { allowTokenValidation: true })) return;

    const apiKey = await requireApiKey(request, response);
    if (!apiKey) return;

    try {
      const result = await callPrintify(apiKey, '/shops.json');
      if (result.status === 401 || result.status === 403) {
        sendJson(response, result.status, {
          error: 'Printify rejected this PAT while retrieving shops.',
          details: 'Regenerate the token in Printify with shops.read enabled. For this integration, use a Full Access PAT or include every required Printify scope.',
          requiredScopes: REQUIRED_SCOPES,
        });
        return;
      }

      sendPrintifyResult(response, result.status, result.payload, 'Printify shop lookup failed.', REQUIRED_SCOPES);
    } catch (error: any) {
      sendJson(response, 502, {
        error: 'Printify shop lookup failed.',
        details: error?.message || String(error),
        requiredScopes: REQUIRED_SCOPES,
      });
    }
  } catch (outerError: any) {
    // Prevents Vercel from returning a generic HTML 500 page
    response.status(500).json({
      error: 'Unexpected server error in Printify shops handler.',
      details: String(outerError?.message || outerError),
    });
  }
}
