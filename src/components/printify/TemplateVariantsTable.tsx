import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Search } from 'lucide-react';

interface TemplateVariantsTableProps {
  variants: any[];
  variantSellingPrices: Record<string, number>;
  defaultSellingPrice: number;
  currencySymbol: string;
  onPriceChange: (variantId: string, price: number) => void;
}

const getVariantId = (variant: any) => String(variant?.id || variant?.variant_id || variant?.printify_variant_id || '');

const getVariantOption = (variant: any, optionName: string) => {
  if (!Array.isArray(variant?.options)) return '';
  
  const option = variant.options.find((opt: any) => {
    const name = String(opt?.name || opt?.type || '').toLowerCase();
    return name.includes(optionName.toLowerCase());
  });
  
  return option?.title || '';
};

const getVariantCostDollars = (variant: any) => {
  const costVal = Number(variant?.cost ?? variant?.price ?? 0);
  if (costVal === 0) return 0;
  return costVal < 100 && !Number.isInteger(costVal) ? costVal : costVal / 100;
};

export const TemplateVariantsTable: React.FC<TemplateVariantsTableProps> = ({
  variants,
  variantSellingPrices,
  defaultSellingPrice,
  currencySymbol,
  onPriceChange,
}) => {
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique colors and sizes
  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    variants.forEach(v => {
      const color = getVariantOption(v, 'color');
      if (color) colors.add(color);
    });
    return Array.from(colors).sort();
  }, [variants]);

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    variants.forEach(v => {
      const size = getVariantOption(v, 'size');
      if (size) sizes.add(size);
    });
    return Array.from(sizes).sort();
  }, [variants]);

  // Filter variants
  const filteredVariants = useMemo(() => {
    return variants.filter(variant => {
      const color = getVariantOption(variant, 'color');
      const size = getVariantOption(variant, 'size');
      const isAvailable = variant?.is_available !== false && variant?.is_enabled !== false;
      const variantId = getVariantId(variant);
      const sku = variant?.sku || '';

      // Apply filters
      if (colorFilter !== 'all' && color !== colorFilter) return false;
      if (sizeFilter !== 'all' && size !== sizeFilter) return false;
      if (availabilityFilter === 'available' && !isAvailable) return false;
      if (availabilityFilter === 'unavailable' && isAvailable) return false;
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = `${color} ${size} ${variantId} ${sku}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [variants, colorFilter, sizeFilter, availabilityFilter, searchQuery]);

  // Group variants by color for better organization
  const variantsByColor = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredVariants.forEach(variant => {
      const color = getVariantOption(variant, 'color') || 'No Color';
      if (!grouped[color]) grouped[color] = [];
      grouped[color].push(variant);
    });
    return grouped;
  }, [filteredVariants]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-gray-400">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search variants..."
              className="h-9 text-xs pl-8 rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-gray-400">Color</label>
          <Select value={colorFilter} onValueChange={setColorFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors ({uniqueColors.length})</SelectItem>
              {uniqueColors.map(color => (
                <SelectItem key={color} value={color}>{color}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-gray-400">Size</label>
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes ({uniqueSizes.length})</SelectItem>
              {uniqueSizes.map(size => (
                <SelectItem key={size} value={size}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-gray-400">Availability</label>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="h-9 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Variants</SelectItem>
              <SelectItem value="available">Available Only</SelectItem>
              <SelectItem value="unavailable">Unavailable Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500">
          Showing <span className="font-bold text-gray-700">{filteredVariants.length}</span> of{' '}
          <span className="font-bold text-gray-700">{variants.length}</span> variants
        </p>
        {(colorFilter !== 'all' || sizeFilter !== 'all' || availabilityFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setColorFilter('all');
              setSizeFilter('all');
              setAvailabilityFilter('all');
              setSearchQuery('');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Variants Table Grouped by Color */}
      {Object.keys(variantsByColor).length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 border border-dashed rounded-xl">
          No variants match the current filters
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(variantsByColor).map(([color, colorVariants]) => (
            <div key={color} className="border rounded-xl overflow-hidden">
              {/* Color Header */}
              <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-gray-700">{color}</h4>
                <Badge variant="secondary" className="text-[9px] font-bold">
                  {colorVariants.length} {colorVariants.length === 1 ? 'Variant' : 'Variants'}
                </Badge>
              </div>

              {/* Variants Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase text-gray-400">
                      <th className="text-left px-4 py-2">Size</th>
                      <th className="text-left px-4 py-2">SKU</th>
                      <th className="text-right px-4 py-2">Base Cost</th>
                      <th className="text-right px-4 py-2">Selling Price</th>
                      <th className="text-right px-4 py-2">Margin</th>
                      <th className="text-center px-4 py-2">Available</th>
                      <th className="text-center px-4 py-2">Variant ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {colorVariants.map((variant) => {
                      const variantId = getVariantId(variant);
                      const size = getVariantOption(variant, 'size');
                      const baseCost = getVariantCostDollars(variant);
                      const sellingPrice = variantSellingPrices[variantId] ?? defaultSellingPrice;
                      const margin = sellingPrice > 0 && baseCost > 0 
                        ? ((sellingPrice - baseCost) / sellingPrice * 100).toFixed(1)
                        : '0';
                      const isAvailable = variant?.is_available !== false && variant?.is_enabled !== false;

                      return (
                        <tr key={variantId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-700">{size || 'One Size'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] text-gray-500">
                              {variant?.sku || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-gray-700">
                              {currencySymbol}{baseCost.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={sellingPrice || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                onPriceChange(variantId, isNaN(value) ? 0 : value);
                              }}
                              placeholder={String(defaultSellingPrice)}
                              className="h-8 text-xs text-right font-mono w-24 ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant={parseFloat(margin) > 30 ? 'default' : parseFloat(margin) > 15 ? 'secondary' : 'outline'}
                              className="text-[9px] font-bold"
                            >
                              {margin}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              {isAvailable ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono text-[10px] text-gray-400">{variantId}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
