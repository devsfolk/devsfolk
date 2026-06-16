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
  const { settings, upsertPrintifyCatalogTemplates } = useShop();
  const [activeTab, setActiveTab] = useState('display');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Initialize form with editing template data if provided
  const { formData, setFormData } = useTemplateForm(
    editingTemplate
      ? {
          id: editingTemplate.id,
          blueprintId: editingTemplate.blueprintId,
          title: editingTemplate.title,
          description: editingTemplate.description,
          images: editingTemplate.images,
          colors: editingTemplate.colors || [],
          sizes: editingTemplate.variants?.map((v: any) => ({
            size: v.title || v.name || '',
            baseCost: Number(v.cost || 0) / 100,
            sellingPrice: Number(editingTemplate.sellingPrice || 0),
          })) || [],
          printAreas: editingTemplate.printAreas?.map((pa: any) => ({
            name: pa.position || pa.name || '',
            position: pa.position || '',
            width: pa.width || pa.pixel_width || 0,
            height: pa.height || pa.pixel_height || 0,
            x: pa.offset_x || 0,
            y: pa.offset_y || 0,
            dpi: pa.dpi || 300,
          })) || [],
          generatorSettings: {
            enableColorization: false,
            maskImageUrl: '',
            baseImageUrl: '',
          },
        }
      : undefined
  );

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
        console.warn('Failed to fetch providers, continuing with blueprint data only');
      }

      const providersData = await providersResponse.json().catch(() => ({}));
      const providers = providersData.data || providersData || [];
      const primaryProvider = providers[0];

      let variants: any[] = [];
      let printAreas: any[] = [];

      if (primaryProvider) {
        const providerId = primaryProvider.id || primaryProvider.print_provider_id;

        // Fetch variants
        try {
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

          if (variantsResponse.ok) {
            const variantsData = await variantsResponse.json();
            variants = variantsData.variants || variantsData.data || [];
            printAreas = variantsData.print_areas || blueprintData.print_areas || [];
          }
        } catch (err) {
          console.warn('Failed to fetch variants:', err);
        }
      }

      // Extract images from blueprint data
      const images = Array.isArray(blueprintData.images)
        ? blueprintData.images.map((img: any) => 
            typeof img === 'string' ? img : img.src || img.url || ''
          ).filter(Boolean)
        : [];

      // Auto-populate form data
      setFormData(prev => ({
        ...prev,
        title: prev.title || blueprintData.title || '',
        description: prev.description || blueprintData.description || '',
        images: prev.images.length > 0 ? prev.images : images,
        sizes: variants.length > 0
          ? variants.map((v: any) => ({
              size: v.title || v.name || `Variant ${v.id}`,
              baseCost: Number(v.cost || 0) / 100,
              sellingPrice: Number(v.cost || 0) / 100 * 1.5, // 50% markup
            }))
          : prev.sizes,
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
              <PricesTab formData={formData} setFormData={setFormData} currencySymbol={settings.currencySymbol} />
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
                className="rounded-xl h-11 px-4 text-[10px] font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePublish}
              disabled={loading || syncing}
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
