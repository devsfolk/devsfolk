import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TemplateFormData, SizePrice } from '@/hooks/useTemplateForm';

interface PricesTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  currencySymbol: string;
}

export const PricesTab: React.FC<PricesTabProps> = ({
  formData,
  setFormData,
  currencySymbol = '$',
}) => {
  const [newSize, setNewSize] = useState('');

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
      {/* Add Size */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Add Size
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
