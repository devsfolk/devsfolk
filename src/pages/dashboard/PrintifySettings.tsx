import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Key, Eye, Edit, RefreshCw, ShoppingCart, Link, AlertCircle, Save, CheckCircle2, Loader2, Play, Clock, Zap, Info, FileText, Trash2 } from 'lucide-react';
import { loadPrintifyCredentials, savePrintifyCredentials } from '@/lib/printifyCredentials';
import { fetchPrintifyBlueprintDetail, fetchPrintifyBlueprintProviders, fetchPrintifyBlueprintVariants, fetchPrintifyBlueprints, fetchPrintifyShopProducts, fetchPrintifyShops, mapBlueprintsToTemplates, mergeProvidersIntoTemplates, submitPrintifyOrder } from '@/lib/printifyApi';

// Pure helper: builds a Map from option value ID → { title, name, hex? } using Printify variant endpoint data.
// Requirements 2.4, 2.5
const buildOptionValueMap = (blueprintDetail: any): Map<number, { title: string; name: string; hex?: string }> => {
  const map = new Map<number, { title: string; name: string; hex?: string }>();
  const options = Array.isArray(blueprintDetail?.options) ? blueprintDetail.options : [];
  for (const option of options) {
    const values = Array.isArray(option?.values) ? option.values : [];
    const optionName = String(option?.name || option?.type || option?.title || option?.id || '').toLowerCase();
    const isColor = optionName.includes('color') || optionName.includes('colour');
    for (const value of values) {
      const id = Number(value?.id);
      const title = String(value?.title || value?.name || '').trim();
      if (!id || !title) continue;
      const hex = isColor && Array.isArray(value?.colors) && value.colors.length > 0
        ? String(value.colors[0]).trim()
        : undefined;
      map.set(id, { title, name: optionName, ...(hex ? { hex } : {}) });
    }
  }
  return map;
};

// Pure helper: replaces integer option IDs in a variant with resolved { id, name, title, hex? } objects.
// Requirements 2.4, 2.5
const resolveVariantOptions = (
  variant: any,
  optionValueMap: Map<number, { title: string; name: string; hex?: string }>,
  blueprintDetail?: any
): any => {
  if (!variant || !Array.isArray(variant.options)) return variant;
  const options = Array.isArray(blueprintDetail?.options) ? blueprintDetail.options : [];
  const resolvedOptions = variant.options.map((optionIdOrObj: any, idx: number) => {
    // If already resolved (object with title), return as-is
    if (optionIdOrObj && typeof optionIdOrObj === 'object' && optionIdOrObj.title) {
      return optionIdOrObj;
    }
    const id = Number(optionIdOrObj);
    const resolved = optionValueMap.get(id);
    // Prefer the parent option found by value ID; fallback to array index only for unusual API shapes.
    const optionDef = options.find((option: any) => (
      Array.isArray(option?.values) &&
      option.values.some((value: any) => Number(value?.id) === id)
    )) || options[idx];
    const name = String(optionDef?.name || optionDef?.type || optionDef?.id || '').toLowerCase();
    return {
      id,
      name: resolved?.name || name,
      title: resolved?.title ?? String(id),
      ...(resolved?.hex ? { hex: resolved.hex } : {}),
    };
  });
  return { ...variant, options: resolvedOptions };
};

export const PrintifySettings: React.FC = () => {
  const { settings, updateSettings, orders, printifyCatalog, upsertPrintifyCatalogTemplates, upsertPrintifyShopProducts, updateOrderPrintifySync, deleteProduct, products, deletePrintifyCatalogTemplate, clearPrintifyCatalog } = useShop();
  
  const printifySettings = settings.printifySettings || {
    enabled: false,
    providerSettings: { apiKey: '', shopId: '' },
    editor: { selected: 'devsfolk', devsfolkEnabled: true, alternativeEnabled: false },
    preview: { selected: 'devsfolk', devsfolkEnabled: true, aiEnabled: false, aiConfig: { provider: 'gemini', apiKey: '', maxPreviewImages: 2, pipelinePrompt: '' } },
    charges: { profitMarginPercent: 40, designFee: 0, editFee: 0, templateBasePrice: 14.99, sizeFees: {}, placementFees: {} },
    sync: { mode: 'scheduled', scheduleInterval: 'daily', autoSyncEnabled: true }
  };

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [connectionError, setConnectionError] = useState('');
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [deletingTemplates, setDeletingTemplates] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('apis');
  const [privateApiKey, setPrivateApiKey] = useState('');
  const [privateAiApiKey, setPrivateAiApiKey] = useState('');
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [templateSyncSearch, setTemplateSyncSearch] = useState('');
  const [templateSyncLimit, setTemplateSyncLimit] = useState('100');
  const [customSyncQuantity, setCustomSyncQuantity] = useState('');
  const [submittingOrderId, setSubmittingOrderId] = useState('');

  const initialApiKeyRef = useRef('');
  const lastCheckedTokenRef = useRef('');

  const normalizeToken = (token: string) => token.trim().replace(/^Bearer\s+/i, '').trim();

  const normalizePrintifyList = (payload: any, keys: string[] = []) => {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
      if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    }
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  useEffect(() => {
    let mounted = true;

    const loadCredentials = async () => {
      try {
        const credentials = await loadPrintifyCredentials();
        if (!mounted) {
          return;
        }

        setPrivateApiKey(credentials.apiKey);
        setPrivateAiApiKey(credentials.aiApiKey);
        initialApiKeyRef.current = credentials.apiKey;
      } catch (err: any) {
        console.error('Failed to load private Printify credentials:', err);
        setSyncLogs(prev => [...prev, `[WARNING] Could not load private Printify credentials: ${err.message || err}`]);
      } finally {
        if (mounted) {
          setCredentialsLoaded(true);
        }
      }
    };

    void loadCredentials();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!credentialsLoaded) {
      return;
    }

    const token = normalizeToken(privateApiKey);
    
    // If the token is empty, reset status
    if (!token) {
      setConnectionStatus('idle');
      setConnectionError('');
      lastCheckedTokenRef.current = '';
      return;
    }

    // If it's the same token as initially loaded on mount, or same as last verified, don't auto-verify
    if (token === initialApiKeyRef.current || token === lastCheckedTokenRef.current) {
      // If we already have a token and shopId, and haven't failed, default status to success
      if (token && printifySettings.providerSettings.shopId && connectionStatus === 'idle') {
        setConnectionStatus('success');
      }
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');

    const debounceTimer = setTimeout(async () => {
      lastCheckedTokenRef.current = token;
      try {
        const shops = await fetchPrintifyShops(token);
        const shopList = shops.data || shops || [];
        
        if (Array.isArray(shopList) && shopList.length > 0) {
          const detectedShop = shopList[0];
          const detectedShopId = String(detectedShop.id);
          
          handleUpdate({
            providerSettings: {
              apiKey: '',
              shopId: detectedShopId
            }
          });
          await savePrintifyCredentials({ apiKey: token });
          
          setConnectionStatus('success');
          setSyncLogs(prev => [
            ...prev,
            `[SUCCESS] API Access Token auto-verified!`,
            `[INFO] Auto-detected Shop ID: ${detectedShopId} ("${detectedShop.title}")`
          ]);
        } else {
          throw new Error('No shops found in this Printify account.');
        }
      } catch (err: any) {
        console.error('Auto-detect connection failed:', err);
        setConnectionError(err.message || String(err));
        setSyncLogs(prev => [...prev, `[ERROR] Token auto-verification failed: ${err.message || err}`]);
        setConnectionStatus('failed');
      } finally {
        setTestingConnection(false);
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(debounceTimer);
  }, [privateApiKey, credentialsLoaded]);

  const handleUpdate = (updates: any) => {
    updateSettings({
      printifySettings: {
        ...printifySettings,
        ...updates
      }
    });
  };

  const handleSave = async () => {
    if (printifySettings.enabled) {
      const shopId = printifySettings.providerSettings.shopId?.trim();
      const apiKey = normalizeToken(privateApiKey);

      if (!apiKey) {
        alert('Validation Error:\n\nPrintify API Access Token (PAT) is required when Printify Mode is enabled.');
        return;
      }

      if (!shopId) {
        alert('Validation Error:\n\nShop ID is required when Printify Mode is enabled.');
        return;
      }

      if (!/^\d+$/.test(shopId)) {
        alert('Validation Error:\n\nShop ID must be a numeric value (e.g. 123456). E-mail address or alphabetical text is not a valid Shop ID.');
        return;
      }
    }

    setSaving(true);
    try {
      await savePrintifyCredentials({
        apiKey: normalizeToken(privateApiKey),
        aiApiKey: privateAiApiKey.trim(),
      });
    } catch (err: any) {
      setSaving(false);
      alert(`Credential Save Failed:\n\n${err.message || err}`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
  };

  const testConnection = async () => {
    const token = normalizeToken(privateApiKey);
    if (!token) {
      alert('Please enter your Printify API Access Token (PAT) first.');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionError('');

    try {
      const shops = await fetchPrintifyShops(token);
      const shopList = shops.data || shops || [];
      
      if (Array.isArray(shopList) && shopList.length > 0) {
        const detectedShop = shopList[0];
        const detectedShopId = String(detectedShop.id);
        
        handleUpdate({
          providerSettings: {
            apiKey: '',
            shopId: detectedShopId
          }
        });
        await savePrintifyCredentials({ apiKey: token });
        
        setConnectionStatus('success');
        setSyncLogs(prev => [
          ...prev,
          `[SUCCESS] API Access Token verified!`,
          `[INFO] Auto-detected Shop ID: ${detectedShopId} ("${detectedShop.title}")`
        ]);
        alert(`Token Verified!\nAuto-detected Shop: ${detectedShop.title} (ID: ${detectedShopId})\n\nShop ID has been populated and webhook URL generated successfully.`);
      } else {
        throw new Error('No shops found in this Printify account.');
      }
    } catch (err: any) {
      console.error('Connection test / auto-detect failed:', err);
      setConnectionError(err.message || String(err));
      setSyncLogs(prev => [...prev, `[ERROR] Token verification failed: ${err.message || err}`]);
      setConnectionStatus('failed');
      alert(`Verification Failed!\n\nError: ${err.message || err}\n\nPlease verify that your Access Token (PAT) is correct.`);
    } finally {
      setTestingConnection(false);
    }
  };

  const runManualSync = async () => {
    if (!normalizeToken(privateApiKey) || !printifySettings.providerSettings.shopId) {
      alert('Please configure your Printify API Access Token and Shop ID in the APIs tab first.');
      return;
    }
    
    const shopId = printifySettings.providerSettings.shopId.trim();
    if (!/^\d+$/.test(shopId)) {
      alert('Invalid Shop ID. The Shop ID must be a numeric value.');
      return;
    }

    setSyncingProducts(true);
    setSyncLogs(['[INFO] Initializing catalog sync...', `[INFO] Querying Shop ID: ${shopId}...`]);

    try {
      const apiKey = normalizeToken(privateApiKey);
      setSyncLogs(prev => [...prev, '[INFO] Connecting to Printify API via secure client bridge...']);
      const data = await fetchPrintifyShopProducts(apiKey, shopId);
      const printifyProducts = data.data || data || [];
      
      if (!Array.isArray(printifyProducts)) {
        throw new Error('Unexpected API response format. Expected an array of products.');
      }

      setSyncLogs(prev => [...prev, `[SUCCESS] Connected! Found ${printifyProducts.length} products on Printify.`]);

      if (printifyProducts.length === 0) {
        setSyncLogs(prev => [...prev, '[WARNING] No products found in this Printify shop. Please create products in your Printify dashboard first.']);
        setSyncingProducts(false);
        return;
      }

      const productPayloads = [];

      for (const p of printifyProducts) {
        const colors: string[] = [];
        const sizes: string[] = [];

        if (Array.isArray(p.options)) {
          const colorOption = p.options.find((opt: any) => 
            opt.type === 'color' || 
            opt.name.toLowerCase() === 'color' || 
            opt.name.toLowerCase() === 'colors'
          );
          const sizeOption = p.options.find((opt: any) => 
            opt.type === 'size' || 
            opt.name.toLowerCase() === 'size' || 
            opt.name.toLowerCase() === 'sizes'
          );

          if (colorOption && Array.isArray(colorOption.values)) {
            colorOption.values.forEach((v: any) => {
              if (v.colors && v.colors[0]) {
                colors.push(v.colors[0]);
              } else if (v.title) {
                colors.push(v.title);
              }
            });
          }

          if (sizeOption && Array.isArray(sizeOption.values)) {
            sizeOption.values.forEach((v: any) => {
              if (v.title) sizes.push(v.title);
            });
          }
        }

        if (colors.length === 0) colors.push('#FFFFFF', '#111827');
        if (sizes.length === 0) sizes.push('S', 'M', 'L', 'XL');

        const images = Array.isArray(p.images) 
          ? p.images.map((img: any) => img.src)
          : ['/custom-tee-mockup.png'];

        productPayloads.push({
          categoryId: 'cat_printify',
          name: p.title,
          slug: `printify-${p.id}`,
          description: p.description || 'Print-on-demand product.',
          price: 24.99,
          images,
          stock: 100,
          isFeatured: true,
          colors,
          sizes,
          isPrintify: true,
          printifyProductId: String(p.id),
          printifyCatalogId: String(p.blueprint_id || '')
        });
      }

      const { importedCount, updatedCount } = await upsertPrintifyShopProducts(productPayloads);

      setSyncLogs(prev => [
        ...prev, 
        `[SUCCESS] Sync fully complete! Imported: ${importedCount}, Updated: ${updatedCount}.`,
        '[INFO] Store catalog updated in database and local cache.'
      ]);
    } catch (err: any) {
      console.error('Printify sync failed:', err);
      setSyncLogs(prev => [
        ...prev, 
        `[ERROR] Sync failed: ${err.message || err}`,
        '[TIP] Make sure your Access Token has the correct scopes and your Shop ID matches your Printify account.'
      ]);
    } finally {
      setSyncingProducts(false);
    }
  };

  const deleteAllRawTemplates = async () => {
    if (!confirm('This will permanently delete all raw Printify templates. Continue?')) {
      return;
    }

    setDeletingTemplates(true);
    setSyncLogs(['[INFO] Deleting all raw Printify templates and products from database and cache...']);

    try {
      await clearPrintifyCatalog();
      setSyncLogs(prev => [
        ...prev,
        '[SUCCESS] All templates successfully deleted from catalog and fallback products.',
      ]);
    } catch (err: any) {
      console.error('Delete all templates failed:', err);
      setSyncLogs(prev => [...prev, `[ERROR] Delete failed: ${err.message || err}`]);
    } finally {
      setDeletingTemplates(false);
    }
  };

  const runTemplateCatalogSync = async () => {
    const apiKey = normalizeToken(privateApiKey);
    if (!apiKey) {
      alert('Please configure your Printify API Access Token in the APIs tab first.');
      return;
    }

    setSyncingTemplates(true);
    setSyncLogs([
      '[INFO] Initializing raw Printify template sync...',
      '[INFO] Fetching catalog blueprints for customer-customizable products...',
    ]);

    try {
      const blueprintData = await fetchPrintifyBlueprints(apiKey);
      const allTemplates = mapBlueprintsToTemplates(blueprintData);
      const query = templateSyncSearch.trim().toLowerCase();
      const filteredTemplates = query
        ? allTemplates.filter((template) => (
            template.title.toLowerCase().includes(query) ||
            template.brand?.toLowerCase().includes(query) ||
            template.model?.toLowerCase().includes(query) ||
            String(template.blueprintId).includes(query)
          ))
        : allTemplates;
      const maxTemplates = templateSyncLimit === 'all'
        ? filteredTemplates.length
        : templateSyncLimit === 'custom'
        ? Math.max(1, Number(customSyncQuantity) || 1)
        : Math.max(1, Number(templateSyncLimit) || 100);
      const templates = filteredTemplates.slice(0, maxTemplates);

      if (templates.length === 0) {
        setSyncLogs(prev => [...prev, '[WARNING] No Printify templates matched the current sync filters.']);
        return;
      }

      setSyncLogs(prev => [
        ...prev,
        `[SUCCESS] Found ${allTemplates.length} raw templates / blueprints.`,
        `[INFO] Syncing ${templates.length} templates${query ? ` matching "${templateSyncSearch.trim()}"` : ''}.`
      ]);

      const providerLimit = templates.length;
      const providersByBlueprintId: Record<number, any[]> = {};
      const variantsByBlueprintId: Record<number, any[]> = {};
      const printAreasByBlueprintId: Record<number, any[]> = {};

      for (const template of templates.slice(0, providerLimit)) {
        try {
          const providerData = await fetchPrintifyBlueprintProviders(apiKey, template.blueprintId);
          const providerList = providerData.data || providerData || [];
          providersByBlueprintId[template.blueprintId] = Array.isArray(providerList) ? providerList : [];
          const primaryProvider = providersByBlueprintId[template.blueprintId][0];
          const primaryProviderId = Number(primaryProvider?.id || primaryProvider?.print_provider_id);
          if (primaryProviderId) {
            const variantData = await fetchPrintifyBlueprintVariants(apiKey, template.blueprintId, primaryProviderId);
            const rawVariants = normalizePrintifyList(variantData, ['variants']);

            // Option enrichment from the variants endpoint — this is the correct source
            const optionValueMap = buildOptionValueMap(variantData);

            // Image mapping + print areas come from the blueprint detail endpoint,
            // NOT the variants endpoint. Wrapped in try/catch so enrichment succeeds
            // even if this optional fetch fails.
            const variantImageMap = new Map<number, string>();
            try {
              const blueprintDetail = await fetchPrintifyBlueprintDetail(apiKey, template.blueprintId);

              // Issue 1 fix: build image map from blueprintDetail.images[].variant_ids
              const detailImages = Array.isArray(blueprintDetail?.images) ? blueprintDetail.images : [];
              for (const img of detailImages) {
                const imgSrc = typeof img === 'string' ? img : (img?.src || img?.url || img?.preview_url || '');
                const imgVariantIds = Array.isArray(img?.variant_ids) ? img.variant_ids : [];
                if (imgSrc && imgVariantIds.length > 0) {
                  for (const vid of imgVariantIds) {
                    const numVid = Number(vid);
                    if (numVid > 0 && !variantImageMap.has(numVid)) {
                      variantImageMap.set(numVid, imgSrc);
                    }
                  }
                }
              }

              // Issue 2 fix: extract print areas from blueprint detail if available
              const detailPrintAreas = Array.isArray(blueprintDetail?.print_areas)
                ? blueprintDetail.print_areas
                : [];
              if (detailPrintAreas.length > 0) {
                printAreasByBlueprintId[template.blueprintId] = detailPrintAreas;
              }
            } catch {
              // Image mapping is optional — enrichment succeeds regardless
              setSyncLogs(prev => [...prev, `[INFO] Mockup image mapping skipped for ${template.title} — will use blueprint images instead.`]);
            }

            const enrichedVariants = rawVariants.map((v: any) => {
              const resolved = resolveVariantOptions(v, optionValueMap, variantData);
              const variantId = Number(v?.id || v?.variant_id || 0);
              const imageUrl = variantImageMap.get(variantId);
              return { ...resolved, ...(imageUrl ? { image_url: imageUrl } : {}), _enriched: optionValueMap.size > 0 };
            });

            setSyncLogs(prev => [
              ...prev,
              `[SUCCESS] Enriched ${enrichedVariants.length} variants for ${template.title} (${variantImageMap.size} image mappings).`,
            ]);

            variantsByBlueprintId[template.blueprintId] = enrichedVariants;
          }
        } catch (providerError: any) {
          providersByBlueprintId[template.blueprintId] = [];
          variantsByBlueprintId[template.blueprintId] = [];
          setSyncLogs(prev => [...prev, `[WARNING] Provider lookup skipped for ${template.title}: ${providerError.message || providerError}`]);
        }
      }

      const templatesWithProviders = mergeProvidersIntoTemplates(templates, providersByBlueprintId).map((template) => {
        const variants = variantsByBlueprintId[template.blueprintId] || template.variants;
        const printAreas = printAreasByBlueprintId[template.blueprintId] || template.printAreas || [];
        // Derive baseCost from the cheapest enabled variant's cost (Printify returns costs in cents)
        const enabledVariantCosts = variants
          .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
          .map((v: any) => Number(v?.cost ?? v?.price ?? 0))
          .filter((c: number) => c > 0);
        const cheapestCostCents = enabledVariantCosts.length > 0 ? Math.min(...enabledVariantCosts) : 0;
        return {
          ...template,
          variants,
          printAreas,
          baseCost: cheapestCostCents > 0 ? Number((cheapestCostCents / 100).toFixed(2)) : template.baseCost ?? undefined,
        };
      });
      const variantReadyCount = templatesWithProviders.filter((template) => template.variants.length > 0).length;
      await upsertPrintifyCatalogTemplates(templatesWithProviders, { replaceVisible: false });

      handleUpdate({
        sync: {
          ...printifySettings.sync,
          lastSyncAt: new Date().toLocaleString(),
          lastSyncStatus: 'success'
        }
      });

      setSyncLogs(prev => [
        ...prev,
        `[SUCCESS] Cached ${templatesWithProviders.length} customer template records.`,
        `[SUCCESS] ${variantReadyCount} templates have variant metadata ready for checkout.`,
        `[INFO] Editor-ready provider and variant metadata included for ${providerLimit} selected templates.`
      ]);
    } catch (err: any) {
      console.error('Printify template sync failed:', err);
      handleUpdate({
        sync: {
          ...printifySettings.sync,
          lastSyncAt: new Date().toLocaleString(),
          lastSyncStatus: 'failed'
        }
      });
      setSyncLogs(prev => [
        ...prev,
        `[ERROR] Template sync failed: ${err.message || err}`,
        String(err.message || err).includes('quota')
          ? '[TIP] Browser storage was full. The system now keeps a compact template cache; run Template Sync again after this update deploys.'
          : '[TIP] Confirm the PAT includes catalog.read and print_providers.read scopes.'
      ]);
    } finally {
      setSyncingTemplates(false);
    }
  };

  const customPrintOrders = orders.filter((order) => (
    order.printifySyncStatus && order.printifySyncStatus !== 'NOT_REQUIRED'
  ));

  const handlePrintifyOrderRetry = async (orderId: string) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) {
      return;
    }

    setSubmittingOrderId(orderId);
    try {
      const response = await submitPrintifyOrder(printifySettings.providerSettings.shopId, order, privateApiKey);
      updateOrderPrintifySync(order.id, {
        printifySyncStatus: 'SYNCED',
        printifyOrderId: response?.id || response?.data?.id || null,
        printifyErrorLog: null,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Printify order submission failed.';
      updateOrderPrintifySync(order.id, {
        printifySyncStatus: 'FAILED',
        printifyOrderId: order.printifyOrderId || null,
        printifyErrorLog: errorMessage,
      });
      alert(errorMessage);
    } finally {
      setSubmittingOrderId('');
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 md:pb-6 border-b border-gray-100 px-3 md:px-0 gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight">Printify Integration</h1>
          <p className="text-[8px] md:text-xs text-gray-500 uppercase font-bold opacity-60">Manage your print-on-demand setups, customizer configurations, and order pipelines.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border">
            <span className="text-[10px] font-black uppercase text-gray-400">Printify Mode</span>
            <Switch 
              checked={printifySettings.enabled}
              onCheckedChange={(checked) => handleUpdate({ enabled: checked })}
            />
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-2xl h-10 px-4 uppercase font-black tracking-wider text-[10px] bg-black text-white hover:bg-neutral-800"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {!printifySettings.enabled ? (
        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white flex flex-col items-center justify-center text-center min-h-[300px]">
          <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
          <h2 className="text-base font-bold uppercase tracking-tight">Printify Integration is Disabled</h2>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Toggle the Switch at the top right to activate Printify settings. Your existing customer storefront displays will remain unaffected.
          </p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-100 p-1 rounded-2xl w-full flex overflow-x-auto justify-start md:justify-center border">
            <TabsTrigger value="apis" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-2 py-2.5 md:py-2 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-wider min-h-[48px] md:min-h-0">
              <Key className="h-4 w-4 md:h-3.5 md:w-3.5 mb-0.5 md:mb-0 md:mr-2" />
              <span className="hidden md:inline">APIs</span>
              <span className="md:hidden">APIs</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-2 py-2.5 md:py-2 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-wider min-h-[48px] md:min-h-0">
              <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 mb-0.5 md:mb-0 md:mr-2" />
              <span className="hidden md:inline">Editor</span>
              <span className="md:hidden">Editor</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-2 py-2.5 md:py-2 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-wider min-h-[48px] md:min-h-0">
              <Eye className="h-4 w-4 md:h-3.5 md:w-3.5 mb-0.5 md:mb-0 md:mr-2" />
              <span className="hidden md:inline">Live Preview</span>
              <span className="md:hidden">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-2 py-2.5 md:py-2 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-wider min-h-[48px] md:min-h-0">
              <RefreshCw className="h-4 w-4 md:h-3.5 md:w-3.5 mb-0.5 md:mb-0 md:mr-2" />
              <span className="hidden md:inline">Product Sync</span>
              <span className="md:hidden">Sync</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 flex flex-col md:flex-row items-center justify-center rounded-xl font-black px-2 py-2.5 md:py-2 text-[7px] md:text-xs uppercase tracking-tighter md:tracking-wider min-h-[48px] md:min-h-0">
              <ShoppingCart className="h-4 w-4 md:h-3.5 md:w-3.5 mb-0.5 md:mb-0 md:mr-2" />
              <span className="hidden md:inline">Orders</span>
              <span className="md:hidden">Orders</span>
            </TabsTrigger>

          </TabsList>

          {/* APIs Tab */}
          <TabsContent value="apis" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">API Configuration</CardTitle>
                </div>
                <CardDescription className="text-xs">Provide credentials to securely connect your store to Printify.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                {/* API Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">One Token, Full Access</p>
                    <p>Printify uses a single Personal Access Token (PAT) that grants access to <strong>all</strong> API endpoints — Catalog, Uploads, Products, Orders, Shops, and Webhooks. You do not need separate keys for each service.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-700 leading-relaxed">
                    <p className="font-bold mb-1">Private Credential Storage</p>
                    <p>Your Printify PAT and AI preview key are saved separately from public storefront settings. Customers can see catalog data, but they cannot read these private credentials.</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Printify API Access Token</Label>
                  <div className="relative">
                    <Input 
                      type="password"
                      value={privateApiKey}
                      onChange={(e) => setPrivateApiKey(e.target.value)}
                      placeholder="Enter your personal access token (e.g. pr_...)"
                      className="rounded-xl h-11 text-sm font-mono border-gray-200 pr-10"
                    />
                    {testingConnection && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Printify Shop ID</Label>
                  <Input 
                    value={printifySettings.providerSettings.shopId}
                    onChange={(e) => handleUpdate({
                      providerSettings: { ...printifySettings.providerSettings, shopId: e.target.value.trim() }
                    })}
                    placeholder="Enter your Printify Shop ID"
                    className={`rounded-xl h-11 text-sm border-gray-200 ${printifySettings.providerSettings.shopId && !/^\d+$/.test(printifySettings.providerSettings.shopId) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {printifySettings.providerSettings.shopId && !/^\d+$/.test(printifySettings.providerSettings.shopId) && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider pl-1">
                      Shop ID must be numeric (e.g. 123456). E-mail address is not a valid Shop ID.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    type="button" 
                    onClick={testConnection}
                    disabled={testingConnection}
                    className="rounded-2xl h-11 px-5 uppercase font-black text-[10px] bg-black text-white hover:bg-neutral-800"
                  >
                    {testingConnection && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                    Verify Token & Auto-Detect Shop ID
                  </Button>
                  
                  {connectionStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                      <CheckCircle2 className="h-4 w-4" /> Connected & Shop Loaded!
                    </div>
                  )}
                  {connectionStatus === 'failed' && (
                    <div className="flex items-start gap-2 text-red-600 text-xs font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        Connection Failed.
                        {connectionError ? <span className="block font-mono text-[10px] normal-case mt-0.5">{connectionError}</span> : ' Check token.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Webhook & Setup instructions (rendered once token is valid/configured) */}
                {connectionStatus === 'success' && (
                  <div className="pt-5 border-t space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-gray-700">Webhook Connection Setup</h4>
                    </div>

                    <div className="grid gap-2 bg-gray-50 p-4 rounded-2xl border">
                      <Label className="text-[10px] font-black uppercase text-gray-400">Generated Webhook Endpoint URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          readOnly
                          id="printify-webhook-url-api-tab"
                          value={`${window.location.origin}/api/printify/webhook`}
                          className="rounded-xl h-10 text-xs font-mono border-gray-200 bg-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const inputEl = document.getElementById('printify-webhook-url-api-tab') as HTMLInputElement;
                            if (inputEl) {
                              inputEl.select();
                              navigator.clipboard.writeText(inputEl.value);
                              alert('Webhook URL copied to clipboard!');
                            }
                          }}
                          className="rounded-xl h-10 px-3 text-[10px] font-black uppercase border-gray-200 bg-white"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-2">
                      <h5 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Setup Instructions in Printify:</h5>
                      <ol className="list-decimal pl-4 text-[10px] text-amber-700 space-y-1.5 leading-relaxed">
                        <li>Log in to your <strong>Printify Account</strong>.</li>
                        <li>Navigate to <strong>Settings → Connections</strong>.</li>
                        <li>Find the <strong>Webhooks</strong> section (or Developer Keys).</li>
                        <li>Click <strong>Add Webhook</strong> or create a new webhook endpoint.</li>
                        <li>Paste the <strong>Endpoint URL</strong> generated above.</li>
                        <li>Select events to subscribe to (we recommend <code>order.created</code>, <code>order.updated</code>, <code>order.shipped</code>).</li>
                        <li>Save the webhook configuration. Printify will now auto-sync order milestones instantly!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* API Endpoints Reference */}
                <div className="pt-4 border-t">
                  <h4 className="font-black text-xs uppercase tracking-wider text-gray-500 pl-1 mb-3">Endpoints Covered by Your Token</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { name: 'Catalog API', desc: 'Products, colors, sizes, print areas' },
                      { name: 'Upload API', desc: 'Customer design uploads' },
                      { name: 'Product API', desc: 'Create printable products' },
                      { name: 'Order API', desc: 'Send orders to Printify' },
                      { name: 'Shops API', desc: 'Store setup & management' },
                      { name: 'Webhooks', desc: 'Order status updates' },
                    ].map((ep) => (
                      <div key={ep.name} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-700">{ep.name}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5 leading-snug">{ep.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Customizer Editor</CardTitle>
                </div>
                <CardDescription className="text-xs">Choose and enable the editing interface available to customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DevsFolk Editor Card */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.editor.selected === 'devsfolk' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">DevsFolk Customizer</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Built-in HTML5 Canvas Editor</p>
                      </div>
                      <Switch 
                        checked={printifySettings.editor.devsfolkEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          editor: { ...printifySettings.editor, devsfolkEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Our custom editor allows clients to upload images, write custom text, choose fonts, and resize elements directly.
                    </p>
                    <Button 
                      variant={printifySettings.editor.selected === 'devsfolk' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ editor: { ...printifySettings.editor, selected: 'devsfolk' } })}
                      disabled={!printifySettings.editor.devsfolkEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.editor.selected === 'devsfolk' ? 'Selected Editor' : 'Select DevsFolk Editor'}
                    </Button>
                  </div>

                  {/* Alternative Editor Card */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.editor.selected === 'alternative' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">Alternative Customizer</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Secondary Editor Frame</p>
                      </div>
                      <Switch 
                        checked={printifySettings.editor.alternativeEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          editor: { ...printifySettings.editor, alternativeEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Activate a simplified, third-party, or alternative overlay customizer interface for special configurations.
                    </p>
                    <Button 
                      variant={printifySettings.editor.selected === 'alternative' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ editor: { ...printifySettings.editor, selected: 'alternative' } })}
                      disabled={!printifySettings.editor.alternativeEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.editor.selected === 'alternative' ? 'Selected Editor' : 'Select Alternative Editor'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Template Estimate Pricing</CardTitle>
                </div>
                <CardDescription className="text-xs">Control estimated customer-facing prices for raw editor templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Display Markup % (Editor Prices)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={printifySettings.charges.displayMarkupPercent ?? printifySettings.charges.profitMarginPercent ?? 40}
                      onChange={(event) => handleUpdate({
                        charges: {
                          ...printifySettings.charges,
                          displayMarkupPercent: Math.max(0, Number(event.target.value) || 0),
                          profitMarginPercent: Math.max(0, Number(event.target.value) || 0) // Keep legacy field synced
                        }
                      })}
                      className="rounded-xl h-11 text-xs border-gray-200"
                    />
                    <p className="text-[9px] text-gray-400 pl-1">Applied to Printify base prices when showing templates in the editor. Example: If base price is $10 and markup is 40%, customer sees $14.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Order Markup % (Final Checkout)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={printifySettings.charges.orderMarkupPercent ?? printifySettings.charges.profitMarginPercent ?? 40}
                      onChange={(event) => handleUpdate({
                        charges: {
                          ...printifySettings.charges,
                          orderMarkupPercent: Math.max(0, Number(event.target.value) || 0)
                        }
                      })}
                      className="rounded-xl h-11 text-xs border-gray-200"
                    />
                    <p className="text-[9px] text-gray-400 pl-1">Applied to actual Printify fulfillment cost after order is placed. Example: If Printify charges $12 for production and markup is 50%, final price is $18.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Estimated Design Fee</Label>
                    <Input
                      type="number"
                      min="0"
                      value={printifySettings.charges.designFee}
                      onChange={(event) => handleUpdate({
                        charges: {
                          ...printifySettings.charges,
                          designFee: Math.max(0, Number(event.target.value) || 0)
                        }
                      })}
                      className="rounded-xl h-11 text-xs border-gray-200"
                    />
                    <p className="text-[9px] text-gray-400 pl-1">Shown in the editor estimate when a customer customizes a template.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Estimated Edit Fee</Label>
                    <Input
                      type="number"
                      min="0"
                      value={printifySettings.charges.editFee}
                      onChange={(event) => handleUpdate({
                        charges: {
                          ...printifySettings.charges,
                          editFee: Math.max(0, Number(event.target.value) || 0)
                        }
                      })}
                      className="rounded-xl h-11 text-xs border-gray-200"
                    />
                    <p className="text-[9px] text-gray-400 pl-1">Reserved for future customer edit/revision flows.</p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-blue-50 border-blue-100 p-4 text-[11px] text-blue-700 leading-relaxed">
                  <p className="font-bold mb-1">Estimate Formula</p>
                  <p>Raw template estimate = Printify base/catalog price + template estimate margin. Customized estimate = template estimate + design fee. Existing Printify shop products keep their Printify retail price.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Preview Tab */}
          <TabsContent value="preview" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Live Preview</CardTitle>
                </div>
                <CardDescription className="text-xs">Control how visual mockups are rendered for customer verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: DevsFolk Preview */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.preview.selected === 'devsfolk' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">DevsFolk Live Preview</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Browser-based 2D overlay</p>
                      </div>
                      <Switch 
                        checked={printifySettings.preview.devsfolkEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          preview: { ...printifySettings.preview, devsfolkEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Super fast and completely cost-free. Mockup overlay is generated client-side directly on the user's device.
                    </p>
                    <Button 
                      variant={printifySettings.preview.selected === 'devsfolk' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ preview: { ...printifySettings.preview, selected: 'devsfolk' } })}
                      disabled={!printifySettings.preview.devsfolkEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.preview.selected === 'devsfolk' ? 'Active Renderer' : 'Select DevsFolk Preview'}
                    </Button>
                  </div>

                  {/* Option 2: AI Preview */}
                  <div className={`p-5 rounded-3xl border-2 text-left transition-all ${printifySettings.preview.selected === 'ai' ? 'border-black bg-neutral-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-black uppercase text-sm leading-tight">AI Live Preview</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">AI-generated realistic layouts</p>
                      </div>
                      <Switch 
                        checked={printifySettings.preview.aiEnabled}
                        onCheckedChange={(checked) => handleUpdate({
                          preview: { ...printifySettings.preview, aiEnabled: checked }
                        })}
                      />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                      Sends design models through an AI pipeline to output premium, ultra-realistic product display visuals.
                    </p>
                    <Button 
                      variant={printifySettings.preview.selected === 'ai' ? 'default' : 'outline'}
                      onClick={() => handleUpdate({ preview: { ...printifySettings.preview, selected: 'ai' } })}
                      disabled={!printifySettings.preview.aiEnabled}
                      className="w-full rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      {printifySettings.preview.selected === 'ai' ? 'Active Renderer' : 'Select AI Preview'}
                    </Button>
                  </div>
                </div>

                {printifySettings.preview.aiEnabled && printifySettings.preview.selected === 'ai' && (
                  <div className="p-5 bg-gray-50 border rounded-3xl space-y-5 animate-in slide-in-from-top-4 duration-300">
                    <h4 className="font-black text-xs uppercase tracking-wider text-gray-500 pl-1">AI Pipeline Configurations</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">AI Provider</Label>
                        <Select 
                          value={printifySettings.preview.aiConfig.provider} 
                          onValueChange={(val) => handleUpdate({
                            preview: {
                              ...printifySettings.preview,
                              aiConfig: { ...printifySettings.preview.aiConfig, provider: val as any }
                            }
                          })}
                        >
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini">Google Gemini 2.5 Flash</SelectItem>
                            <SelectItem value="openai">OpenAI DALL-E 3</SelectItem>
                            <SelectItem value="qwen">Alibaba Qwen (Free tier / Open-source)</SelectItem>
                            <SelectItem value="anthropic">Anthropic Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="deepseek">DeepSeek-V3 / DeepSeek-R1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[9px] uppercase text-gray-400 pl-1">Max Preview Images per Product (1–5)</Label>
                        <Select 
                          value={printifySettings.preview.aiConfig.maxPreviewImages.toString()} 
                          onValueChange={(val) => handleUpdate({
                            preview: {
                              ...printifySettings.preview,
                              aiConfig: { ...printifySettings.preview.aiConfig, maxPreviewImages: parseInt(val) }
                            }
                          })}
                        >
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((val) => (
                              <SelectItem key={val} value={val.toString()}>
                                {val} {val === 1 ? 'Image' : 'Images'}
                                {val === 1 && ' (front + back combined)'}
                                {val === 2 && ' (front & back separate)'}
                                {val >= 3 && ' (+ additional angles)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-[9px] uppercase text-gray-400 pl-1">AI Provider API Secret Key</Label>
                      <Input 
                        type="password"
                        value={privateAiApiKey}
                        onChange={(e) => setPrivateAiApiKey(e.target.value.trim())}
                        placeholder="Paste your AI provider secret token..."
                        className="rounded-xl h-10 text-xs font-mono border-gray-200"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 pl-1">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <Label className="text-[9px] uppercase text-gray-400">Pipeline Prompt (AI Generation Instructions)</Label>
                      </div>
                      <Textarea
                        value={printifySettings.preview.aiConfig.pipelinePrompt}
                        onChange={(e) => handleUpdate({
                          preview: {
                            ...printifySettings.preview,
                            aiConfig: { ...printifySettings.preview.aiConfig, pipelinePrompt: e.target.value }
                          }
                        })}
                        placeholder="e.g. Generate a photorealistic product mockup with soft studio lighting, neutral background, slight shadow beneath the product..."
                        className="rounded-2xl min-h-[100px] text-xs border-gray-200 leading-relaxed"
                      />
                      <p className="text-[9px] text-gray-500 italic pl-1">
                        Customize background style, lighting, camera angle, product presentation, and any other visual details for AI-generated previews.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Sync Tab */}
          <TabsContent value="sync" className="space-y-6 animate-in fade-in duration-200 outline-none">
            {/* Sync Mode Settings */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Sync Strategy</CardTitle>
                </div>
                <CardDescription className="text-xs">Choose how product data stays in sync between Printify and your store.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'webhook', label: 'Real-time (Webhook)', desc: 'Syncs instantly when Printify products change.', icon: Zap },
                    { id: 'scheduled', label: 'Scheduled', desc: 'Automatic daily, weekly, or hourly sync.', icon: Clock },
                    { id: 'manual', label: 'Manual Only', desc: 'You decide when to pull latest catalog data.', icon: Play },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleUpdate({
                        sync: { ...printifySettings.sync, mode: mode.id as 'manual' | 'scheduled' | 'webhook' }
                      })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        printifySettings.sync?.mode === mode.id 
                          ? 'border-black bg-neutral-50' 
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <mode.icon className={`h-5 w-5 mb-2 ${printifySettings.sync?.mode === mode.id ? 'text-black' : 'text-gray-400'}`} />
                      <h4 className="font-bold text-xs uppercase tracking-tight">{mode.label}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">{mode.desc}</p>
                    </button>
                  ))}
                </div>

                {printifySettings.sync?.mode === 'scheduled' && (
                  <div className="p-4 bg-gray-50 border rounded-2xl space-y-3 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Schedule Interval</Label>
                    <Select
                      value={printifySettings.sync?.scheduleInterval || 'daily'}
                      onValueChange={(val) => handleUpdate({
                        sync: { ...printifySettings.sync, scheduleInterval: val as 'daily' | 'weekly' | 'hourly' }
                      })}
                    >
                      <SelectTrigger className="rounded-xl h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Once a Day</SelectItem>
                        <SelectItem value="weekly">Once a Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {printifySettings.sync?.mode === 'webhook' && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl animate-in fade-in duration-200">
                    <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-700 leading-relaxed">
                      <p className="font-bold mb-1">Webhook Sync Active</p>
                      <p>Configure your Printify webhook to send product update events to your store. Products, pricing, variants, and availability will update in real-time when they change in Printify.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Raw Template Catalog */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Raw Template Catalog</CardTitle>
                </div>
                <CardDescription className="text-xs">Cache blank Printify templates for the customer editor product picker.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="bg-neutral-50 border p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600">Sync Blank Templates</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal max-w-lg">
                      Fetches selected Printify blueprints such as T-shirts, hoodies, mugs, posters, and other POD blanks. Only synced templates become available in the storefront editor.
                    </p>
                  </div>
                  <Button
                    onClick={runTemplateCatalogSync}
                    disabled={syncingTemplates || deletingTemplates}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 self-stretch md:self-auto shrink-0"
                  >
                    {syncingTemplates ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                    Sync Templates
                  </Button>
                  <Button
                    onClick={deleteAllRawTemplates}
                    disabled={syncingTemplates || deletingTemplates}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-red-600 text-white hover:bg-red-700 self-stretch md:self-auto shrink-0"
                  >
                    {deletingTemplates ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
                    Delete All Templates
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Template Search Filter</Label>
                    <Input
                      value={templateSyncSearch}
                      onChange={(event) => setTemplateSyncSearch(event.target.value)}
                      placeholder="Optional: t-shirt, hoodie, mug, poster..."
                      className="rounded-xl h-11 text-xs border-gray-200"
                    />
                    <p className="text-[9px] text-gray-400 pl-1">
                      Leave empty to sync from the full Printify template catalog.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">Maximum Templates to Publish</Label>
                    <Select value={templateSyncLimit} onValueChange={setTemplateSyncLimit}>
                      <SelectTrigger className="rounded-xl h-11 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 template</SelectItem>
                        <SelectItem value="2">2 templates</SelectItem>
                        <SelectItem value="3">3 templates</SelectItem>
                        <SelectItem value="4">4 templates</SelectItem>
                        <SelectItem value="5">5 templates</SelectItem>
                        <SelectItem value="10">10 templates</SelectItem>
                        <SelectItem value="25">25 templates</SelectItem>
                        <SelectItem value="50">50 templates</SelectItem>
                        <SelectItem value="100">100 templates</SelectItem>
                        <SelectItem value="250">250 templates</SelectItem>
                        <SelectItem value="custom">Custom quantity</SelectItem>
                        <SelectItem value="all">All matching templates</SelectItem>
                      </SelectContent>
                    </Select>
                    {templateSyncLimit === 'custom' && (
                      <div className="mt-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Enter quantity (e.g., 1, 2, 3...)"
                          value={customSyncQuantity}
                          onChange={(e) => setCustomSyncQuantity(e.target.value)}
                          className="rounded-xl h-11 text-xs"
                        />
                      </div>
                    )}
                    <p className="text-[9px] text-gray-400 pl-1">
                      Recommended: start with 50–100 to keep the editor clean.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Cached Templates</p>
                    <p className="text-xs font-bold mt-1">{printifyCatalog.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Enabled Templates</p>
                    <p className="text-xs font-bold mt-1">{printifyCatalog.filter((template) => template.isEnabled).length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Editor-Ready</p>
                    <p className="text-xs font-bold mt-1">{printifyCatalog.filter((template) => template.providers.length > 0).length}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">Template Readiness</p>
                    <p>Cached templates are lightweight blueprints. Editor-ready templates also include provider metadata, which is needed before customers can choose fulfillment options, variants, and print areas.</p>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Synced Editor Templates */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6 pb-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Synced Editor Templates</CardTitle>
                  <CardDescription className="text-xs">Manage individual cached templates available in the customizer editor.</CardDescription>
                </div>
                <span className="px-3 py-1 bg-neutral-100 text-neutral-800 text-[10px] font-black uppercase rounded-full shrink-0">
                  {printifyCatalog.length} Total
                </span>
              </CardHeader>
              <CardContent className="p-5 md:p-6">
                {printifyCatalog.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 border border-dashed rounded-2xl">
                    No templates synced yet. Click "Sync Templates" above to populate.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {printifyCatalog.map((template) => (
                      <div key={template.id} className="p-4 rounded-2xl border bg-white flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-14 w-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border flex items-center justify-center">
                            {template.images && template.images[0] ? (
                              <img src={template.images[0]} alt={template.title} className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight truncate" title={template.title}>{template.title}</p>
                            <p className="text-[10px] text-gray-400 truncate">Blueprint: {template.blueprintId}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide truncate mt-0.5">{template.brand || 'Printify'} • {template.model || 'Generic'}</p>
                            {(!template.baseCost || template.baseCost === 0 || !Array.isArray(template.variants) || template.variants.length === 0 || template.variants.some((v: any) => v._enriched === false)) && (
                              <p className="text-[9px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {template.variants?.some((v: any) => v._enriched === false)
                                  ? 'Resync Required (Variants not enriched)'
                                  : 'Resync Required (Incomplete data)'}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete the template "${template.title}"?`)) {
                              try {
                                await deletePrintifyCatalogTemplate(template.id);
                              } catch (err: any) {
                                alert(`Failed to delete template: ${err.message || err}`);
                              }
                            }
                          }}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Sync + Logs */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Shop Product Sync</CardTitle>
                </div>
                <CardDescription className="text-xs">Force an immediate refresh of products already created in the connected Printify shop.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                <div className="bg-gray-50 border p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600">Sync Published Shop Products</h4>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal max-w-lg">
                      Imports products the admin already created inside Printify. Raw customer-customizable templates are handled separately above.
                    </p>
                  </div>
                  <Button 
                    onClick={runManualSync}
                    disabled={syncingProducts}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 self-stretch md:self-auto shrink-0"
                  >
                    {syncingProducts ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                    Sync Catalog now
                  </Button>
                </div>

                {/* Sync Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Last Sync</p>
                    <p className="text-xs font-bold mt-1">{printifySettings.sync?.lastSyncAt || 'Never'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Status</p>
                    <p className="text-xs font-bold mt-1 capitalize">{printifySettings.sync?.lastSyncStatus || 'Pending'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border">
                    <p className="text-[9px] font-black uppercase text-gray-400">Sync Mode</p>
                    <p className="text-xs font-bold mt-1 capitalize">{printifySettings.sync?.mode || 'Scheduled'}</p>
                  </div>
                </div>

                {syncLogs.length > 0 && (
                  <div className="rounded-2xl bg-neutral-900 p-4 font-mono text-[10px] text-green-400 space-y-1.5 h-44 overflow-y-auto border border-neutral-800">
                    <p className="text-gray-500 mb-2">// Console Output logs</p>
                    {syncLogs.map((log, idx) => (
                      <p key={idx}>{log}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 animate-in fade-in duration-200 outline-none">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Printify Order Logs</CardTitle>
                </div>
                <CardDescription className="text-xs">Monitor the automated print fulfillment status of custom-designed orders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5 md:p-6 pt-0">
                {/* Orders Explanation */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">How Printify Orders Work</p>
                    <p>When a customer places an order that includes a customized product, the order appears in <strong>both</strong> the main Orders page and here. This section shows the Printify-specific fulfillment tracking — whether the order was successfully forwarded to Printify, its print status, shipping progress, and any errors. Regular (non-customized) orders only appear in the main Orders page.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400">
                        <th className="pb-3 pl-2">Order ID</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Total</th>
                        <th className="pb-3 text-center">Fulfillment Status</th>
                        <th className="pb-3">Printify ID</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customPrintOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-gray-400">No customizer orders recorded yet.</td>
                        </tr>
                      ) : (
                        customPrintOrders.map((ord) => (
                          <tr key={ord.id} className="text-xs">
                            <td className="py-4 pl-2 font-mono font-bold">#{ord.id.slice(0, 8)}</td>
                            <td className="py-4 font-bold">{ord.customerName}</td>
                            <td className="py-4 font-mono font-bold">${ord.total.toFixed(2)}</td>
                            <td className="py-4">
                              <div className="flex justify-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                  ord.printifySyncStatus === 'SYNCED' 
                                    ? 'bg-green-50 text-green-700 border border-green-100' 
                                    : (ord.printifySyncStatus === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100')
                                }`}>
                                  {ord.printifySyncStatus}
                                </span>
                              </div>
                              {ord.printifySyncStatus === 'FAILED' && (
                                <p className="text-[9px] text-red-500 mt-1 pl-2 text-center max-w-[200px] truncate" title={ord.printifyErrorLog || undefined}>{ord.printifyErrorLog}</p>
                              )}
                            </td>
                            <td className="py-4 font-mono text-gray-500">{ord.printifyOrderId || 'N/A'}</td>
                            <td className="py-4 text-right">
                              <Button 
                                variant="outline" 
                                className="rounded-lg h-8 px-3 text-[9px] font-black uppercase tracking-wider"
                                disabled={submittingOrderId === ord.id || !printifySettings.providerSettings.shopId}
                                onClick={() => handlePrintifyOrderRetry(ord.id)}
                              >
                                {submittingOrderId === ord.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Push / Retry
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      )}
    </div>
  );
};
