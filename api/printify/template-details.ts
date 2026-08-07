import { callPrintify, requireAdmin, requireApiKey, requirePost, sendJson, sendPrintifyResult } from './_shared.js';

const REQUIRED_SCOPES = ['catalog.read', 'print_providers.read', 'products.read'];

const buildTemplateDetailPath = (body: any) => {
  const mode = String(body?.mode || '').trim();
  const shopId = String(body?.shopId || '').trim();
  const productId = String(body?.productId || '').trim();
  const blueprintId = String(body?.blueprintId || '').trim();
  const printProviderId = String(body?.printProviderId || '').trim();

  if (mode === 'shop-product' && /^\d+$/.test(shopId) && productId) {
    return `/shops/${shopId}/products/${encodeURIComponent(productId)}.json`;
  }

  if (mode === 'shop-product-by-blueprint' && /^\d+$/.test(shopId) && /^\d+$/.test(blueprintId)) {
    return `/shops/${shopId}/products.json`;
  }

  if (mode === 'shop-products-summary' && /^\d+$/.test(shopId)) {
    return `/shops/${shopId}/products.json`;
  }

  if (!/^\d+$/.test(blueprintId)) {
    return null;
  }

  if (mode === 'blueprint') {
    return `/catalog/blueprints/${blueprintId}.json`;
  }

  if (mode === 'providers') {
    return `/catalog/blueprints/${blueprintId}/print_providers.json`;
  }

  if (mode === 'variants' && /^\d+$/.test(printProviderId)) {
    return `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json?show-out-of-stock=1`;
  }

  if (mode === 'shipping' && /^\d+$/.test(printProviderId)) {
    return `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`;
  }

  return null;
};

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response)) return;

  const apiKey = await requireApiKey(request, response);
  if (!apiKey) return;

  const path = buildTemplateDetailPath(request.body);
  if (!path) {
    sendJson(response, 400, {
      error: 'Unsupported or invalid Printify template detail request.',
      details: 'Expected mode blueprint/providers/variants/shipping with a numeric blueprintId. Variants and shipping also require printProviderId.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  try {
    const result = await callPrintify(apiKey, path);

    if (String(request.body?.mode || '').trim() === 'shop-product-by-blueprint') {
      const requestedBlueprintId = Number(request.body?.blueprintId || 0);
      const products = Array.isArray(result.payload?.data)
        ? result.payload.data
        : Array.isArray(result.payload)
          ? result.payload
          : [];
      const matchedProduct = products.find((product: any) => (
        Number(product?.blueprint_id || product?.blueprintId || 0) === requestedBlueprintId
      ));

      if (!matchedProduct?.id) {
        sendJson(response, 404, {
          error: 'No Printify shop product matched the requested blueprint.',
          shopId: String(request.body?.shopId || '').trim(),
          blueprintId: requestedBlueprintId,
          products: products.map((product: any) => ({
            id: product?.id,
            blueprint_id: product?.blueprint_id ?? product?.blueprintId ?? null,
            title: product?.title || product?.name || '',
          })),
          requiredScopes: REQUIRED_SCOPES,
        });
        return;
      }

      const detail = await callPrintify(apiKey, `/shops/${String(request.body?.shopId || '').trim()}/products/${encodeURIComponent(String(matchedProduct.id))}.json`);
      sendJson(response, detail.status, {
        shopId: String(request.body?.shopId || '').trim(),
        blueprintId: requestedBlueprintId,
        matchedProductId: String(matchedProduct.id),
        matchedProduct,
        detail: detail.payload,
        requiredScopes: REQUIRED_SCOPES,
      });
      return;
    }

    if (String(request.body?.mode || '').trim() === 'shop-products-summary') {
      const products = Array.isArray(result.payload?.data)
        ? result.payload.data
        : Array.isArray(result.payload)
          ? result.payload
          : [];

      sendJson(response, result.status, {
        shopId: String(request.body?.shopId || '').trim(),
        count: products.length,
        products: products.map((product: any) => ({
          id: product?.id ?? null,
          title: product?.title || product?.name || '',
          blueprint_id: product?.blueprint_id ?? product?.blueprintId ?? null,
        })),
        requiredScopes: REQUIRED_SCOPES,
      });
      return;
    }

    sendPrintifyResult(response, result.status, result.payload, 'Printify template detail lookup failed.', REQUIRED_SCOPES);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify template detail lookup failed.',
      details: error?.message || String(error),
      requiredScopes: REQUIRED_SCOPES,
    });
  }
}
