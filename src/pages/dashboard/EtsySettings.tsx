import React from 'react';
import { supabase } from '@/lib/supabase';
import { requestEtsyOAuthStart, syncEtsyListings } from '@/lib/etsyApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Shield, Store, Key, XCircle } from 'lucide-react';

type EtsyCredentials = {
  keystring: string;
  shared_secret: string;
};

type EtsyShopRow = {
  shop_id: string;
  shop_name: string | null;
  status: string;
  is_enabled: boolean;
  last_synced_at: string | null;
};

type EtsyDebugEnvResult = {
  hasSupabaseUrl: boolean;
  hasSupabaseServiceRoleKey: boolean;
  hasEtsyEncryptionKey: boolean;
  supabaseUrlLength: number;
  serviceRoleKeyLength: number;
  nodeEnv: string;
  vercelEnv: string;
};

export const EtsySettings: React.FC = () => {
  const [credentials, setCredentials] = React.useState<EtsyCredentials>({ keystring: '', shared_secret: '' });
  const [savedCredentials, setSavedCredentials] = React.useState<EtsyCredentials | null>(null);
  const [connectedShops, setConnectedShops] = React.useState<EtsyShopRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [diagnosticsLoading, setDiagnosticsLoading] = React.useState(false);
  const [diagnosticsError, setDiagnosticsError] = React.useState('');
  const [diagnostics, setDiagnostics] = React.useState<EtsyDebugEnvResult | null>(null);

  const callbackUrl = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const url = new URL(window.location.href);
    url.hostname = url.hostname.replace(/^www\./i, '');
    return `${url.origin}/etsy/callback`;
  }, []);
  const hasSavedCredentials = Boolean(savedCredentials?.keystring && savedCredentials?.shared_secret);
  const hasPendingCredentials = Boolean(credentials.keystring.trim() && credentials.shared_secret.trim());
  const credentialsAreSaved = Boolean(
    savedCredentials &&
    savedCredentials.keystring === credentials.keystring.trim() &&
    savedCredentials.shared_secret === credentials.shared_secret.trim(),
  );
  const activeShop = connectedShops[0] || null;

  const loadState = React.useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const [credentialsResult, shopsResult] = await Promise.all([
        supabase
          .from('etsy_credentials')
          .select('keystring, shared_secret')
          .eq('id', 'default')
          .maybeSingle(),
        supabase
          .from('etsy_shops')
          .select('shop_id, shop_name, status, is_enabled, last_synced_at')
          .order('connected_at', { ascending: false }),
      ]);

      if (credentialsResult.error) {
        throw new Error(credentialsResult.error.message);
      }

      if (shopsResult.error) {
        throw new Error(shopsResult.error.message);
      }

      const nextCredentials = {
        keystring: String(credentialsResult.data?.keystring || ''),
        shared_secret: String(credentialsResult.data?.shared_secret || ''),
      };

      setCredentials(nextCredentials);
      setSavedCredentials(nextCredentials.keystring && nextCredentials.shared_secret ? nextCredentials : null);
      setConnectedShops((shopsResult.data || []) as EtsyShopRow[]);
    } catch (loadError: any) {
      setErrorMessage(String(loadError?.message || loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('etsyOAuth');
    const oauthError = params.get('error');

    if (oauthStatus === 'success') {
      setStatusMessage('Etsy connected successfully.');
    } else if (oauthError) {
      setErrorMessage(oauthError);
    }
  }, []);

  const loadDiagnostics = React.useCallback(async () => {
    setDiagnosticsLoading(true);
    setDiagnosticsError('');

    try {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token || '';

      const response = await fetch('/api/etsy/debug-env', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `Debug endpoint returned ${response.status}.`);
      }

      setDiagnostics(payload as EtsyDebugEnvResult);
    } catch (diagnosticsLoadError: any) {
      setDiagnosticsError(String(diagnosticsLoadError?.message || diagnosticsLoadError));
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  const handleSaveCredentials = async () => {
    setSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const keystring = credentials.keystring.trim();
      const sharedSecret = credentials.shared_secret.trim();

      if (!keystring || !sharedSecret) {
        throw new Error('Both keystring and shared secret are required.');
      }

      const { error } = await supabase.from('etsy_credentials').upsert({
        id: 'default',
        keystring,
        shared_secret: sharedSecret,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setSavedCredentials({ keystring, shared_secret: sharedSecret });
      setStatusMessage('Etsy credentials saved.');
    } catch (saveError: any) {
      setErrorMessage(String(saveError?.message || saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      if (!hasSavedCredentials) {
        throw new Error('Save your Etsy credentials before connecting.');
      }

      const response = await requestEtsyOAuthStart(callbackUrl);
      window.location.href = response.authorizeUrl;
    } catch (connectError: any) {
      setConnecting(false);
      setErrorMessage(String(connectError?.message || connectError));
    }
  };

  const handleSyncListings = async () => {
    setSyncing(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await syncEtsyListings(activeShop?.shop_id);
      setStatusMessage(`Imported ${response.importedCount} Etsy listings (${response.variationCount} variations, ${response.questionCount} personalization questions).`);
      await loadState();
    } catch (syncError: any) {
      setErrorMessage(String(syncError?.message || syncError));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="pb-4 border-b border-gray-100">
        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Etsy Settings</h1>
        <p className="text-[8px] md:text-xs font-bold uppercase text-gray-400 tracking-widest opacity-70">
          Connect a shop using your own Etsy Seller App credentials, then import listings into the storefront.
        </p>
      </div>

      {(statusMessage || errorMessage) && (
        <div className={`rounded-2xl border p-4 text-sm ${errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {errorMessage ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="p-5 md:p-6">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">App Credentials</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Save the keystring and shared secret from your own Etsy Seller App. These stay in Supabase per tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 md:p-6 pt-0">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Keystring</Label>
              <Input
                value={credentials.keystring}
                onChange={(e) => setCredentials((current) => ({ ...current, keystring: e.target.value }))}
                placeholder="Etsy App Keystring"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Shared Secret</Label>
              <Input
                value={credentials.shared_secret}
                onChange={(e) => setCredentials((current) => ({ ...current, shared_secret: e.target.value }))}
                placeholder="Etsy App Shared Secret"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Saved rows are stored in `etsy_credentials`
              </p>
              <Button
                onClick={() => void handleSaveCredentials()}
                disabled={saving || !hasPendingCredentials}
                className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Connect & Authorize</CardTitle>
              </div>
              <CardDescription className="text-xs">
                OAuth uses PKCE and the admin's own Etsy app. The callback URL for this deployment is shown below for app registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 md:p-6 pt-0">
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">OAuth Callback URL</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs md:text-sm font-mono break-all">{callbackUrl}</code>
                  <Badge variant="outline" className="text-[9px] uppercase font-black">Copy into Etsy app settings</Badge>
                </div>
              </div>

              <Button
                onClick={() => void handleConnect()}
                disabled={!hasSavedCredentials || !credentialsAreSaved || connecting}
                className="rounded-xl h-11 px-5 text-[10px] font-black uppercase"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <ExternalLink className="h-3.5 w-3.5 mr-2" />}
                Connect to Etsy
              </Button>

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Requested scopes: listings_r, shops_r
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Store className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Connected Shop</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Once connected, import active listings into the storefront as Etsy-sourced products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 md:p-6 pt-0">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Etsy connection state...
                </div>
              ) : activeShop ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 rounded-2xl border bg-white p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black uppercase tracking-tight">{activeShop.shop_name || `Shop ${activeShop.shop_id}`}</h3>
                        <Badge variant={activeShop.status === 'connected' ? 'default' : 'secondary'} className="text-[9px] uppercase font-black">
                          {activeShop.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Shop ID: {activeShop.shop_id}
                      </p>
                      {activeShop.last_synced_at && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Last synced: {new Date(activeShop.last_synced_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => void handleSyncListings()}
                    disabled={syncing}
                    className="rounded-xl h-11 px-5 text-[10px] font-black uppercase"
                  >
                    {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                    Sync listings now
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No Etsy shop is connected yet. Save credentials, then click Connect to Etsy.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Deployment Note</CardTitle>
          </div>
          <CardDescription className="text-xs">
            The OAuth callback URL must match the domain for this deployment exactly, so the admin should register the Etsy app with the URL shown above.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 md:p-6 pt-0 text-sm text-gray-600 leading-relaxed">
          Etsy reads from the linked shop using the synced `etsy_shops` and `etsy_listings` tables. Printify settings and routes remain untouched in this phase.
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Diagnostics</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quick environment check for Etsy auth and server-side credentials. This reads booleans only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-5 md:p-6 pt-0">
          {diagnosticsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking server environment...
            </div>
          ) : diagnosticsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {diagnosticsError}
            </div>
          ) : diagnostics ? (
            <>
              <div className="flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {diagnostics.hasSupabaseUrl ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  Supabase URL present
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{diagnostics.hasSupabaseUrl ? 'Yes' : 'No'}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {diagnostics.hasSupabaseServiceRoleKey ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  Service role key present
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {diagnostics.hasSupabaseServiceRoleKey ? `Yes (${diagnostics.serviceRoleKeyLength})` : 'No'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {diagnostics.hasEtsyEncryptionKey ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  Etsy encryption key present
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{diagnostics.hasEtsyEncryptionKey ? 'Yes' : 'No'}</span>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Environment</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    node: {diagnostics.nodeEnv || 'unknown'} · vercel: {diagnostics.vercelEnv || 'unknown'}
                  </span>
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  URL length: {diagnostics.supabaseUrlLength}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Diagnostics have not loaded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
