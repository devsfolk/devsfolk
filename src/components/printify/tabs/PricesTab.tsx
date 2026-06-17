import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { TemplateFormData, SizePrice } from '@/hooks/useTemplateForm';
import { supabase } from '@/lib/supabase';

interface PricesTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  currencySymbol: string;
  apiKey?: string;
}

export const PricesTab: React.FC<PricesTabProps> = ({
  formData,
  setFormData,
  currencySymbol = '$',
  apiKey = '',
}) => {
  const [newSize, setNewSize] = useState('');
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Fetch providers when blueprintId changes
  useEffect(() => {
    if (formData.blueprintId && apiKey) {
      fetchProviders();
    }
  }, [formData.blueprintId]);

  const fetchProviders = async () => {
    if (!formData.blueprintId || !apiKey) return;

    setLoadingProviders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        console.warn('No auth token for fetching providers');
        return;
      }

      const response = await fetch('/api/printify/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mode: 'providers',
          blueprintId: formData.blueprintId,
          apiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const providersList = data.data || data || [];
        setProviders(providersList);
        
        // Auto-select first provider if available
        if (providersList.length > 0 && !selectedProvider) {
          const firstProvider = providersList[0];
          const providerId = String(firstProvider.id || firstProvider.print_provider_id || '');
          setSelectedProvider(providerId);
        }
      }
    } catch (err) {
      console.error('[Fetch Providers] Error:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchPricesForProvider = async (providerId: string) => {
    if (!formData.blueprintId || !providerId || !apiKey) return;

    setLoadingPrices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        alert('Admin authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/printify/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mode: 'variants',
          blueprintId: formData.blueprintId,
          printProviderId: providerId,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }

      const variantsData = await response.json();
      
      // ===== CRITICAL DEBUGGING - FULL RAW API RESPONSE =====
      console.log('============================================');
      console.log('===== PRINTIFY API VARIANTS RESPONSE =====');
      console.log('============================================');
      console.log('FULL RAW VARIANT DATA:', JSON.stringify(variantsData, null, 2));
      console.log('Response Keys:', Object.keys(variantsData));
      console.log('Response Type:', typeof variantsData);
      console.log('Is Array?:', Array.isArray(variantsData));
      
      // Log nested structure
      if (variantsData.data) {
        console.log('Found .data property:', typeof variantsData.data, Array.isArray(variantsData.data));
      }
      if (variantsData.variants) {
        console.log('Found .variants property:', typeof variantsData.variants, Array.isArray(variantsData.variants));
      }
      if (variantsData.print_areas) {
        console.log('Found .print_areas property:', typeof variantsData.print_areas, Array.isArray(variantsData.print_areas));
      }
      if (variantsData.printAreas) {
        console.log('Found .printAreas property:', typeof variantsData.printAreas, Array.isArray(variantsData.printAreas));
      }
      console.log('============================================');
      
      const variants = variantsData.variants || variantsData.data || [];

      console.log('[Fetch Prices] Extracted Variants Count:', variants.length);
      
      if (variants.length > 0) {
        console.log('[Fetch Prices] Sample Variant Structure:', JSON.stringify(variants[0], null, 2));
      }

      // FIXED: Extract colors directly from variant.options.color (it's a string, not nested)
      const colorsSet = new Set<string>();
      variants.forEach((variant: any) => {
        const colorValue = variant.options?.color;
        if (colorValue && typeof colorValue === 'string') {
          colorsSet.add(colorValue.trim());
        }
      });
      const extractedColors = Array.from(colorsSet);
      
      console.log('[Color Extraction] Extracted colors:', extractedColors);
      console.log('[Color Extraction] Total unique colors:', extractedColors.length);

      // FIXED: Extract print areas from first variant's placeholders array
      const firstVariant = variants[0];
      const printAreas = Array.isArray(firstVariant?.placeholders)
        ? firstVariant.placeholders.map((placeholder: any) => ({
            position: placeholder.position || 'front',
            width: placeholder.width || 0,
            height: placeholder.height || 0,
          }))
        : [];
      
      console.log('[Print Areas Extraction] Extracted print areas:', printAreas);
      console.log('[Print Areas Extraction] Total print areas:', printAreas.length);

      // Extract unique SIZES - NOTE: This endpoint does NOT return prices
      // Admin must enter prices manually or prices come from a separate endpoint
      const sizeMap = new Map<string, { baseCost: number; count: number }>();
      
      variants.forEach((variant: any) => {
        let sizeValue = '';
        
        // FIXED: Extract size from variant.options.size (similar to color)
        if (variant.options?.size) {
          sizeValue = String(variant.options.size).trim();
        } else if (variant.title) {
          // Fallback: parse from title
          const title = String(variant.title);
          const sizeMatch = title.match(/\b(XXX?L|XX?L|[SML]|[2-5]XL)\b/i);
          if (sizeMatch) {
            sizeValue = sizeMatch[0].toUpperCase();
          }
        }
        
        if (sizeValue) {
          // NOTE: variant.cost is NOT available in this endpoint
          // Using 0 as placeholder - admin must set prices manually
          const cost = 0; // Prices not available in this endpoint
          
          if (!sizeMap.has(sizeValue)) {
            sizeMap.set(sizeValue, { baseCost: cost, count: 1 });
          } else {
            const existing = sizeMap.get(sizeValue)!;
            existing.baseCost = 0; // Keep at 0 since prices not available
            existing.count += 1;
          }
        }
      });

      console.log('[Size Extraction] Extracted sizes:', Array.from(sizeMap.keys()));

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

      // Update form data with sizes, colors, and print areas
      setFormData(prev => ({
        ...prev,
        sizes: extractedSizes.length > 0 ? extractedSizes : prev.sizes,
        colors: extractedColors.length > 0 ? extractedColors : prev.colors,
        printAreas: printAreas.length > 0
          ? printAreas.map((pa: any) => ({
              name: pa.position || 'Print Area',
              position: pa.position || '',
              width: pa.width || 0,
              height: pa.height || 0,
              x: 0, // Default position - admin can adjust in Print Areas tab
              y: 0,
              dpi: 300,
            }))
          : prev.printAreas,
      }));

      alert(`✓ Loaded ${extractedSizes.length} sizes, ${extractedColors.length} colors, and ${printAreas.length} print areas!`);
    } catch (err: any) {
      console.error('[Fetch Prices] Error:', err);
      alert(`Failed to fetch prices: ${err.message}`);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    if (value) {
      fetchPricesForProvider(value);
    }
  };

  const addSize = () => {
    if (newSize.trim()) {
      const sizeExists = formData.sizes.some(s => s.size.toLowerCase() === newSize.trim().toLowerCase());
      if (!sizeExists) {
        setFormData(prev => ({
          ...prev,
          sizes: [
            ...prev.sizes,
            { size: newSize.trim(), baseCost: 0, sellingPrice: 0 },
          ],
        }));
        setNewSize('');
      }
    }
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  const updateSize = (index: number, field: keyof SizePrice, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? { ...size, [field]: value } : size
      ),
    }));
  };

  const calculateMargin = (baseCost: number, sellingPrice: number) => {
    if (baseCost === 0) return 0;
    return ((sellingPrice - baseCost) / baseCost * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Print Provider Selector - ALWAYS VISIBLE */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[10px] font-black uppercase text-blue-900">
              Print Provider Selection
            </Label>
            <p className="text-[9px] text-blue-700 mt-1">
              {formData.blueprintId 
                ? 'Select a print provider to load sizes and pricing' 
                : 'First add a Blueprint ID in the Display Tab, then sync to enable provider selection'}
            </p>
          </div>
          {loadingProviders && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>

        {!formData.blueprintId ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[10px] text-amber-800 font-bold">
              ⚠️ Blueprint ID Required
            </p>
            <p className="text-[9px] text-amber-700 mt-1">
              Go to Display Tab → Enter Blueprint ID → Click "Sync from Printify" → Return here to select provider
            </p>
          </div>
        ) : providers.length > 0 ? (
          <div className="flex gap-2">
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
              <SelectTrigger className="rounded-xl h-11 flex-1">
                <SelectValue placeholder="Select a print provider..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => {
                  const id = String(provider.id || provider.print_provider_id || '');
                  const title = provider.title || provider.name || `Provider ${id}`;
                  return (
                    <SelectItem key={id} value={id}>
                      {title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => selectedProvider && fetchPricesForProvider(selectedProvider)}
              disabled={!selectedProvider || loadingPrices}
              className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
            >
              {loadingPrices ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-2" />}
              Load Prices
            </Button>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-[10px] text-yellow-800">
              {loadingProviders ? 'Loading providers...' : 'No providers available. Please sync blueprint in Display Tab first.'}
            </p>
          </div>
        )}
      </div>

      {/* Add Size */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Add Size Manually
        </Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g., S, M, L, XL, XXL, XXXL"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSize()}
            className="rounded-xl h-11 text-xs flex-1"
          />
          <Button
            type="button"
            onClick={addSize}
            className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
          >
            <Plus className="h-3 w-3 mr-2" />
            Add
          </Button>
        </div>
        <p className="text-[9px] text-gray-500 pl-1">
          Common sizes: S, M, L, XL, 2XL, 3XL, 4XL, 5XL
        </p>
      </div>

      {/* Size Pricing Grid */}
      {formData.sizes.length > 0 ? (
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Size-Based Pricing ({formData.sizes.length} sizes)
          </Label>

          <div className="space-y-2">
            {formData.sizes.map((size, index) => (
              <div
                key={index}
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-2xl border"
              >

                {/* Size Name */}
                <div className="lg:col-span-2">
                  <Label className="text-[9px] font-black uppercase text-gray-400">Size</Label>
                  <div className="mt-1 px-3 py-2 bg-white border rounded-xl">
                    <p className="text-xs font-black">{size.size}</p>
                  </div>
                </div>

                {/* Base Cost */}
                <div className="lg:col-span-4">
                  <Label className="text-[9px] font-black uppercase text-gray-400">
                    Printify Base Cost
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={size.baseCost}
                      onChange={(e) => updateSize(index, 'baseCost', parseFloat(e.target.value) || 0)}
                      className="pl-7 rounded-xl h-10 text-xs w-full"
                    />
                  </div>
                </div>

                {/* Selling Price */}
                <div className="lg:col-span-4">
                  <Label className="text-[9px] font-black uppercase text-gray-400">
                    Your Selling Price
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={size.sellingPrice}
                      onChange={(e) => updateSize(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                      className="pl-7 rounded-xl h-10 text-xs w-full"
                    />
                  </div>
                </div>

                {/* Margin & Delete */}
                <div className="lg:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[9px] font-black uppercase text-gray-400">Margin</Label>
                    <div className="mt-1 px-2 py-2 bg-white border rounded-xl text-center">
                      <p className={`text-xs font-black ${
                        Number(calculateMargin(size.baseCost, size.sellingPrice)) < 20
                          ? 'text-red-600'
                          : Number(calculateMargin(size.baseCost, size.sellingPrice)) < 40
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}>
                        {calculateMargin(size.baseCost, size.sellingPrice)}%
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSize(index)}
                    className="h-10 w-10 text-red-600 hover:bg-red-50 flex-shrink-0"
                    title="Remove size"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed rounded-2xl">
          <p className="text-xs text-gray-400">No sizes added yet</p>
          <p className="text-[10px] text-gray-500 mt-1">
            Add sizes above to configure pricing
          </p>
        </div>
      )}
    </div>
  );
};
