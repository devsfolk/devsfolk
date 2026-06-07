import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'devsfolk_printify_credentials_session';

interface PrintifyCredentials {
  apiKey: string;
  aiApiKey: string;
}

const emptyCredentials: PrintifyCredentials = {
  apiKey: '',
  aiApiKey: '',
};

export const loadPrintifyCredentials = async (): Promise<PrintifyCredentials> => {
  if (!supabase) {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? { ...emptyCredentials, ...JSON.parse(saved) } : emptyCredentials;
  }

  const { data, error } = await supabase
    .from('printify_credentials')
    .select('api_key, ai_api_key')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    apiKey: data?.api_key || '',
    aiApiKey: data?.ai_api_key || '',
  };
};

export const savePrintifyCredentials = async (credentials: Partial<PrintifyCredentials>) => {
  if (!supabase) {
    const current = await loadPrintifyCredentials();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...credentials }));
    return;
  }

  const current = await loadPrintifyCredentials().catch(() => emptyCredentials);
  const next = { ...current, ...credentials };

  const { error } = await supabase.from('printify_credentials').upsert({
    id: 'default',
    api_key: next.apiKey,
    ai_api_key: next.aiApiKey,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
};
