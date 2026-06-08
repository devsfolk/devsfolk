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

const buildLineItems = (order: any, missing: string[]) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    missing.push('line_items');
    return [];
  }

  return items.map((item: any, index: number) => {
    const quantity = toPositiveInteger(item?.quantity) || 1;
    const variantId = toPositiveInteger(getItemMetaValue(item, ['printifyVariantId', 'variant_id']));
    const existingProductId = String(getItemMetaValue(item, ['printifyProductId', 'product_id']) || '').trim();
    const blueprintId = toPositiveInteger(getItemMetaValue(item, ['printifyBlueprintId', 'blueprint_id']));
    const printProviderId = toPositiveInteger(getItemMetaValue(item, ['printifyPrintProviderId', 'print_provider_id']));
    const printAreas = item?.printifyPrintAreas || item?.printAreas || item?.print_areas || item?.customization?.printifyPrintAreas || item?.customization?.printAreas || null;

    if (!variantId) {
      missing.push(`line_items[${index}].variant_id`);
    }

    if (existingProductId) {
      return {
        product_id: existingProductId,
        variant_id: variantId,
        quantity,
        external_id: `${order.id}-${index}`,
      };
    }

    if (!blueprintId) {
      missing.push(`line_items[${index}].blueprint_id`);
    }
    if (!printProviderId) {
      missing.push(`line_items[${index}].print_provider_id`);
    }
    if (!printAreas || Object.keys(printAreas).length === 0) {
      missing.push(`line_items[${index}].print_areas`);
    }

    return {
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variant_id: variantId,
      print_areas: printAreas,
      quantity,
      external_id: `${order.id}-${index}`,
    };
  });
};

const buildOrderPayload = (order: any) => {
  const missing: string[] = [];
  if (!order?.id) {
    missing.push('order.id');
  }

  const addressTo = buildAddress(order, missing);
  const lineItems = buildLineItems(order, missing);

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

  const { missing, payload } = buildOrderPayload(request.body?.order);
  if (missing.length > 0) {
    sendJson(response, 422, {
      error: 'Order is missing Printify fulfillment metadata.',
      missing,
      details: 'Existing Printify products require product_id and variant_id. Custom template orders require blueprint_id, print_provider_id, variant_id, print_areas, and structured shipping address fields.',
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

    const text = await printifyResponse.text();
    const data = text ? JSON.parse(text) : null;
    sendJson(response, printifyResponse.status, data);
  } catch (error: any) {
    sendJson(response, 502, {
      error: 'Printify order submission failed.',
      details: error?.message || String(error),
    });
  }
}
