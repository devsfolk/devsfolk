import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Key, Eye, Edit, RefreshCw, ShoppingCart, Link, AlertCircle, Save, CheckCircle2, Loader2, Play, Clock, Zap, Info, FileText, Trash2, Plus, Layers } from 'lucide-react';
import { loadPrintifyCredentials, savePrintifyCredentials } from '@/lib/printifyCredentials';
import { fetchPrintifyBlueprintDetail, fetchPrintifyBlueprintProviders, fetchPrintifyBlueprintShipping, fetchPrintifyBlueprintVariants, fetchPrintifyBlueprints, fetchPrintifyShopProduct, fetchPrintifyShopProducts, fetchPrintifyShops, mapBlueprintsToTemplates, mergeProvidersIntoTemplates, submitPrintifyOrder } from '@/lib/printifyApi';
import { PrintifyCatalogTemplate } from '@/types';
import {
  enrichVariants,
  isVariantEnriched,
  templateVariantsNeedResync,
} from '@/lib/printifyVariantEnrichment';
import { TemplateImageGallery } from '@/components/printify/TemplateImageGallery';
import { TemplateVariantsTable } from '@/components/printify/TemplateVariantsTable';
import { TemplatePrintAreas } from '@/components/printify/TemplatePrintAreas';
import { TemplatePricingPanel } from '@/components/printify/TemplatePricingPanel';
import { TemplateEditor } from '@/components/printify/TemplateEditor';
import { isRawPrintifyTemplateProduct } from '@/lib/printifyProductGuards';
export const PrintifySettings: React.FC = () => {
  const { settings, updateSettings, orders, printifyCatalog, upsertPrintifyCatalogTemplates, updatePrintifyCatalogTemplate, upsertPrintifyShopProducts, updateOrderPrintifySync, deleteProduct, products, deletePrintifyCatalogTemplate, clearPrintifyCatalog } = useShop();
  
  const printifySettings = settings.printifySettings || {
    enabled: false,
    providerSettings: { apiKey: '', shopId: '' },
    editor: { selected: 'devsfolk', devsfolkEnabled: true, alternativeEnabled: false },
    preview: { selected: 'devsfolk', devsfolkEnabled: true, aiEnabled: false, aiConfig: { provider: 'gemini', apiKey: '', maxPreviewImages: 2, pipelinePrompt: '' } },
    charges: { designFee: 0, editFee: 0, templateBasePrice: 14.99, sizeFees: {}, placementFees: {} },
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
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templateDraft, setTemplateDraft] = useState<PrintifyCatalogTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('overview');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrintifyCatalogTemplate | null>(null);

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

  const normalizeTemplateImage = (image: any) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.src || image.url || image.preview_url || '';
  };

  const toDollars = (value: unknown) => {
    const amount = Number(value ?? 0);
    if (!amount) return 0;
    return amount < 100 && !Number.isInteger(amount) ? amount : amount / 100;
  };

  const getVariantId = (variant: any) => String(variant?.id || variant?.variant_id || variant?.printify_variant_id || '');

  const getVariantLabel = (variant: any) => {
    if (variant?.title || variant?.name) return String(variant.title || variant.name);
    const optionTitles = Array.isArray(variant?.options)
      ? variant.options.map((option: any) => option?.title || option?.name || option).filter(Boolean).join(' / ')
      : '';
    return optionTitles || `Variant ${getVariantId(variant)}`;
  };

  const getVariantCostDollars = (variant: any) => toDollars(variant?.cost ?? variant?.price ?? 0);

  const getVariantRetailDollars = (variant: any) => toDollars(variant?.retail_price ?? variant?.price ?? 0);

  const extractOptionTitles = (variants: any[], optionType: 'color' | 'size') => {
    const values = new Set<string>();
    variants.forEach((variant) => {
      (Array.isArray(variant?.options) ? variant.options : []).forEach((option: any) => {
        const name = String(option?.name || '').toLowerCase();
        const title = String(option?.title || '').trim();
        if (title && (name.includes(optionType) || (optionType === 'color' && name.includes('colour')))) {
          values.add(title);
        }
      });
    });
    return Array.from(values);
  };

  const extractOptionHexes = (variants: any[]) => {
    const values: Record<string, string> = {};
    variants.forEach((variant) => {
      (Array.isArray(variant?.options) ? variant.options : []).forEach((option: any) => {
        const name = String(option?.name || '').toLowerCase();
        const title = String(option?.title || '').trim();
        const hex = String(option?.hex || option?.color || option?.colors?.[0] || '').trim();
        if (title && hex && (name.includes('color') || name.includes('colour'))) {
          values[title] = hex;
        }
      });
    });
    return values;
  };

  const normalizeShopProductList = (payload: any) => normalizePrintifyList(payload, ['products']);

  const getProductImages = (product: any) => {
    const images = [
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(Array.isArray(product?.mockups) ? product.mockups : []),
    ];
    return images
      .map((image: any) => normalizeTemplateImage(image))
      .filter(Boolean);
  };

  const mapShopProductsByBlueprint = (shopProducts: any[]) => {
    const byBlueprintId = new Map<number, any>();
    shopProducts.forEach((product) => {
      const blueprintId = Number(product?.blueprint_id || product?.blueprintId);
      if (blueprintId && !byBlueprintId.has(blueprintId)) {
        byBlueprintId.set(blueprintId, product);
      }
    });
    return byBlueprintId;
  };

  const buildSyncedTemplate = async (
    apiKey: string,
    template: PrintifyCatalogTemplate,
    shopProductsByBlueprintId?: Map<number, any>,
  ): Promise<PrintifyCatalogTemplate> => {
    const shopId = printifySettings.providerSettings.shopId?.trim();
    const matchedShopProduct = shopProductsByBlueprintId?.get(template.blueprintId);
    let shopProductDetail = matchedShopProduct;

    // Fetch full shop product detail if available (includes variants, images, pricing)
    if (shopId && matchedShopProduct?.id) {
      try {
        shopProductDetail = await fetchPrintifyShopProduct(apiKey, shopId, String(matchedShopProduct.id));
      } catch (err: any) {
        setSyncLogs(prev => [...prev, `[INFO] Shop product detail skipped for ${template.title}: ${err.message || err}`]);
      }
    }

    // Fetch blueprint detail for option definitions and base imagery
    const blueprintDetail = await fetchPrintifyBlueprintDetail(apiKey, template.blueprintId).catch(() => template.syncDetails?.blueprint || null);
    
    // Fetch and select primary print provider
    const providerData = await fetchPrintifyBlueprintProviders(apiKey, template.blueprintId);
    const providers = normalizePrintifyList(providerData, ['print_providers', 'providers']);
    const productProviderId = Number(shopProductDetail?.print_provider_id || shopProductDetail?.printProviderId);
    const primaryProvider = providers.find((provider: any) => Number(provider?.id || provider?.print_provider_id) === productProviderId) || providers[0];
    const primaryProviderId = Number(primaryProvider?.id || primaryProvider?.print_provider_id || template.printProviderId || 0);

    let variants: any[] = [];
    let shipping: any[] = [];
    let printAreas: any[] = [];
    const variantImageMap: Record<string, string[]> = {};

    if (primaryProviderId) {
      // Fetch variants for this blueprint + provider combination
      const variantData = await fetchPrintifyBlueprintVariants(apiKey, template.blueprintId, primaryProviderId);
      const rawVariants = normalizePrintifyList(variantData, ['variants']);
      
      // DEBUG: Log raw variant structure to identify cost field
      if (rawVariants.length > 0) {
        console.log('[SYNC DEBUG] Raw variant sample:', {
          id: rawVariants[0]?.id,
          title: rawVariants[0]?.title,
          cost: rawVariants[0]?.cost,
          price: rawVariants[0]?.price,
          allKeys: Object.keys(rawVariants[0] || {}),
        });
      }
      
      // Enrich variants with human-readable option titles (Color: "Black" instead of Color: 123)
      const enrichedVariants = enrichVariants(rawVariants, blueprintDetail, variantData);
      
      // DEBUG: Log enriched variant to verify cost is preserved
      if (enrichedVariants.length > 0) {
        console.log('[SYNC DEBUG] Enriched variant sample:', {
          id: enrichedVariants[0]?.id,
          title: enrichedVariants[0]?.title,
          cost: enrichedVariants[0]?.cost,
          price: enrichedVariants[0]?.price,
        });
      }
      
      // PRIORITY 1: Map variant images from shop product (most accurate)
      // Shop product images include variant_ids array that directly maps to specific variants
      if (shopProductDetail && Array.isArray(shopProductDetail.images)) {
        for (const img of shopProductDetail.images) {
          const imgSrc = normalizeTemplateImage(img);
          const imgVariantIds = Array.isArray(img?.variant_ids) ? img.variant_ids : [];
          
          if (imgSrc && imgVariantIds.length > 0) {
            for (const vid of imgVariantIds) {
              const variantId = String(vid);
              if (!variantImageMap[variantId]) {
                variantImageMap[variantId] = [];
              }
              variantImageMap[variantId].push(imgSrc);
            }
          }
        }
      }

      // PRIORITY 2: Map variant images from blueprint detail (fallback)
      // Only use blueprint images for variants that don't have shop product images
      if (blueprintDetail && Array.isArray(blueprintDetail.images)) {
        for (const img of blueprintDetail.images) {
          const imgSrc = normalizeTemplateImage(img);
          const imgVariantIds = Array.isArray(img?.variant_ids) ? img.variant_ids : [];
          
          if (imgSrc && imgVariantIds.length > 0) {
            for (const vid of imgVariantIds) {
              const numVid = Number(vid);
              const variantId = String(numVid);
              
              if (numVid > 0 && !variantImageMap[variantId]) {
                variantImageMap[variantId] = [imgSrc];
              }
            }
          }
        }
      }

      // Merge shop product variant data (SKU, pricing, availability) with enriched variant metadata
      variants = enrichedVariants.map((resolved: any) => {
        const variantId = getVariantId(resolved);
        const shopVariant = (Array.isArray(shopProductDetail?.variants) ? shopProductDetail.variants : [])
          .find((entry: any) => String(entry?.id || entry?.variant_id) === variantId);
        
        // Get variant-specific images
        const variantImages = variantImageMap[variantId] || [];
        
        const merged = {
          ...resolved,
          sku: shopVariant?.sku || resolved?.sku || '',
          // Pricing: prefer raw variant cost (from Printify variants API), then shop product cost
          cost: resolved?.cost ?? resolved?.price ?? shopVariant?.cost ?? shopVariant?.price,
          retail_price: shopVariant?.price ?? shopVariant?.retail_price ?? resolved?.retail_price ?? resolved?.price,
          // Availability: merge shop and variant availability flags
          is_available: shopVariant?.is_available ?? shopVariant?.is_enabled ?? resolved?.is_available ?? resolved?.is_enabled,
          weight: shopVariant?.weight ?? resolved?.weight,
          // Image: use first variant-specific image, fall back to resolved image_url
          image_url: variantImages[0] || resolved?.image_url,
          _enriched: isVariantEnriched(resolved),
        };
        
        // DEBUG: Log merged variant to see final cost value
        if (variantId === getVariantId(enrichedVariants[0])) {
          console.log('[SYNC DEBUG] Merged variant sample:', {
            id: merged.id,
            title: merged.title,
            cost: merged.cost,
            retail_price: merged.retail_price,
            costDollars: getVariantCostDollars(merged),
          });
        }
        
        return merged;
      });

      // Fetch shipping profiles
      const shippingData = await fetchPrintifyBlueprintShipping(apiKey, template.blueprintId, primaryProviderId).catch(() => null);
      shipping = shippingData ? normalizePrintifyList(shippingData, ['profiles', 'shipping']) : [];

      // Extract print areas (priority: blueprint detail > variant data > variant placeholders)
      const detailPrintAreas = Array.isArray(blueprintDetail?.print_areas) ? blueprintDetail.print_areas : [];
      const variantPrintAreas = Array.isArray(variantData?.print_areas) ? variantData.print_areas : [];
      printAreas = detailPrintAreas.length > 0
        ? detailPrintAreas
        : variantPrintAreas.length > 0
        ? variantPrintAreas
        : variants.flatMap((variant: any) => Array.isArray(variant?.placeholders) ? variant.placeholders : []);
    }

    // Build complete image arrays
    const blueprintImages = Array.isArray(blueprintDetail?.images) 
      ? blueprintDetail.images.map(normalizeTemplateImage).filter(Boolean) 
      : [];
    const productImages = getProductImages(shopProductDetail);
    
    // Mockups are shop product images (usually styled product photos)
    const mockups = (Array.isArray(shopProductDetail?.images) ? shopProductDetail.images : [])
      .map(normalizeTemplateImage)
      .filter(Boolean);
    
    // All images: prioritize shop product images, then blueprint images, then existing template images
    const allImages = Array.from(new Set([
      ...productImages, 
      ...blueprintImages, 
      ...(template.images || []).map(normalizeTemplateImage).filter(Boolean)
    ]));

    // Calculate pricing from variants (Printify returns costs in cents)
    const baseCosts = variants
      .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
      .map(getVariantCostDollars)
      .filter((value) => value > 0);
    
    const retailPrices = variants
      .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
      .map(getVariantRetailDollars)
      .filter((value) => value > 0);
    
    // DEBUG: Log base cost calculation
    console.log('[SYNC DEBUG] Base cost calculation:', {
      template: template.title,
      variantCount: variants.length,
      baseCostsArray: baseCosts,
      minBaseCost: baseCosts.length > 0 ? Math.min(...baseCosts) : 'NONE',
      fallbackToTemplate: template.baseCost,
    });
    
    // Extract unique color and size option values
    const colors = extractOptionTitles(variants, 'color');
    const sizes = extractOptionTitles(variants, 'size');

    return {
      ...template,
      id: `bp_${template.blueprintId}`,
      productId: shopProductDetail?.id ? String(shopProductDetail.id) : template.productId,
      title: shopProductDetail?.title || blueprintDetail?.title || template.title,
      category: shopProductDetail?.category || blueprintDetail?.category || template.category || 'Catalog Blueprint',
      brand: blueprintDetail?.brand || template.brand,
      model: blueprintDetail?.model || template.model,
      tags: Array.isArray(shopProductDetail?.tags) ? shopProductDetail.tags : template.tags || [],
      productStatus: shopProductDetail?.visible === false
        ? 'hidden'
        : shopProductDetail?.status
        ? String(shopProductDetail.status)
        : shopProductDetail?.is_locked
        ? 'locked'
        : (shopProductDetail ? 'shop-product' : 'catalog-blueprint'),
      description: shopProductDetail?.description || blueprintDetail?.description || template.description || '',
      images: allImages.length > 0 ? allImages : ['/custom-tee-mockup.png'],
      mockups,
      variantImages: variantImageMap,
      providers,
      variants,
      printAreas,
      shipping,
      printProviderId: primaryProviderId || undefined,
      // Base cost = minimum variant cost (for pricing calculations)
      baseCost: baseCosts.length > 0 ? Number(Math.min(...baseCosts).toFixed(2)) : template.baseCost,
      // Retail price = minimum suggested retail (often same as cost for POD)
      retailPrice: retailPrices.length > 0 ? Number(Math.min(...retailPrices).toFixed(2)) : template.retailPrice,
      // Selling price = admin's custom price (defaults to retail if not set)
      sellingPrice: template.sellingPrice ?? (retailPrices.length > 0 ? Number(Math.min(...retailPrices).toFixed(2)) : template.sellingPrice),
      colors,
      sizes,
      syncDetails: {
        blueprint: blueprintDetail || template.syncDetails?.blueprint || null,
        shopProduct: shopProductDetail || null,
        provider: primaryProvider || null,
        colorCodes: extractOptionHexes(variants),
        providerLocation: primaryProvider?.location || null,
        productionTime: primaryProvider?.production_time || primaryProvider?.average_production_time || null,
        designConstraints: printAreas.map((area: any) => ({
          position: area.position || area.name,
          decorationMethod: area.decoration_method || area.method,
          width: area.width || area.pixel_width,
          height: area.height || area.pixel_height,
          safeArea: area.safe_area || null,
          bleedArea: area.bleed_area || null,
          dpi: area.dpi || area.dpi_requirement || null,
        })),
        syncedAt: new Date().toISOString(),
      },
      syncStatus: template.syncStatus || 'raw',
      isEnabled: template.isEnabled && template.syncStatus === 'published',
      lastSynced: new Date().toISOString(),
    };
  };

  const openTemplateEditor = (template: PrintifyCatalogTemplate) => {
    const variants = Array.isArray(template.variants) ? template.variants : [];
    const fallbackBase = template.baseCost || Math.min(...variants.map(getVariantCostDollars).filter(Boolean));
    setTemplateDraft({
      ...template,
      syncStatus: template.syncStatus || (template.isEnabled ? 'published' : 'raw'),
      sellingPrice: template.sellingPrice ?? template.retailPrice ?? (Number.isFinite(fallbackBase) ? fallbackBase : 0),
      variantSellingPrices: template.variantSellingPrices || {},
      colors: template.colors?.length ? template.colors : extractOptionTitles(variants, 'color'),
      sizes: template.sizes?.length ? template.sizes : extractOptionTitles(variants, 'size'),
    });
    setEditingTemplateId(template.id);
  };

  const updateTemplateDraft = (updates: Partial<PrintifyCatalogTemplate>) => {
    setTemplateDraft((current) => current ? { ...current, ...updates } : current);
  };

  const updateDraftVariantPrice = (variantId: string, value: string) => {
    setTemplateDraft((current) => {
      if (!current) return current;
      const nextPrices = { ...(current.variantSellingPrices || {}) };
      const numericValue = Number(value);
      if (value === '' || Number.isNaN(numericValue)) {
        delete nextPrices[variantId];
      } else {
        nextPrices[variantId] = Math.max(0, numericValue);
      }
      return { ...current, variantSellingPrices: nextPrices };
    });
  };

  const saveTemplateDraft = async (publish = false) => {
    if (!templateDraft) return;
    setSavingTemplate(true);
    try {
      const status = publish ? 'published' : templateDraft.syncStatus || 'raw';
      await updatePrintifyCatalogTemplate(templateDraft.id, {
        ...templateDraft,
        syncStatus: status,
        isEnabled: status === 'published',
        retailPrice: templateDraft.sellingPrice,
      });
      setSyncLogs(prev => [...prev, `[SUCCESS] ${publish ? 'Published' : 'Saved'} template: ${templateDraft.title}`]);
      setEditingTemplateId('');
      setTemplateDraft(null);
    } catch (err: any) {
      alert(`Template save failed:\n\n${err.message || err}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const runReliableTemplateCatalogSync = async () => {
    const apiKey = normalizeToken(privateApiKey);
    if (!apiKey) {
      alert('Please configure your Printify API Access Token in the APIs tab first.');
      return;
    }

    setSyncingTemplates(true);
    setSyncLogs([
      '[INFO] Initializing reliable raw template sync...',
      '[INFO] Fetching catalog blueprints and matching shop products...',
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

      let shopProductsByBlueprintId = new Map<number, any>();
      const shopId = printifySettings.providerSettings.shopId?.trim();
      if (shopId && /^\d+$/.test(shopId)) {
        try {
          const shopProductsPayload = await fetchPrintifyShopProducts(apiKey, shopId);
          shopProductsByBlueprintId = mapShopProductsByBlueprint(normalizeShopProductList(shopProductsPayload));
          setSyncLogs(prev => [...prev, `[INFO] Matched ${shopProductsByBlueprintId.size} existing shop products by blueprint ID.`]);
        } catch (shopErr: any) {
          setSyncLogs(prev => [...prev, `[INFO] Shop-product merge skipped: ${shopErr.message || shopErr}`]);
        }
      }

      const enrichedTemplates: PrintifyCatalogTemplate[] = [];
      for (const template of templates) {
        try {
          const existingTemplate = printifyCatalog.find((entry) => entry.id === template.id);
          const enriched = await buildSyncedTemplate(apiKey, { ...template, ...existingTemplate }, shopProductsByBlueprintId);
          enrichedTemplates.push(enriched);
          setSyncLogs(prev => [
            ...prev,
            `[SUCCESS] Synced ${enriched.title}: ${enriched.variants.length} variants, ${enriched.printAreas.length} print areas, base ${settings.currencySymbol}${Number(enriched.baseCost || 0).toFixed(2)}.`,
          ]);
        } catch (syncErr: any) {
          setSyncLogs(prev => [...prev, `[WARNING] Template skipped for ${template.title}: ${syncErr.message || syncErr}`]);
        }
      }

      await upsertPrintifyCatalogTemplates(enrichedTemplates, { replaceVisible: false });

      handleUpdate({
        sync: {
          ...printifySettings.sync,
          lastSyncAt: new Date().toLocaleString(),
          lastSyncStatus: 'success'
        }
      });

      setSyncLogs(prev => [
        ...prev,
        `[SUCCESS] Cached ${enrichedTemplates.length} raw template records without publishing them.`,
        '[INFO] SKU, status, tags, retail price, and mockups are merged only when Printify returns a matching shop product for the same blueprint.'
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
        '[TIP] Full Access PAT with catalog.read, products.read, and print_providers.read scopes is required for maximum enrichment.'
      ]);
    } finally {
      setSyncingTemplates(false);
    }
  };

  const resyncTemplate = async (template: PrintifyCatalogTemplate) => {
    const apiKey = normalizeToken(privateApiKey);
    if (!apiKey) {
      alert('Please configure your Printify API Access Token in the APIs tab first.');
      return;
    }

    setSavingTemplate(true);
    setSyncLogs(prev => [...prev, `[INFO] Resyncing ${template.title} from Printify...`]);
    try {
      let shopProductsByBlueprintId = new Map<number, any>();
      const shopId = printifySettings.providerSettings.shopId?.trim();
      if (shopId && /^\d+$/.test(shopId)) {
        const shopProductsPayload = await fetchPrintifyShopProducts(apiKey, shopId);
        shopProductsByBlueprintId = mapShopProductsByBlueprint(normalizeShopProductList(shopProductsPayload));
      }
      const enriched = await buildSyncedTemplate(apiKey, template, shopProductsByBlueprintId);
      await upsertPrintifyCatalogTemplates([enriched], { replaceVisible: false });
      setSyncLogs(prev => [...prev, `[SUCCESS] Resynced ${enriched.title}: ${enriched.variants.length} variants, base ${settings.currencySymbol}${Number(enriched.baseCost || 0).toFixed(2)}.`]);
    } catch (err: any) {
      alert(`Template resync failed:\n\n${err.message || err}`);
      setSyncLogs(prev => [...prev, `[ERROR] Resync failed for ${template.title}: ${err.message || err}`]);
    } finally {
      setSavingTemplate(false);
    }
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

        // Calculate minimum variant price (Printify returns prices in cents for variants)
        const variantPrices = Array.isArray(p.variants) 
          ? p.variants
              .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
              .map((v: any) => {
                const price = Number(v?.price ?? v?.retail_price ?? 0);
                if (price === 0) return 0;
                // Convert cents to dollars if needed
                return price < 100 && !Number.isInteger(price) ? price : price / 100;
              })
              .filter((p: number) => p > 0)
          : [];
        
        // Use minimum variant price, or fall back to settings default
        const productPrice = variantPrices.length > 0 
          ? Number(Math.min(...variantPrices).toFixed(2))
          : Number(printifySettings.charges?.templateBasePrice ?? 24.99);

        productPayloads.push({
          categoryId: 'cat_printify',
          name: p.title,
          slug: `printify-${p.id}`,
          description: p.description || 'Print-on-demand product.',
          price: productPrice,  // ✅ Now uses actual Printify price from variants
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
      const shippingByBlueprintId: Record<number, any[]> = {};
      const providerIdByBlueprintId: Record<number, number> = {};

      for (const template of templates.slice(0, providerLimit)) {
        try {
          const providerData = await fetchPrintifyBlueprintProviders(apiKey, template.blueprintId);
          const providerList = providerData.data || providerData || [];
          providersByBlueprintId[template.blueprintId] = Array.isArray(providerList) ? providerList : [];
          const primaryProvider = providersByBlueprintId[template.blueprintId][0];
          const primaryProviderId = Number(primaryProvider?.id || primaryProvider?.print_provider_id);
          if (primaryProviderId) {
            providerIdByBlueprintId[template.blueprintId] = primaryProviderId;
            const variantData = await fetchPrintifyBlueprintVariants(apiKey, template.blueprintId, primaryProviderId);
            const rawVariants = normalizePrintifyList(variantData, ['variants']);

            const variantImageMap = new Map<number, string>();
            let blueprintDetail: any = null;
            try {
              blueprintDetail = await fetchPrintifyBlueprintDetail(apiKey, template.blueprintId);

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
                : Array.isArray(variantData?.print_areas)
                ? variantData.print_areas
                : [];
              if (detailPrintAreas.length > 0) {
                printAreasByBlueprintId[template.blueprintId] = detailPrintAreas;
              }
            } catch {
              // Image mapping is optional — enrichment succeeds regardless
              setSyncLogs(prev => [...prev, `[INFO] Mockup image mapping skipped for ${template.title} — will use blueprint images instead.`]);
            }

            const enrichedVariants = enrichVariants(rawVariants, blueprintDetail, variantData).map((resolved: any) => {
              const variantId = Number(resolved?.id || resolved?.variant_id || 0);
              const imageUrl = variantImageMap.get(variantId);
              return {
                ...resolved,
                ...(imageUrl ? { image_url: imageUrl } : {}),
                _enriched: isVariantEnriched(resolved),
              };
            });

            try {
              const shippingData = await fetchPrintifyBlueprintShipping(apiKey, template.blueprintId, primaryProviderId);
              shippingByBlueprintId[template.blueprintId] = normalizePrintifyList(shippingData, ['profiles', 'shipping']);
            } catch (shippingError: any) {
              shippingByBlueprintId[template.blueprintId] = [];
              setSyncLogs(prev => [...prev, `[INFO] Shipping lookup skipped for ${template.title}: ${shippingError.message || shippingError}`]);
            }

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
        
        // Calculate base cost from cheapest enabled variant (Printify returns costs in cents)
        const baseCost = (() => {
          const enabledVariantCosts = variants
            .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
            .map((v: any) => {
              const costVal = Number(v?.cost ?? v?.price ?? 0);
              if (costVal === 0) return 0;
              // Convert cents to dollars: if value > 100 or is integer, divide by 100
              return costVal < 100 && !Number.isInteger(costVal) ? costVal : costVal / 100;
            })
            .filter((c: number) => c > 0);
          
          return enabledVariantCosts.length > 0 
            ? Number(Math.min(...enabledVariantCosts).toFixed(2)) 
            : template.baseCost ?? undefined;
        })();

        // Calculate retail price from cheapest variant retail/price
        const retailPrice = (() => {
          const enabledRetailPrices = variants
            .filter((v: any) => v?.is_enabled !== false && v?.is_available !== false)
            .map((v: any) => {
              const priceVal = Number(v?.retail_price ?? v?.price ?? 0);
              if (priceVal === 0) return 0;
              // Convert cents to dollars if needed
              return priceVal < 100 && !Number.isInteger(priceVal) ? priceVal : priceVal / 100;
            })
            .filter((p: number) => p > 0);
          
          return enabledRetailPrices.length > 0
            ? Number(Math.min(...enabledRetailPrices).toFixed(2))
            : undefined;
        })();
        
        return {
          ...template,
          variants,
          printAreas,
          shipping: shippingByBlueprintId[template.blueprintId] || template.shipping || [],
          baseCost,
          retailPrice,
          sellingPrice: template.sellingPrice ?? retailPrice ?? baseCost,
          colors: template.colors?.length ? template.colors : extractOptionTitles(variants, 'color'),
          sizes: template.sizes?.length ? template.sizes : extractOptionTitles(variants, 'size'),
          printProviderId: providerIdByBlueprintId[template.blueprintId],
          syncStatus: 'raw' as const,
          isEnabled: false,
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
              <span className="hidden md:inline">Shop Product Sync</span>
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
                    <p className="font-bold mb-1">Use One Full Access PAT</p>
                    <p>Printify tokens can be generated with limited scopes. This integration needs a Full Access PAT, or at minimum: <strong>shops.read, catalog.read, print_providers.read, products.read, products.write, orders.read, orders.write, uploads.read, uploads.write, webhooks.read, and webhooks.write</strong>. You do not need separate keys for each service.</p>
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
            
            {/* Template Management System */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">
                      Template Management
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setShowTemplateEditor(true)}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create Template
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Manually create templates or sync from Printify blueprints
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 md:p-6 pt-0">
                {printifyCatalog.filter(t => t.syncStatus === 'published').length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                    <p className="text-xs text-gray-400">No templates created yet</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Click "Create Template" to add your first template
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {printifyCatalog.filter(t => t.syncStatus === 'published').map((template) => (
                      <div key={template.id} className="p-4 rounded-2xl border bg-white hover:shadow-sm transition-shadow">
                        <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                          <img
                            src={template.images[0] || '/custom-tee-mockup.png'}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs font-black truncate">{template.title}</p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {template.variants?.length || 0} variants • {template.printAreas?.length || 0} print areas
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateEditor(true);
                          }}
                          className="w-full mt-3 rounded-xl h-8 text-[9px] font-black uppercase"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orphaned Templates Cleanup */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white mt-6 mb-6">
              <CardHeader className="p-5 md:p-6 border-b border-red-50 bg-red-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight text-red-700">
                      Orphaned Templates
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs text-red-600/70">
                  Stray template rows found in the products table. These can cause duplicate or hidden products in the bespoke customizer.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 md:p-6">
                {(() => {
                  const orphans = products.filter(p => {
                    const isRawTemplate = isRawPrintifyTemplateProduct(p);
                    const catalogMatch = printifyCatalog.find(t => t.id === p.id || `printify_template_${t.id}` === p.id);

                    if (p.id === 'printify_template_bp_36') {
                      console.log('[Orphaned Templates Debug] bp_36 product check', {
                        product: p,
                        isRawTemplate,
                        catalogMatch: catalogMatch || null,
                        catalogIds: printifyCatalog.map(t => t.id),
                      });
                    }

                    return isRawTemplate && !catalogMatch;
                  });
                  
                  if (orphans.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-600">No orphaned templates found</p>
                        <p className="text-[10px] text-gray-400 mt-1">Your catalog is clean.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {orphans.map(orphan => (
                        <div key={orphan.id} className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/30">
                          <div>
                            <p className="text-xs font-black">{orphan.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {orphan.id}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete orphaned template "${orphan.name}"?`)) {
                                deleteProduct(orphan.id);
                              }
                            }}
                            className="h-8 text-[10px] font-black uppercase rounded-lg"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Design Charges Configuration */}
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">
                    Design Charges
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Set customization fees added to template base price when customers add text or designs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-5 md:p-6 pt-0">
                {/* Base Customization Fees */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">
                      Text Only Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {settings.currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={printifySettings.charges.editorCharges?.textOnly || 0}
                        onChange={(e) => handleUpdate({
                          charges: {
                            ...printifySettings.charges,
                            editorCharges: {
                              ...printifySettings.charges.editorCharges,
                              textOnly: parseFloat(e.target.value) || 0,
                            },
                          },
                        })}
                        className="pl-7 rounded-xl h-11 text-xs"
                        placeholder="5.00"
                      />
                    </div>
                    <p className="text-[9px] text-gray-500">
                      Fee when customer adds only text
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">
                      Design Upload Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {settings.currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={printifySettings.charges.editorCharges?.designOnly || 0}
                        onChange={(e) => handleUpdate({
                          charges: {
                            ...printifySettings.charges,
                            editorCharges: {
                              ...printifySettings.charges.editorCharges,
                              designOnly: parseFloat(e.target.value) || 0,
                            },
                          },
                        })}
                        className="pl-7 rounded-xl h-11 text-xs"
                        placeholder="10.00"
                      />
                    </div>
                    <p className="text-[9px] text-gray-500">
                      Fee when customer uploads design only
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">
                      Text + Design Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {settings.currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={printifySettings.charges.editorCharges?.textAndDesign || 0}
                        onChange={(e) => handleUpdate({
                          charges: {
                            ...printifySettings.charges,
                            editorCharges: {
                              ...printifySettings.charges.editorCharges,
                              textAndDesign: parseFloat(e.target.value) || 0,
                            },
                          },
                        })}
                        className="pl-7 rounded-xl h-11 text-xs"
                        placeholder="12.00"
                      />
                    </div>
                    <p className="text-[9px] text-gray-500">
                      Fee when customer adds both
                    </p>
                  </div>
                </div>

                {/* Area Multiplier (Optional) */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[10px] font-black uppercase text-blue-900">
                        Area-Based Surcharge
                      </Label>
                      <p className="text-[9px] text-blue-700 mt-1">
                        Add extra fee when design covers more than threshold % of print area
                      </p>
                    </div>
                    <Switch
                      checked={printifySettings.charges.editorCharges?.areaMultiplier?.enabled || false}
                      onCheckedChange={(checked) => handleUpdate({
                        charges: {
                          ...printifySettings.charges,
                          editorCharges: {
                            ...printifySettings.charges.editorCharges,
                            areaMultiplier: {
                              ...printifySettings.charges.editorCharges?.areaMultiplier,
                              enabled: checked,
                            },
                          },
                        },
                      })}
                    />
                  </div>

                  {printifySettings.charges.editorCharges?.areaMultiplier?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-blue-800">
                          Coverage Threshold (%)
                        </Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={printifySettings.charges.editorCharges?.areaMultiplier?.threshold || 50}
                          onChange={(e) => handleUpdate({
                            charges: {
                              ...printifySettings.charges,
                              editorCharges: {
                                ...printifySettings.charges.editorCharges,
                                areaMultiplier: {
                                  ...printifySettings.charges.editorCharges?.areaMultiplier,
                                  threshold: parseInt(e.target.value) || 50,
                                },
                              },
                            },
                          })}
                          className="rounded-xl h-11 text-xs"
                          placeholder="50"
                        />
                        <p className="text-[9px] text-blue-600">
                          If design covers more than this %
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-blue-800">
                          Additional Surcharge
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {settings.currencySymbol}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={printifySettings.charges.editorCharges?.areaMultiplier?.surcharge || 0}
                            onChange={(e) => handleUpdate({
                              charges: {
                                ...printifySettings.charges,
                                editorCharges: {
                                  ...printifySettings.charges.editorCharges,
                                  areaMultiplier: {
                                    ...printifySettings.charges.editorCharges?.areaMultiplier,
                                    surcharge: parseFloat(e.target.value) || 0,
                                  },
                                },
                              },
                            })}
                            className="pl-7 rounded-xl h-11 text-xs"
                            placeholder="3.00"
                          />
                        </div>
                        <p className="text-[9px] text-blue-600">
                          Add this fee to total price
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Example */}
                <div className="p-4 bg-gray-50 rounded-2xl border">
                  <p className="text-[10px] font-black uppercase text-gray-700 mb-2">
                    Pricing Example
                  </p>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Template Base Price:</span>
                      <span className="font-bold">{settings.currencySymbol}{printifySettings.charges.templateBasePrice || 14.99}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">+ Text Only Fee:</span>
                      <span className="font-bold">{settings.currencySymbol}{printifySettings.charges.editorCharges?.textOnly || 0}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-900 font-black">Customer Pays:</span>
                      <span className="font-black text-green-600">
                        {settings.currencySymbol}
                        {((printifySettings.charges.templateBasePrice || 14.99) + (printifySettings.charges.editorCharges?.textOnly || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-amber-900 font-bold">How It Works</p>
                    <p className="text-[9px] text-amber-700 mt-1 leading-relaxed">
                      These charges are automatically calculated and added to the template price when customers use the storefront editor. The total breakdown is shown before checkout.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor Type Selection Card */}
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
            
            {/* Shop Product Sync */}
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
                      Imports products the admin already created inside Printify. These products will appear in your storefront catalog.
                    </p>
                  </div>
                  <Button 
                    onClick={runManualSync}
                    disabled={syncingProducts}
                    className="rounded-xl h-10 px-4 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800 self-stretch md:self-auto shrink-0"
                  >
                    {syncingProducts ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                    Sync Catalog Now
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
                    <p className="text-xs font-bold mt-1 capitalize">{printifySettings.sync?.mode || 'Manual'}</p>
                  </div>
                </div>

                {/* Sync Logs */}
                {syncLogs.length > 0 && (
                  <div className="rounded-2xl bg-neutral-900 p-4 font-mono text-[10px] text-green-400 space-y-1.5 h-44 overflow-y-auto border border-neutral-800">
                    <p className="text-gray-500 mb-2">// Console Output Logs</p>
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

      <Dialog open={Boolean(editingTemplateId)} onOpenChange={(open) => {
        if (!open && !savingTemplate) {
          setEditingTemplateId('');
          setTemplateDraft(null);
          setActiveEditorTab('overview');
        }
      }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {templateDraft && (
            <>
              <DialogHeader className="pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">{templateDraft.title}</DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      {templateDraft.brand && `${templateDraft.brand} • `}
                      {templateDraft.model && `${templateDraft.model} • `}
                      Blueprint ID: {templateDraft.blueprintId}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={templateDraft.syncStatus === 'published' || templateDraft.isEnabled ? 'default' : 'secondary'} className="text-[10px] font-black uppercase">
                      {templateDraft.syncStatus === 'published' || templateDraft.isEnabled ? '✓ Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={activeEditorTab} onValueChange={setActiveEditorTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="images" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Images ({(templateDraft.images || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Pricing
                  </TabsTrigger>
                  <TabsTrigger value="variants" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Variants ({(templateDraft.variants || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="print-areas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Print Areas ({(templateDraft.printAreas || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="sync-data" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-black uppercase">
                    Sync Data
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Product Info */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Product Title</Label>
                            <Input 
                              value={templateDraft.title} 
                              onChange={(e) => updateTemplateDraft({ title: e.target.value })} 
                              className="h-10 font-semibold"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Category</Label>
                            <Input 
                              value={templateDraft.category || ''} 
                              onChange={(e) => updateTemplateDraft({ category: e.target.value })}
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Description</Label>
                          <Textarea 
                            value={templateDraft.description} 
                            onChange={(e) => updateTemplateDraft({ description: e.target.value })} 
                            className="min-h-32 text-sm leading-relaxed"
                            placeholder="Enter a detailed product description..."
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Colors (comma separated)</Label>
                            <Input
                              value={(templateDraft.colors || []).join(', ')}
                              onChange={(e) => updateTemplateDraft({ colors: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })}
                              placeholder="Black, White, Navy"
                              className="h-10 text-xs"
                            />
                            <p className="text-[9px] text-gray-500 mt-1">{(templateDraft.colors || []).length} colors</p>
                          </div>
                          <div>
                            <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Sizes (comma separated)</Label>
                            <Input
                              value={(templateDraft.sizes || []).join(', ')}
                              onChange={(e) => updateTemplateDraft({ sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              placeholder="S, M, L, XL"
                              className="h-10 text-xs"
                            />
                            <p className="text-[9px] text-gray-500 mt-1">{(templateDraft.sizes || []).length} sizes</p>
                          </div>
                          <div>
                            <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Tags (comma separated)</Label>
                            <Input
                              value={(templateDraft.tags || []).join(', ')}
                              onChange={(e) => updateTemplateDraft({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                              placeholder="trendy, cotton, unisex"
                              className="h-10 text-xs"
                            />
                            <p className="text-[9px] text-gray-500 mt-1">{(templateDraft.tags || []).length} tags</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats Sidebar */}
                      <div className="space-y-3">
                        <Card className="p-4 bg-gray-50 border-2">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 mb-3">Template Information</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Source:</span>
                              <span className="font-bold text-gray-800">{templateDraft.productId ? 'Shop Product' : 'Catalog'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Blueprint ID:</span>
                              <span className="font-mono font-bold text-gray-800">{templateDraft.blueprintId}</span>
                            </div>
                            {templateDraft.productId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Product ID:</span>
                                <span className="font-mono font-bold text-gray-800">{templateDraft.productId}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <Badge variant="outline" className="text-[9px]">{templateDraft.productStatus || 'active'}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Synced:</span>
                              <span className="text-[10px] text-gray-500">{new Date(templateDraft.lastSynced).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 bg-blue-50 border-2 border-blue-200">
                          <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3">Provider Information</h4>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-blue-700 font-bold block mb-1">
                                {templateDraft.syncDetails?.provider?.title || templateDraft.syncDetails?.provider?.name || 'Provider Name'}
                              </span>
                              {templateDraft.syncDetails?.providerLocation && (
                                <span className="text-blue-600 text-[10px]">
                                  {[
                                    templateDraft.syncDetails.providerLocation.city,
                                    templateDraft.syncDetails.providerLocation.region,
                                    templateDraft.syncDetails.providerLocation.country
                                  ].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </div>
                            {templateDraft.syncDetails?.productionTime && (
                              <div className="flex justify-between pt-2 border-t border-blue-200">
                                <span className="text-blue-700">Production Time:</span>
                                <span className="font-bold text-blue-900">{templateDraft.syncDetails.productionTime}</span>
                              </div>
                            )}
                          </div>
                        </Card>

                        <Card className="p-4 border-2">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 mb-3">Quick Stats</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 rounded-lg p-2 border text-center">
                              <p className="text-lg font-black text-gray-800">{(templateDraft.images || []).length}</p>
                              <p className="text-[9px] text-gray-500 uppercase font-bold">Images</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 border text-center">
                              <p className="text-lg font-black text-gray-800">{(templateDraft.variants || []).length}</p>
                              <p className="text-[9px] text-gray-500 uppercase font-bold">Variants</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 border text-center">
                              <p className="text-lg font-black text-gray-800">{(templateDraft.printAreas || []).length}</p>
                              <p className="text-[9px] text-gray-500 uppercase font-bold">Print Areas</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 border text-center">
                              <p className="text-lg font-black text-gray-800">{(templateDraft.providers || []).length}</p>
                              <p className="text-[9px] text-gray-500 uppercase font-bold">Providers</p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Images Tab */}
                  <TabsContent value="images" className="mt-0">
                    <TemplateImageGallery
                      images={templateDraft.images || []}
                      variantImages={templateDraft.variantImages}
                      colors={templateDraft.colors}
                      title={templateDraft.title}
                    />
                  </TabsContent>

                  {/* Pricing Tab */}
                  <TabsContent value="pricing" className="mt-0">
                    <TemplatePricingPanel
                      baseCost={templateDraft.baseCost || 0}
                      retailPrice={templateDraft.retailPrice || 0}
                      sellingPrice={templateDraft.sellingPrice || 0}
                      currencySymbol={settings.currencySymbol}
                      onSellingPriceChange={(price) => updateTemplateDraft({ sellingPrice: price })}
                    />
                  </TabsContent>

                  {/* Variants Tab */}
                  <TabsContent value="variants" className="mt-0">
                    <TemplateVariantsTable
                      variants={templateDraft.variants || []}
                      variantSellingPrices={templateDraft.variantSellingPrices || {}}
                      defaultSellingPrice={templateDraft.sellingPrice || 0}
                      currencySymbol={settings.currencySymbol}
                      onPriceChange={updateDraftVariantPrice}
                    />
                  </TabsContent>

                  {/* Print Areas Tab */}
                  <TabsContent value="print-areas" className="mt-0">
                    <TemplatePrintAreas
                      printAreas={templateDraft.printAreas || []}
                      syncDetails={templateDraft.syncDetails}
                    />
                  </TabsContent>

                  {/* Sync Data Tab */}
                  <TabsContent value="sync-data" className="mt-0">
                    <div className="space-y-4">
                      <Card className="p-4 bg-amber-50 border-amber-200">
                        <h4 className="text-sm font-black uppercase text-amber-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Raw Printify Sync Data
                        </h4>
                        <p className="text-xs text-amber-700 mb-4">
                          This section shows the raw data received from Printify. Editing here is for advanced users only.
                        </p>
                      </Card>

                      <div className="grid gap-4">
                        <div>
                          <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Blueprint Data (JSON)</Label>
                          <Textarea
                            value={JSON.stringify(templateDraft.syncDetails?.blueprint || {}, null, 2)}
                            readOnly
                            className="min-h-48 text-[10px] font-mono bg-gray-50"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] font-black uppercase text-gray-400 mb-2">Shop Product Data (JSON)</Label>
                          <Textarea
                            value={JSON.stringify(templateDraft.syncDetails?.shopProduct || {}, null, 2)}
                            readOnly
                            className="min-h-48 text-[10px] font-mono bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="border-t pt-4">
                <div className="flex items-center justify-between w-full">
                  <p className="text-[10px] text-gray-500">
                    Last modified: {new Date().toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      disabled={savingTemplate} 
                      onClick={() => saveTemplateDraft(false)} 
                      className="rounded-xl text-[10px] font-black uppercase h-10 px-4"
                    >
                      {savingTemplate ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                      Save Draft
                    </Button>
                    <Button 
                      disabled={savingTemplate} 
                      onClick={() => saveTemplateDraft(true)} 
                      className="rounded-xl text-[10px] font-black uppercase bg-black text-white hover:bg-gray-800 h-10 px-4"
                    >
                      {savingTemplate ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <CheckCircle2 className="h-3 w-3 mr-2" />}
                      {templateDraft.syncStatus === 'published' || templateDraft.isEnabled ? 'Update & Publish' : 'Publish Template'}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <TemplateEditor
        open={showTemplateEditor}
        onClose={() => {
          setShowTemplateEditor(false);
          setEditingTemplate(null);
        }}
        apiKey={normalizeToken(privateApiKey)}
        editingTemplate={editingTemplate}
      />
    </div>
  );
};

