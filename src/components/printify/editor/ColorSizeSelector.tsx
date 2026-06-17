import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, PrintifyCatalogTemplate } from '@/types';

interface ColorSizeSelectorProps {
  template: Product;
  templateData?: PrintifyCatalogTemplate;
  selectedColor: string | null;
  selectedSize: string | null;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const COLOR_NAME_MAP: Record<string, string> = {
  '#FFFFFF': 'White',
  '#000000': 'Black',
  '#111827': 'Black',
  '#1F2937': 'Charcoal',
  '#EF4444': 'Red',
  '#DC2626': 'Red',
  '#F59E0B': 'Orange',
  '#10B981': 'Green',
  '#059669': 'Green',
  '#3B82F6': 'Blue',
  '#2563EB': 'Blue',
  '#8B5CF6': 'Purple',
  '#EC4899': 'Pink',
  '#F97316': 'Orange',
  '#84CC16': 'Lime',
  '#06B6D4': 'Cyan',
  '#6366F1': 'Indigo',
};

const getColorName = (color: string): string => {
  if (COLOR_NAME_MAP[color.toUpperCase()]) {
    return COLOR_NAME_MAP[color.toUpperCase()];
  }
  
  // If color is a name (not hex), return it
  if (!color.startsWith('#')) {
    return color;
  }
  
  return color;
};

export const ColorSizeSelector: React.FC<ColorSizeSelectorProps> = ({
  template,
  templateData,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  onNext,
  onBack,
}) => {
  const [showAllColors, setShowAllColors] = useState(false);

  // Get colors from template or templateData
  const colors = templateData?.colors || template.colors || [];
  const sizes = templateData?.sizes || template.sizes || [];

  const displayColors = showAllColors ? colors : colors.slice(0, 5);
  const hasMoreColors = colors.length > 5;

  const canProceed = selectedColor && selectedSize;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Color Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Select Color</h2>
          <p className="text-sm text-gray-500 mt-1">Choose your preferred color</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {displayColors.map((color) => {
            const isHex = typeof color === 'string' && color.startsWith('#');
            const colorValue = isHex ? color : (color as any).hex || '#CCCCCC';
            const colorName = isHex ? getColorName(color) : color;
            const isSelected = selectedColor === color;

            return (
              <button
                key={color}
                onClick={() => onSelectColor(color)}
                className={`
                  relative group flex flex-col items-center transition-all
                  ${isSelected ? 'scale-110' : 'hover:scale-105'}
                `}
                title={colorName}
              >
                {/* Color Circle */}
                <div
                  className={`
                    w-16 h-16 rounded-full border-4 transition-all shadow-lg
                    ${isSelected 
                      ? 'border-black ring-4 ring-black/20' 
                      : 'border-gray-300 hover:border-gray-400'}
                  `}
                  style={{ backgroundColor: colorValue }}
                />

                {/* Color Name (only for selected) */}
                {isSelected && (
                  <span className="mt-2 text-xs font-black uppercase tracking-wider">
                    {colorName}
                  </span>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* More Colors Button */}
          {hasMoreColors && !showAllColors && (
            <button
              onClick={() => setShowAllColors(true)}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all hover:scale-105"
            >
              <ChevronDown className="h-5 w-5 text-gray-400" />
              <span className="text-[9px] text-gray-500 mt-1">+{colors.length - 5}</span>
            </button>
          )}

          {/* Show Less Button */}
          {hasMoreColors && showAllColors && (
            <button
              onClick={() => setShowAllColors(false)}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all hover:scale-105"
            >
              <ChevronUp className="h-5 w-5 text-gray-400" />
              <span className="text-[9px] text-gray-500 mt-1">Less</span>
            </button>
          )}
        </div>

        {!selectedColor && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            ⚠️ Please select a color to continue
          </p>
        )}
      </div>

      {/* Size Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Select Size</h2>
          <p className="text-sm text-gray-500 mt-1">Choose your size</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {sizes.map((size) => {
            const isSelected = selectedSize === size;

            return (
              <button
                key={size}
                onClick={() => onSelectSize(size)}
                className={`
                  px-6 py-4 rounded-2xl border-2 font-black uppercase text-sm transition-all min-w-[80px]
                  ${isSelected 
                    ? 'border-black bg-black text-white shadow-lg scale-105' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                `}
              >
                {size}
              </button>
            );
          })}
        </div>

        {!selectedSize && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
            ⚠️ Please select a size to continue
          </p>
        )}
      </div>

      {/* Selected Summary */}
      {(selectedColor || selectedSize) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <p className="text-xs font-black uppercase text-blue-900 mb-2">Your Selection</p>
          <div className="flex items-center gap-4 text-sm">
            {selectedColor && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-blue-300"
                  style={{ 
                    backgroundColor: selectedColor.startsWith('#') 
                      ? selectedColor 
                      : (selectedColor as any).hex || '#CCCCCC' 
                  }}
                />
                <span className="font-bold text-blue-900">
                  {selectedColor.startsWith('#') ? getColorName(selectedColor) : selectedColor}
                </span>
              </div>
            )}
            {selectedSize && (
              <div className="flex items-center gap-2">
                <span className="text-blue-700">Size:</span>
                <span className="font-bold text-blue-900">{selectedSize}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="rounded-xl h-12 px-6 text-sm font-black uppercase"
          >
            ← Back
          </Button>

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="rounded-xl h-12 px-8 text-sm font-black uppercase bg-black hover:bg-neutral-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Design Studio
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
