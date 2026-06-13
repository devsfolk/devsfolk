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

const uploadArtworkDataUrl = async (apiKey: string, dataUrl: unknown, fileNamePrefix: string): Promise<{ id: string; previewUrl: string }> => {
  const parsed = extractDataUrl(dataUrl);
  if (!parsed) {
    throw new Error('Customer artwork must be a PNG/JPG data URL or a public HTTPS URL before it can be sent to Printify.');
  }

  const uploadResponse = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json;charset=utf-8',
      'User-Agent': 'devsfolk-app/1.0',
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

  const id = String(uploadData?.id || '').trim();
  const previewUrl = String(uploadData?.preview_url || uploadData?.url || '').trim();
  if (!id || !previewUrl) {
    throw new Error('Printify artwork upload succeeded but did not return a usable media ID or preview URL.');
  }

  return { id, previewUrl };
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

// Builds the print_areas payload for Printify order submission (on-the-fly product creation).
// Printify's order API uses the simple format: { [position]: artworkUrl }
// where artworkUrl is a public HTTPS URL (the preview_url returned by the media library upload,
// or any existing public URL). This is different from the product creation API which uses
// the array-of-placeholders format.
const buildPrintAreasForItem = async (apiKey: string, item: any, index: number, orderId: string, missing: string[]) => {
  const existingPrintAreas = item?.printifyPrintAreas || item?.printAreas || item?.print_areas || item?.customization?.printifyPrintAreas || item?.customization?.printAreas || null;
  const position = getPrintAreaPosition(existingPrintAreas);

  const publicArtworkUrl = getPublicArtworkUrl(item);
  const dataUrl = getArtworkDataUrl(item);

  let artworkUrl = '';

  if (dataUrl) {
    // Upload base64 data URL to Printify media library → get back a public preview_url
    const uploadResult = await uploadArtworkDataUrl(apiKey, dataUrl, `${orderId || 'order'}-${index}-artwork`);
    artworkUrl = uploadResult.previewUrl;
  } else if (publicArtworkUrl) {
    // Already a public HTTPS URL — use directly
    artworkUrl = publicArtworkUrl;
  }

  if (!artworkUrl) {
    missing.push(`line_items[${index}].artwork_url`);
    return null;
  }

  // Printify order submission format: { [position]: "https://..." }
  return { [position]: artworkUrl };
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

const mapDbOrderToModel = (row: any): any => {
  const rawItems = row.items || [];
  const legacyPrintifySync = rawItems.find((item: any) => item?.productId === '__printify_sync_meta')?.printifySync;
  const legacyShippingAddress = rawItems.find((item: any) => item?.productId === '__shipping_address_meta')?.shippingAddress;
  const items = rawItems.filter((item: any) => item?.productId !== '__printify_sync_meta' && item?.productId !== '__shipping_address_meta');

  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    shippingAddress: legacyShippingAddress || undefined,
    items,
    total: Number(row.total),
    status: row.status,
    createdAt: Number(row.created_at),
    paymentMethod: row.payment_method || undefined,
    printifyOrderId: row.printify_order_id ?? legacyPrintifySync?.printifyOrderId ?? null,
    printifySyncStatus: row.printify_sync_status ?? legacyPrintifySync?.printifySyncStatus ?? 'PENDING',
    printifyErrorLog: row.printify_error_log ?? legacyPrintifySync?.printifyErrorLog ?? null,
  };
};

const getOrderFromDatabase = async (orderId: string) => {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase database credentials are not configured on the backend.');
  }

  const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!orderResponse.ok) {
    const errText = await orderResponse.text();
    throw new Error(`Database lookup failed: ${errText || orderResponse.statusText}`);
  }

  const rows = await orderResponse.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return mapDbOrderToModel(rows[0]);
};

const updateOrderFulfillmentStatusInDatabase = async (
  orderId: string,
  updates: { printifyOrderId?: string | null; printifySyncStatus: string; printifyErrorLog?: string | null }
) => {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return;
  }

  const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=items`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  let updatedItems = [];
  if (orderResponse.ok) {
    const rows = await orderResponse.json().catch(() => []);
    const rawItems = rows?.[0]?.items || [];
    const items = Array.isArray(rawItems)
      ? rawItems.filter((item: any) => item?.productId !== '__printify_sync_meta')
      : [];

    const syncMetaItem = {
      productId: '__printify_sync_meta',
      name: 'Printify Sync Metadata',
      price: 0,
      quantity: 0,
      printifySync: {
        printifyOrderId: updates.printifyOrderId || null,
        printifySyncStatus: updates.printifySyncStatus,
        printifyErrorLog: updates.printifyErrorLog || null,
      },
    };

    updatedItems = [...items, syncMetaItem];
  }

  const updateBody: any = {
    printify_sync_status: updates.printifySyncStatus,
    printify_order_id: updates.printifyOrderId || null,
    printify_error_log: updates.printifyErrorLog || null,
  };

  if (updatedItems.length > 0) {
    updateBody.items = updatedItems;
  }

  await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updateBody),
  });
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const isAuthorized = await isAuthorizedAdminRequest(request);
  const orderId = String(request.body?.orderId || request.body?.order?.id || '').trim();

  let orderData = request.body?.order;

  if (!isAuthorized) {
    if (!orderId) {
      sendJson(response, 401, { error: 'Admin authentication or a valid Order ID is required.' });
      return;
    }

    try {
      const fetchedOrder = await getOrderFromDatabase(orderId);
      if (!fetchedOrder) {
        sendJson(response, 404, { error: `Order ${orderId} not found.` });
        return;
      }

      if (fetchedOrder.printifySyncStatus === 'SYNCED') {
        sendJson(response, 200, {
          id: fetchedOrder.printifyOrderId,
          status: 'ALREADY_SYNCED',
          message: 'Order has already been fulfilled on Printify.',
        });
        return;
      }

      orderData = fetchedOrder;
    } catch (dbError: any) {
      sendJson(response, 500, {
        error: 'Failed to retrieve order for validation.',
        details: dbError?.message || String(dbError),
      });
      return;
    }
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
    const built = await buildOrderPayload(apiKey, orderData);
    missing = built.missing;
    payload = built.payload;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (orderId) {
      await updateOrderFulfillmentStatusInDatabase(orderId, {
        printifySyncStatus: 'FAILED',
        printifyErrorLog: errorMessage,
      });
    }
    sendJson(response, 422, {
      error: 'Printify fulfillment artwork preparation failed.',
      details: errorMessage,
    });
    return;
  }

  if (missing.length > 0) {
    const missingMessage = `Order is missing Printify fulfillment metadata: ${missing.join(', ')}`;
    if (orderId) {
      await updateOrderFulfillmentStatusInDatabase(orderId, {
        printifySyncStatus: 'FAILED',
        printifyErrorLog: missingMessage,
      });
    }
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
        'User-Agent': 'devsfolk-app/1.0',
      },
      body: JSON.stringify(payload),
    });

    const data = await parsePrintifyResponse(printifyResponse);
    
    if (printifyResponse.ok) {
      const printifyOrderId = data?.id || data?.data?.id || null;
      if (orderId) {
        await updateOrderFulfillmentStatusInDatabase(orderId, {
          printifySyncStatus: 'SYNCED',
          printifyOrderId,
          printifyErrorLog: null,
        });
      }
    } else {
      const errorMessage = data?.message || data?.error || 'Printify order submission failed.';
      const reason = data?.errors?.reason ? ` ${data.errors.reason}` : '';
      if (orderId) {
        await updateOrderFulfillmentStatusInDatabase(orderId, {
          printifySyncStatus: 'FAILED',
          printifyOrderId: request.body?.order?.printifyOrderId || null,
          printifyErrorLog: `${errorMessage}${reason}`,
        });
      }
    }

    sendJson(response, printifyResponse.status, data || { status: printifyResponse.status });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (orderId) {
      await updateOrderFulfillmentStatusInDatabase(orderId, {
        printifySyncStatus: 'FAILED',
        printifyErrorLog: errorMessage,
      });
    }
    sendJson(response, 502, {
      error: 'Printify order submission failed.',
      details: errorMessage,
    });
  }
}
