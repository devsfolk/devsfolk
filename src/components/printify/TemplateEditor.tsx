import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Save, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { useTemplateForm } from '@/hooks/useTemplateForm';
import { DisplayTab } from './tabs/DisplayTab';
import { PricesTab } from './tabs/PricesTab';
import { PrintAreasTab } from './tabs/PrintAreasTab';
import { GeneratorTab } from './tabs/GeneratorTab';
import { PrintifyCatalogTemplate } from '@/types';
import { supabase } from '@/lib/supabase';

interface TemplateEditorProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  editingTemplate?: PrintifyCatalogTemplate | null;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  open,
  onClose,
  apiKey,
  editingTemplate,
}) => {
  const { settings, upsertPrintifyCatalogTemplates, deletePrintifyCatalogTemplate } = useShop();
  const [activeTab, setActiveTab] = useState('display');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Prepare initial data from editing template
  const initialFormData = editingTemplate
    ? {
        id: editingTemplate.id,
        blueprintId: editingTemplate.blueprintId || null,
        title: editingTemplate.title || '',
        description: editingTemplate.description || '',
        images: Array.isArray(editingTemplate.images) ? editingTemplate.images : [],
        colors: Array.isArray(editingTemplate.colors) ? editingTemplate.colors : [],
        sizes: Array.isArray(editingTemplate.variants) && editingTemplate.variants.length > 0
          ? (() => {
              // FIXED: Extract sizes with individual prices from variants
              const variantPrices = editingTemplate.variantSellingPrices || {};
              console.log('[Template Load] Loading prices from variants:', editingTemplate.variants.length);
              console.log('[Template Load] Variant prices map:', variantPrices);
              
              return editingTemplate.variants.map((v: any) => {
                const baseCostCents = Number(v.cost || 0);
                const baseCostDollars = baseCostCents / 100; // Variants store in cents
                
                // Check variantPrices first (already in dollars), then v.price (in cents)
                let sellingPriceDollars = 0;
                if (variantPrices[v.id] !== undefined && variantPrices[v.id] !== null) {
                  // variantSellingPrices is already in dollars - use directly
                  sellingPriceDollars = Number(variantPrices[v.id]);
                } else if (v.price !== undefined && v.price !== null) {
                  // v.price is in cents - convert to dollars
                  sellingPriceDollars = Number(v.price) / 100;
                } else if (editingTemplate.sellingPrice !== undefined) {
                  // Fallback to template-level price
                  sellingPriceDollars = Number(editingTemplate.sellingPrice);
                }
                
                console.log(`[Template Load] Size ${v.title}: baseCost=$${baseCostDollars}, sellingPrice=$${sellingPriceDollars}`);
                
                return {
                  size: v.title || v.name || String(v.id),
                  baseCost: baseCostDollars,
                  sellingPrice: sellingPriceDollars,
                };
              });
            })()
          : Array.isArray(editingTemplate.sizes) && editingTemplate.sizes.length > 0
          ? (() => {
              // FALLBACK: If only sizes array exists (legacy), use template-level pricing
              console.warn('[Template Load] Using legacy sizes array without individual pricing');
              return editingTemplate.sizes.map((size: string) => ({
                size: String(size),
                baseCost: editingTemplate.baseCost || 0,
                sellingPrice: editingTemplate.sellingPrice || 0,
              }));
            })()
          : [],
        printAreas: Array.isArray(editingTemplate.printAreas)
          ? editingTemplate.printAreas.map((pa: any) => ({
              name: pa.position || pa.name || '',
              position: pa.position || '',
              width: pa.width || pa.pixel_width || 0,
              height: pa.height || pa.pixel_height || 0,
              x: pa.offset_x || pa.x || 0,
              y: pa.offset_y || pa.y || 0,
              dpi: pa.dpi || 300,
            }))
          : [],
        generatorSettings: {
          enableColorization: false,
          maskImageUrl: '',
          baseImageUrl: '',
        },
      }
    : undefined;

  // Initialize form with editing template data
  const { formData, setFormData } = useTemplateForm(initialFormData);

  const handleSync = async () => {
    if (!formData.blueprintId) {
      alert('Please provide a Blueprint ID to sync data.');
      return;
    }

    setSyncing(true);
    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('Admin authentication required. Please log in again.');
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      // Fetch blueprint details
      const blueprintResponse = await fetch('/api/printify/catalog', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          mode: 'blueprint',
          blueprintId: formData.blueprintId,
          apiKey,
        }),
      });

      if (!blueprintResponse.ok) {
        const errorData = await blueprintResponse.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Blueprint API returned status ${blueprintResponse.status}`);
      }

      const blueprintData = await blueprintResponse.json();
      
      if (!blueprintData || !blueprintData.id) {
        throw new Error('Invalid blueprint data received from Printify');
      }

      // Extract images from blueprint data
      const images = Array.isArray(blueprintData.images)
        ? blueprintData.images.map((img: any) => 
            typeof img === 'string' ? img : img.src || img.url || ''
          ).filter(Boolean)
        : [];

      // Fetch providers
      const providersResponse = await fetch('/api/printify/catalog', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          mode: 'providers',
          blueprintId: formData.blueprintId,
          apiKey,
        }),
      });

      if (!providersResponse.ok) {
        console.warn('Failed to fetch providers');
        // Update with basic blueprint data only
        setFormData(prev => ({
          ...prev,
          title: prev.title || blueprintData.title || '',
          description: prev.description || blueprintData.description || '',
          images: prev.images.length > 0 ? prev.images : images,
        }));
        alert('⚠️ Blueprint synced, but providers unavailable. Please select a print provider in the Prices tab to load sizes and pricing.');
        return;
      }

      const providersData = await providersResponse.json();
      const providers = providersData.data || providersData || [];
      
      if (providers.length === 0) {
        setFormData(prev => ({
          ...prev,
          title: prev.title || blueprintData.title || '',
          description: prev.description || blueprintData.description || '',
          images: prev.images.length > 0 ? prev.images : images,
        }));
        alert('⚠️ No print providers available for this blueprint.');
        return;
      }

      const primaryProvider = providers[0];
      const providerId = primaryProvider.id || primaryProvider.print_provider_id;

      // Fetch variants with the primary provider
      const variantsResponse = await fetch('/api/printify/catalog', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          mode: 'variants',
          blueprintId: formData.blueprintId,
          printProviderId: providerId,
          apiKey,
        }),
      });

      let variants: any[] = [];
      let printAreas: any[] = [];

      if (variantsResponse.ok) {
        const variantsData = await variantsResponse.json();
        variants = variantsData.variants || variantsData.data || [];
        printAreas = variantsData.print_areas || blueprintData.print_areas || [];
        
        console.log('[Sync Debug] Variants fetched:', variants.length);
        console.log('[Sync Debug] Sample variant:', variants[0]);
        console.log('[Sync Debug] Print areas:', printAreas.length);
      }

      // Extract unique COLORS from variants
      const colorsSet = new Set<string>();
      variants.forEach((variant: any) => {
        if (Array.isArray(variant.options)) {
          variant.options.forEach((option: any) => {
            // Check name, type, key, or label for "color"/"colour"
            const optionName = String(option.name || option.type || option.key || option.label || '').toLowerCase();
            const hasColorMetadata = !!option?.hex || (Array.isArray(option?.colors) && option.colors.length > 0);
            
            if (optionName.includes('color') || optionName.includes('colour') || hasColorMetadata) {
              // Extract color value from title, value, or name
              const colorValue = String(option.title || option.value || option.name || '').trim();
              if (colorValue && colorValue.toLowerCase() !== optionName) {
                colorsSet.add(colorValue);
              }
            }
          });
        }
      });
      const extractedColors = Array.from(colorsSet);
      console.log('[Sync Debug] Extracted colors:', extractedColors);

      // Extract unique SIZES and their base costs
      const sizeMap = new Map<string, { baseCost: number; count: number }>();
      
      variants.forEach((variant: any) => {
        let sizeValue = '';
        
        if (Array.isArray(variant.options)) {
          const sizeOption = variant.options.find((opt: any) => 
            String(opt.name || '').toLowerCase().includes('size')
          );
          if (sizeOption) {
            sizeValue = String(sizeOption.title || sizeOption.value || '').trim();
          }
        }
        
        if (!sizeValue && variant.title) {
          const title = String(variant.title);
          const sizeMatch = title.match(/\b(XXX?L|XX?L|[SML]|[2-5]XL)\b/i);
          if (sizeMatch) {
            sizeValue = sizeMatch[0].toUpperCase();
          }
        }
        
        if (sizeValue) {
          const cost = Number(variant.cost || 0) / 100;
          
          if (!sizeMap.has(sizeValue)) {
            sizeMap.set(sizeValue, { baseCost: cost, count: 1 });
          } else {
            const existing = sizeMap.get(sizeValue)!;
            existing.baseCost = ((existing.baseCost * existing.count) + cost) / (existing.count + 1);
            existing.count += 1;
          }
        }
      });

      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL'];
      const extractedSizes = Array.from(sizeMap.entries())
        .map(([size, data]) => ({
          size,
          baseCost: Number(data.baseCost.toFixed(2)),
          sellingPrice: Number((data.baseCost * 1.5).toFixed(2)),
        }))
        .sort((a, b) => {
          const aIndex = sizeOrder.indexOf(a.size);
          const bIndex = sizeOrder.indexOf(b.size);
          if (aIndex === -1 && bIndex === -1) return a.size.localeCompare(b.size);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

      console.log('[Sync Debug] Extracted sizes:', extractedSizes);

      // Update form data with everything
      setFormData(prev => ({
        ...prev,
        title: prev.title || blueprintData.title || '',
        description: prev.description || blueprintData.description || '',
        images: prev.images.length > 0 ? prev.images : images,
        colors: extractedColors.length > 0 ? extractedColors : prev.colors,
        sizes: extractedSizes.length > 0 ? extractedSizes : prev.sizes,
        printAreas: printAreas.length > 0
          ? printAreas.map((pa: any) => ({
              name: pa.position || pa.name || 'Print Area',
              position: pa.position || '',
              width: pa.width || pa.pixel_width || 0,
              height: pa.height || pa.pixel_height || 0,
              x: pa.offset_x || 0,
              y: pa.offset_y || 0,
              dpi: pa.dpi || 300,
            }))
          : prev.printAreas,
      }));

      alert('✓ Data synced successfully from Printify!');
    } catch (err: any) {
      console.error('[Template Sync] Error:', err);
      alert(`Sync failed: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title) {
      alert('Please provide a template title');
      return;
    }

    if (formData.images.length === 0) {
      alert('Please add at least one product image');
      return;
    }

    setLoading(true);
    try {
      const templateData: PrintifyCatalogTemplate = {
        id: formData.id || `bp_${formData.blueprintId || Date.now()}`,
        blueprintId: formData.blueprintId || 0,
        title: formData.title,
        description: formData.description,
        images: formData.images,
        mockups: formData.images,
        colors: formData.colors,
        sizes: formData.sizes.map(s => s.size),
        providers: [],
        variants: formData.sizes.map((s, idx) => ({
          id: idx + 1,
          title: s.size,
          cost: Math.round(s.baseCost * 100),
          price: Math.round(s.sellingPrice * 100),
          is_available: true,
          is_enabled: true,
        })),
        printAreas: formData.printAreas,
        shipping: [],
        baseCost: formData.sizes.length > 0 
          ? Math.min(...formData.sizes.map(s => s.baseCost))
          : 0,
        retailPrice: formData.sizes.length > 0
          ? Math.min(...formData.sizes.map(s => s.sellingPrice))
          : 0,
        sellingPrice: formData.sizes.length > 0
          ? Math.min(...formData.sizes.map(s => s.sellingPrice))
          : 0,
        variantSellingPrices: formData.sizes.reduce((acc, s, idx) => ({
          ...acc,
          [idx + 1]: s.sellingPrice,
        }), {}),
        syncStatus: 'published',
        isEnabled: true,
        lastSynced: new Date().toISOString(),
      };

      await upsertPrintifyCatalogTemplates([templateData], { replaceVisible: false });
      alert('✓ Template published successfully!');
      onClose();
    } catch (err: any) {
      console.error('[Template Publish] Error:', err);
      alert(`Publish failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.id) {
      alert('Cannot delete: Template has no ID');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${formData.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deletePrintifyCatalogTemplate(formData.id);
      alert('✓ Template deleted successfully!');
      onClose();
    } catch (err: any) {
      console.error('[Template Delete] Error:', err);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[1600px] w-[98vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {formData.blueprintId
              ? `Blueprint ID: ${formData.blueprintId} • Manual override enabled`
              : 'Pure manual template • No Printify sync'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger
              value="display"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black px-4 py-2.5 text-xs font-black uppercase"
            >
              Display
            </TabsTrigger>
            <TabsTrigger
              value="prices"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black px-4 py-2.5 text-xs font-black uppercase"
            >
              Prices ({formData.sizes.length})
            </TabsTrigger>
            <TabsTrigger
              value="printareas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black px-4 py-2.5 text-xs font-black uppercase"
            >
              Print Areas ({formData.printAreas.length})
            </TabsTrigger>
            <TabsTrigger
              value="generator"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black px-4 py-2.5 text-xs font-black uppercase"
            >
              Generator
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="display" className="mt-0">
              <DisplayTab formData={formData} setFormData={setFormData} apiKey={apiKey} />
            </TabsContent>

            <TabsContent value="prices" className="mt-0">
              <PricesTab formData={formData} setFormData={setFormData} currencySymbol={settings.currencySymbol} apiKey={apiKey} />
            </TabsContent>

            <TabsContent value="printareas" className="mt-0">
              <PrintAreasTab formData={formData} setFormData={setFormData} />
            </TabsContent>

            <TabsContent value="generator" className="mt-0">
              <GeneratorTab formData={formData} setFormData={setFormData} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleSync}
            disabled={!formData.blueprintId || syncing || loading}
            className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
          >
            {syncing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}
            Sync from Printify
          </Button>

          <div className="flex items-center gap-3">
            {editingTemplate && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={deleting || loading || syncing}
                className="rounded-xl h-11 px-4 text-[10px] font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
              >
                {deleting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash2 className="h-3 w-3 mr-2" />}
                Delete
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePublish}
              disabled={loading || syncing || deleting}
              className="rounded-xl h-11 px-6 text-[10px] font-black uppercase bg-black text-white hover:bg-neutral-800"
            >
              {loading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
              {editingTemplate ? 'Update' : 'Publish'} Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
