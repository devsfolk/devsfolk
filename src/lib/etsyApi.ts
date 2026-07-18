import { supabase } from '@/lib/supabase';

const getAuthenticatedHeaders = async () => {
  const sessionResult = supabase ? await supabase.auth.getSession() : null;
  const accessToken = sessionResult?.data.session?.access_token;

  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
};

const callEtsyRoute = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthenticatedHeaders()),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Etsy API returned status ${response.status}`;
    const details = data?.details && typeof data.details !== 'object'
      ? ` ${data.details}`
      : '';
    throw new Error(`${errorMessage}${details}`);
  }

  if (!data) {
    throw new Error(`Etsy route ${path} returned a non-JSON response.`);
  }

  return data as T;
};

export const requestEtsyOAuthStart = (redirectUri: string) => {
  return callEtsyRoute<{ authorizeUrl: string; redirectUri: string; scopes: string[] }>('/api/etsy/oauth-start', {
    redirectUri,
  });
};

export const syncEtsyListings = (shopId?: string) => {
  return callEtsyRoute<{ importedCount: number; variationCount: number; questionCount: number; shopId: string }>('/api/etsy/listings', {
    ...(shopId ? { shopId } : {}),
  });
};
