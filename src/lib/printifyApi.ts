import { PrintifyCatalogTemplate } from '@/types';
import { supabase } from '@/lib/supabase';

type PrintifyRequestMode = 'shops' | 'shop-products' | 'blueprints' | 'blueprint' | 'providers' | 'variants' | 'shipping';

interface PrintifyGatewayRequest {
  apiKey: string;
  mode: PrintifyRequestMode;
  shopId?: string;
  blueprintId?: number;
  printProviderId?: number;
}

const callPrintifyGateway = async <T,>(payload: PrintifyGatewayRequest): Promise<T> => {
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data.session?.access_token;

  const response = await fetch('/api/printify/catalog', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || data?.message || `Printify API returned status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

export const fetchPrintifyShops = (apiKey: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'shops' });
};

export const fetchPrintifyShopProducts = (apiKey: string, shopId: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'shop-products', shopId });
};

export const fetchPrintifyBlueprints = (apiKey: string) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'blueprints' });
};

export const fetchPrintifyBlueprintProviders = (apiKey: string, blueprintId: number) => {
  return callPrintifyGateway<any>({ apiKey, mode: 'providers', blueprintId });
};

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
