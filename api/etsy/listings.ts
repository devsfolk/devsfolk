import {
  callEtsy,
  getEtsyApiKeyHeader,
  getSupabaseServiceClient,
  getValidEtsyAccessToken,
  normalizeEtsyList,
  requireAdmin,
  requirePost,
  sendJson,
  upsertEtsyShop,
} from './_shared.js';

const REQUIRED_SCOPES = ['listings_r', 'shops_r'];
const DEFAULT_CATEGORY_ID = 'cat_printify';

const normalizeEtsyImageUrl = (image: any) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url_fullxfull || image.url_570xN || image.url_170x135 || image.url_75x75 || image.src || image.url || '';
};

const extractMoney = (value: any) => {
  if (value == null) return 0;
  if (typeof value === 'number') {
    return value > 100 && Number.isInteger(value) ? value / 100 : value;
  }

  if (typeof value === 'object') {
    const amount = Number(value.amount ?? value.value ?? 0);
    const divisor = Number(value.divisor ?? 1) || 1;
    return amount / divisor;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 100 && Number.isInteger(parsed) ? parsed / 100 : parsed;
};

const extractVariantPrice = (product: any, listing: any) => {
  const offering = Array.isArray(product?.offerings) ? product.offerings[0] : product?.offering;
  return (
    extractMoney(offering?.price) ||
    extractMoney(product?.price) ||
    extractMoney(listing?.price) ||
    0
  );
};

const extractVariantQuantity = (product: any, listing: any) => {
  const offering = Array.isArray(product?.offerings) ? product.offerings[0] : product?.offering;
  const value = Number(offering?.quantity ?? product?.quantity ?? listing?.quantity ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const extractListingProperties = (product: any) => {
  if (Array.isArray(product?.property_values)) {
    return product.property_values;
  }
  if (product?.property_values && typeof product.property_values === 'object') {
    return product.property_values;
  }
  return product?.properties ?? [];
};

const syncListingRows = async (shopId: string, listing: any, accessToken: string, apiKeyHeader: string) => {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error('Supabase service client is not available.');
  }

  const listingId = String(listing?.listing_id || listing?.id || '').trim();
  if (!listingId) {
    return { productId: '', variationCount: 0, questionCount: 0 };
  }

  const productId = `etsy_listing_${listingId}`;

  const [inventoryResult, personalizationResult] = await Promise.all([
    callEtsy(`/listings/${listingId}/inventory`, {
      apiKeyHeader,
      accessToken,
      method: 'GET',
    }),
    callEtsy(`/listings/${listingId}/personalization`, {
      apiKeyHeader,
      accessToken,
      method: 'GET',
    }),
  ]);

  if (inventoryResult.status >= 400) {
    throw new Error((inventoryResult.payload as any)?.error || `Failed to fetch inventory for Etsy listing ${listingId}.`);
  }

  if (personalizationResult.status >= 400) {
    throw new Error((personalizationResult.payload as any)?.error || `Failed to fetch personalization for Etsy listing ${listingId}.`);
  }

  const inventory = inventoryResult.payload || {};
  const personalizationQuestions = normalizeEtsyList((personalizationResult.payload as any)?.personalization_questions || personalizationResult.payload);
  const inventoryProducts = Array.isArray(inventory?.products) ? inventory.products : [];
  const rawImages = Array.isArray(listing?.images)
    ? listing.images
    : Array.isArray(listing?.listing_images)
    ? listing.listing_images
    : [];
  const imageUrls = rawImages.map(normalizeEtsyImageUrl).filter(Boolean);
  const existingProductRows = await supabase
    .from('products')
    .select('id, created_at, display_order, is_featured')
    .in('id', [productId]);

  if (existingProductRows.error) {
    throw new Error(`Failed to inspect existing product rows: ${existingProductRows.error.message}`);
  }

  const existingProduct = existingProductRows.data?.[0] || null;
  const priceCandidates = inventoryProducts
    .map((product: any) => extractVariantPrice(product, listing))
    .filter((value: number) => value > 0);
  const stockCandidates = inventoryProducts
    .map((product: any) => extractVariantQuantity(product, listing))
    .filter((value: number) => value >= 0);

  const productRow = {
    id: productId,
    category_id: DEFAULT_CATEGORY_ID,
    name: String(listing?.title || `Etsy Listing ${listingId}`),
    slug: `etsy-listing-${listingId}`,
    description: String(listing?.description || ''),
    price: Number(priceCandidates[0] ?? extractMoney(listing?.price) ?? 0),
    discount_price: null,
    images: imageUrls.length > 0 ? imageUrls : ['/custom-tee-mockup.png'],
    stock: Number(stockCandidates.reduce((accumulator: number, value: number) => Math.max(accumulator, value), 0)),
    is_featured: Boolean(existingProduct?.is_featured ?? false),
    display_order: Number(existingProduct?.display_order ?? 0),
    colors: [],
    sizes: [],
    variants: [],
    variant_images: {},
    created_at: existingProduct?.created_at ?? Date.now(),
    is_printify: false,
    source: 'etsy',
    printify_product_id: null,
    printify_catalog_id: null,
  };

  const listingRow = {
    shop_id: shopId,
    listing_id: listingId,
    product_id: productId,
    title: productRow.name,
    description: productRow.description,
    price: productRow.price,
    images: rawImages,
    shop_section_id: listing?.shop_section_id ? String(listing.shop_section_id) : null,
    taxonomy_id: listing?.taxonomy_id ? String(listing.taxonomy_id) : null,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
  };

  const variationRows = inventoryProducts.map((product: any) => ({
    listing_id: listingId,
    sku: String(product?.sku || ''),
    properties: extractListingProperties(product),
    price: extractVariantPrice(product, listing),
    quantity: extractVariantQuantity(product, listing),
  }));

  const questionRows = personalizationQuestions.map((question: any) => ({
    listing_id: listingId,
    question_type: String(question?.question_type || question?.type || 'text_input'),
    prompt: String(question?.question_text || question?.prompt || ''),
    is_required: Boolean(question?.required ?? question?.is_required ?? false),
    max_length: question?.max_allowed_characters ?? question?.max_length ?? null,
    choices: question?.choices ?? question?.possible_values ?? null,
  }));

  const { error: listingError } = await supabase.from('etsy_listings').upsert(listingRow, { onConflict: 'listing_id' });
  if (listingError) {
    throw new Error(`Failed to save Etsy listing ${listingId}: ${listingError.message}`);
  }

  const { error: productError } = await supabase.from('products').upsert(productRow, { onConflict: 'id' });
  if (productError) {
    throw new Error(`Failed to mirror Etsy listing ${listingId} into products: ${productError.message}`);
  }

  const deleteChildren = await Promise.all([
    supabase.from('etsy_listing_variations').delete().eq('listing_id', listingId),
    supabase.from('etsy_personalization_questions').delete().eq('listing_id', listingId),
  ]);

  const childDeleteError = deleteChildren.find((entry) => entry.error)?.error;
  if (childDeleteError) {
    throw new Error(`Failed to clear previous Etsy child rows: ${childDeleteError.message}`);
  }

  if (variationRows.length > 0) {
    const { error } = await supabase.from('etsy_listing_variations').insert(variationRows);
    if (error) {
      throw new Error(`Failed to save Etsy listing variations for ${listingId}: ${error.message}`);
    }
  }

  if (questionRows.length > 0) {
    const { error } = await supabase.from('etsy_personalization_questions').insert(questionRows);
    if (error) {
      throw new Error(`Failed to save Etsy personalization questions for ${listingId}: ${error.message}`);
    }
  }

  return {
    productId,
    variationCount: variationRows.length,
    questionCount: questionRows.length,
  };
};

export default async function handler(request: any, response: any) {
  if (!requirePost(request, response)) return;
  if (!await requireAdmin(request, response)) return;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    sendJson(response, 500, {
      error: 'Supabase service client is not configured for Etsy listing sync.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const requestedShopId = String(request.body?.shopId || '').trim();
  const { data: connectedShop, error: shopError } = await supabase
    .from('etsy_shops')
    .select('shop_id, shop_name, status, is_enabled')
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shopError) {
    sendJson(response, 500, {
      error: 'Failed to load connected Etsy shop.',
      details: shopError.message,
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const shopId = requestedShopId || String(connectedShop?.shop_id || '').trim();
  if (!shopId) {
    sendJson(response, 400, {
      error: 'No connected Etsy shop was found.',
      details: 'Complete the OAuth connection before syncing listings.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const accessToken = await getValidEtsyAccessToken(shopId);
  if (!accessToken) {
    sendJson(response, 400, {
      error: 'No valid Etsy access token was found for the connected shop.',
      details: 'Reconnect Etsy from the dashboard and try syncing again.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  const apiKeyHeader = await getEtsyApiKeyHeader();
  if (!apiKeyHeader) {
    sendJson(response, 400, {
      error: 'Etsy credentials are missing.',
      details: 'Save your Etsy keystring and shared secret before syncing listings.',
      requiredScopes: REQUIRED_SCOPES,
    });
    return;
  }

  try {
    const listings: any[] = [];
    const limit = 100;
    let offset = 0;

    while (true) {
      const result = await callEtsy(`/shops/${shopId}/listings?state=active&limit=${limit}&offset=${offset}&includes=Images,Personalization`, {
        apiKeyHeader,
        accessToken,
        method: 'GET',
      });

      if (result.status >= 400) {
        throw new Error((result.payload as any)?.error || `Etsy listing sync failed with status ${result.status}.`);
      }

      const pageListings = normalizeEtsyList(result.payload);
      listings.push(...pageListings);
      if (pageListings.length < limit) {
        break;
      }

      offset += limit;
    }

    const imported = [];
    for (const listing of listings) {
      imported.push(await syncListingRows(shopId, listing, accessToken, apiKeyHeader));
    }

    await upsertEtsyShop({
      shopId,
      shopName: connectedShop?.shop_name || `Etsy Shop ${shopId}`,
      status: 'connected',
      isEnabled: true,
      lastSyncedAt: new Date().toISOString(),
    });

    sendJson(response, 200, {
      importedCount: imported.length,
      variationCount: imported.reduce((total, item) => total + item.variationCount, 0),
      questionCount: imported.reduce((total, item) => total + item.questionCount, 0),
      shopId,
    });
  } catch (error: any) {
    sendJson(response, 500, {
      error: 'Etsy listing sync failed.',
      details: error?.message || String(error),
      requiredScopes: REQUIRED_SCOPES,
    });
  }
}
