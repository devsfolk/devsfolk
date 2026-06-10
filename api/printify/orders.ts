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

const parsePrintifyResponse = async (printifyResponse: any) => {
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

const normalizeApiKey = (value: unknown) => {
  const token = String(value || '').trim();
  return token.replace(/^Bearer\s+/i, '').trim();
};

const splitCustomerName = (name: unknown) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || parts[0] || '',
  };
};

const toPositiveInteger = (value: unknown) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const isTemplateProductReference = (value: unknown) => (
  String(value || '').startsWith('template_') ||
  String(value || '').startsWith('printify_template_') ||
  String(value || '').startsWith('bp_')
);

const isRealPrintifyProductId = (value: unknown) => (
  /^[a-f0-9]{24}$/i.test(String(value || '').trim())
);

const getItemMetaValue = (item: any, keys: string[]) => {
  for (const key of keys) {
    const value = item?.[key] ?? item?.customization?.[key] ?? item?.metadata?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
};

const buildAddress = (order: any, missing: string[]) => {
  const address = order?.shippingAddress || order?.addressTo || {};
  const nameParts = splitCustomerName(order?.customerName);
  const addressTo = {
    first_name: String(address.firstName || address.first_name || nameParts.first_name).trim(),
    last_name: String(address.lastName || address.last_name || nameParts.last_name).trim(),
    email: String(address.email || order?.customerEmail || '').trim(),
    phone: String(address.phone || order?.customerPhone || '').trim(),
    country: String(address.country || '').trim(),
    region: String(address.region || address.state || '').trim(),
    address1: String(address.address1 || '').trim(),
    address2: String(address.address2 || '').trim(),
    city: String(address.city || '').trim(),
    zip: String(address.zip || address.postalCode || '').trim(),
  };

  (['first_name', 'last_name', 'email', 'phone', 'country', 'address1', 'city', 'zip'] as const).forEach((field) => {
    if (!addressTo[field]) {
      missing.push(`address_to.${field}`);
    }
  });

  if (!order?.shippingAddress && !order?.addressTo && order?.customerAddress) {
    missing.push('structured shipping address fields; customerAddress is free text and cannot be safely parsed for Printify');
  }

  return addressTo;
};

const extractDataUrl = (value: unknown) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^data:(image\/(?:png|jpe?g));base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    contents: match[2],
    extension: match[1].toLowerCase().includes('png') ? 'png' : 'jpg',
  };
};

const getPublicArtworkUrl = (item: any) => {
  const candidates = [
    item?.customization?.previewUrl,
    item?.customization?.customImageUrl,
    item?.previewUrl,
    item?.image,
  ];

  return candidates
    .map((candidate) => String(candidate || '').trim())
    .find((candidate) => /^https?:\/\//i.test(candidate)) || '';
};

const getArtworkDataUrl = (item: any) => {
  const candidates = [
    item?.customization?.previewUrl,
    item?.customization?.customImageUrl,
    item?.previewUrl,
    item?.image,
  ];

  return candidates.find((candidate) => extractDataUrl(candidate)) || '';
};

const uploadArtworkDataUrl = async (apiKey: string, dataUrl: unknown, fileNamePrefix: string) => {
  const parsed = extractDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Customer artwork must be a PNG/JPG data URL or a public HTTPS URL before it can be sent to Printify.');
  }

  const uploadResponse = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify({
      file_name: `${fileNamePrefix}.${parsed.extension}`,
      contents: parsed.contents,
    }),
  });

  const uploadData = await parsePrintifyResponse(uploadResponse);
  if (!uploadResponse.ok) {
    const message = uploadData?.message || uploadData?.error || 'Printify artwork upload failed.';
    const reason = uploadData?.errors?.reason ? ` ${uploadData.errors.reason}` : '';
    throw new Error(`${message}${reason}`);
  }

  const previewUrl = String(uploadData?.preview_url || uploadData?.url || '').trim();
  if (!previewUrl) {
    throw new Error('Printify artwork upload succeeded but did not return a usable preview URL.');
  }

  return previewUrl;
};

const getPrintAreaPosition = (printAreas: any) => {
  if (printAreas && typeof printAreas === 'object') {
    if (!Array.isArray(printAreas)) {
      const directKeys = Object.keys(printAreas).filter((key) => key && !['variant_ids', 'placeholders', 'images', 'background'].includes(key));
      const directPosition = directKeys.find((key) => ['front', 'back', 'left', 'right', 'sleeve', 'hood'].some((known) => key.toLowerCase().includes(known)));
      if (directPosition) {
        return directPosition;
      }

      const placeholderPosition = printAreas.placeholders?.find?.((placeholder: any) => placeholder?.position)?.position;
      if (placeholderPosition) {
        return placeholderPosition;
      }
    }

    if (Array.isArray(printAreas)) {
      const firstPlaceholder = printAreas
        .flatMap((area: any) => Array.isArray(area?.placeholders) ? area.placeholders : [])
        .find((placeholder: any) => placeholder?.position);
      if (firstPlaceholder?.position) {
        return firstPlaceholder.position;
      }
    }
  }

  return 'front';
};

const buildPrintAreasForItem = async (apiKey: string, item: any, index: number, orderId: string, missing: string[]) => {
  const existingPrintAreas = item?.printifyPrintAreas || item?.printAreas || item?.print_areas || item?.customization?.printifyPrintAreas || item?.customization?.printAreas || null;
  const publicArtworkUrl = getPublicArtworkUrl(item);
  const dataUrl = getArtworkDataUrl(item);

  let artworkUrl = publicArtworkUrl;
  if (!artworkUrl && dataUrl) {
    artworkUrl = await uploadArtworkDataUrl(apiKey, dataUrl, `${orderId || 'order'}-${index}-artwork`);
  }

  if (!artworkUrl) {
    missing.push(`line_items[${index}].artwork_url`);
    return null;
  }

  return {
    [getPrintAreaPosition(existingPrintAreas)]: artworkUrl,
  };
};

const buildLineItems = async (apiKey: string, order: any, missing: string[]) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    missing.push('line_items');
    return [];
  }

  const lineItems = [];

  for (const [index, item] of items.entries()) {
    const quantity = toPositiveInteger(item?.quantity) || 1;
    const variantId = toPositiveInteger(getItemMetaValue(item, ['printifyVariantId', 'variant_id']));
    const productIdCandidate = String(getItemMetaValue(item, ['printifyProductId', 'product_id']) || '').trim();
    const existingProductId = !isTemplateProductReference(productIdCandidate) && isRealPrintifyProductId(productIdCandidate)
      ? productIdCandidate
      : '';
    const blueprintId = toPositiveInteger(getItemMetaValue(item, ['printifyBlueprintId', 'blueprint_id']));
    const printProviderId = toPositiveInteger(getItemMetaValue(item, ['printifyPrintProviderId', 'print_provider_id']));

    if (!variantId) {
      missing.push(`line_items[${index}].variant_id`);
    }

    if (existingProductId) {
      lineItems.push({
        product_id: existingProductId,
        variant_id: variantId,
        quantity,
        external_id: `${order.id}-${index}`,
      });
      continue;
    }

    if (!blueprintId) {
      missing.push(`line_items[${index}].blueprint_id`);
    }
    if (!printProviderId) {
      missing.push(`line_items[${index}].print_provider_id`);
    }

    const printAreas = await buildPrintAreasForItem(apiKey, item, index, String(order?.id || ''), missing);

    lineItems.push({
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variant_id: variantId,
      print_areas: printAreas,
      quantity,
      external_id: `${order.id}-${index}`,
    });
  }

  return lineItems;
};

const buildOrderPayload = async (apiKey: string, order: any) => {
  const missing: string[] = [];
  if (!order?.id) {
    missing.push('order.id');
  }

  const addressTo = buildAddress(order, missing);
  const lineItems = await buildLineItems(apiKey, order, missing);

  return {
    missing: [...new Set(missing)],
    payload: {
      external_id: String(order?.id || ''),
      label: String(order?.id || '').slice(0, 32),
      line_items: lineItems,
      shipping_method: toPositiveInteger(order?.shippingMethod) || 1,
      send_shipping_notification: false,
      address_to: addressTo,
    },
  };
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const isAuthorized = await isAuthorizedAdminRequest(request);
  if (!isAuthorized) {
    sendJson(response, 401, { error: 'Admin authentication is required before submitting Printify orders.' });
    return;
  }

  const apiKey = normalizeApiKey(request.body?.apiKey) || await getSavedPrintifyApiKey();
  if (!apiKey) {
    sendJson(response, 400, { error: 'Printify API Access Token is required.' });
    return;
  }

  const shopId = String(request.body?.shopId || '').trim();
  if (!/^\d+$/.test(shopId)) {
    sendJson(response, 400, { error: 'A valid numeric Printify Shop ID is required.' });
    return;
  }

  let missing: string[] = [];
  let payload: any = null;
  try {
    const built = await buildOrderPayload(apiKey, request.body?.order);
    missing = built.missing;
    payload = built.payload;
  } catch (error: any) {
    sendJson(response, 422, {
      error: 'Printify fulfillment artwork preparation failed.',
      details: error?.message || String(error),
    });
    return;
  }

  if (missing.length > 0) {
    sendJson(response, 422, {
      error: 'Order is missing Printify fulfillment metadata.',
      missing,
      details: 'Existing Printify products require a real Printify product_id and variant_id. Custom template orders require blueprint_id, print_provider_id, variant_id, uploaded artwork/public artwork URL, generated print_areas, and structured shipping address fields.',
    });
    return;
  }

  try {
    const printifyResponse = await fetch(`${PRINTIFY_API_BASE}/shops/${shopId}/orders.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await parsePrintifyResponse(printifyResponse);
    sendJson(response, printifyResponse.status, data || { status: printifyResponse.status });
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify order submission failed.',
      details: error?.message || String(error),
    });
  }
}
