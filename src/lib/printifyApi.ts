import { Order, PrintifyCatalogTemplate } from '@/types';
import { supabase } from '@/lib/supabase';

type PrintifyRequestMode = 'shops' | 'shop-products' | 'blueprints' | 'blueprint' | 'providers' | 'variants' | 'shipping';

interface PrintifyGatewayRequest {
  apiKey: string;
  mode: PrintifyRequestMode;
  shopId?: string;
  blueprintId?: number;
  printProviderId?: number;
}

const getPrintifyGatewayPath = (mode: PrintifyRequestMode) => {
  if (mode === 'shops') return '/api/printify/shops';
  if (mode === 'shop-products') return '/api/printify/shop-products';
  if (mode === 'blueprints') return '/api/printify/raw-templates';
  return '/api/printify/template-details';
};

const callPrintifyGateway = async <T,>(payload: PrintifyGatewayRequest): Promise<T> => {
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data.session?.access_token;

  const response = await fetch(getPrintifyGatewayPath(payload.mode), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const requiredScopes = Array.isArray(data?.requiredScopes) && data.requiredScopes.length > 0
      ? ` Required scopes: ${data.requiredScopes.join(', ')}.`
      : '';
    const details = data?.details && typeof data.details !== 'object'
      ? ` ${data.details}`
      : '';
    const message = data?.error || data?.message || `Printify API returned status ${response.status}`;
    throw new Error(`${message}${details}${requiredScopes}`);
  }

  if (!data) {
    throw new Error(`Printify gateway returned a non-JSON response. Please confirm ${getPrintifyGatewayPath(payload.mode)} is deployed.`);
  }

  return data as T;
};

export const fetchPrintifyShops = (apiKey: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'shops' });
};

export const fetchPrintifyShopProducts = (apiKey: string, shopId: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'shop-products', shopId });
};

export const submitPrintifyOrder = async (shopId: string, order: Order, apiKey = '') => {
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data.session?.access_token;

  const response = await fetch('/api/printify/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ shopId, order, apiKey }),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const missing = Array.isArray(data?.missing) && data.missing.length > 0 ? ` Missing: ${data.missing.join(', ')}` : '';
    const detailText = data?.details ? ` ${data.details}` : '';
    let message = data?.error || data?.message || `Printify order API returned status ${response.status}`;
    
    if (data?.errors) {
      const nestedErrors = typeof data.errors === 'object'
        ? Object.entries(data.errors).map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`).join('; ')
        : String(data.errors);
      if (nestedErrors) {
        message += ` (Details: ${nestedErrors})`;
      }
    }
    
    throw new Error(`${message}${missing}${detailText}`);
  }

  if (!data) {
    throw new Error('Printify order gateway returned a non-JSON response. Please confirm the /api/printify/orders route is deployed.');
  }

  return data;
};

export const fetchPrintifyBlueprints = (apiKey: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'blueprints' });
};

export const fetchPrintifyBlueprintProviders = (apiKey: string, blueprintId: number) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'providers', blueprintId });
};

export const fetchPrintifyBlueprintVariants = (apiKey: string, blueprintId: number, printProviderId: number) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'variants', blueprintId, printProviderId });
};

export const fetchPrintifyBlueprintDetail = (apiKey: string, blueprintId: number) =>
  callPrintifyGateway<any>({ apiKey, mode: 'blueprint', blueprintId });

const normalizeBlueprintList = (data: any) => {
  const list = data?.data || data || [];
  return Array.isArray(list) ? list : [];
};

export const mapBlueprintsToTemplates = (data: any): PrintifyCatalogTemplate[] => {
  const syncedAt = new Date().toISOString();

  return normalizeBlueprintList(data).map((blueprint: any) => ({
    id: `bp_${blueprint.id}`,
    blueprintId: Number(blueprint.id),
    title: blueprint.title || 'Untitled Printify Template',
    brand: blueprint.brand || undefined,
    model: blueprint.model || undefined,
    description: blueprint.description || '',
    images: Array.isArray(blueprint.images) ? blueprint.images : [],
    providers: [],
    variants: [],
    printAreas: [],
    shipping: [],
    isEnabled: true,
    lastSynced: syncedAt,
  }));
};

export const mergeProvidersIntoTemplates = (
  templates: PrintifyCatalogTemplate[],
  providersByBlueprintId: Record<number, any[]>,
) => {
  return templates.map((template) => ({
    ...template,
    providers: providersByBlueprintId[template.blueprintId] || template.providers,
  }));
};
