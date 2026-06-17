import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, PrintifyCatalogTemplate } from '@/types';

interface PreviewCheckoutProps {
  template: Product;
  templateData?: PrintifyCatalogTemplate;
  selectedColor: string;
  selectedSize: string;
  designData: string;
  hasText: boolean;
  hasDesign: boolean;
  onAddToCart: () => void;
  onBack: () => void;
  currencySymbol: string;
  editorCharges: {
    textOnly?: number;
    designOnly?: number;
    textAndDesign?: number;
    areaMultiplier?: {
      enabled: boolean;
      threshold: number;
      surcharge: number;
    };
  };
}

export const PreviewCheckout: React.FC<PreviewCheckoutProps> = ({
  template,
  templateData,
  selectedColor,
  selectedSize,
  designData,
  hasText,
  hasDesign,
  onAddToCart,
  onBack,
  currencySymbol,
  editorCharges,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);

  // Calculate pricing
  const basePrice = template.price || 0;
  
  let customizationFee = 0;
  if (hasText && hasDesign) {
    customizationFee = editorCharges.textAndDesign || 0;
  } else if (hasDesign) {
    customizationFee = editorCharges.designOnly || 0;
  } else if (hasText) {
    customizationFee = editorCharges.textOnly || 0;
  }

  // Area-based surcharge (placeholder - would need actual coverage calculation)
  // For now, assume no surcharge unless we implement coverage detection
  const areaSurcharge = 0;
  
  const totalPrice = basePrice + customizationFee + areaSurcharge;

  // Generate merged preview
  useEffect(() => {
    generatePreview();
  }, []);

  const generatePreview = async () => {
    setIsGenerating(true);
    
    try {
      // Create canvas for compositing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size
      canvas.width = 800;
      canvas.height = 800;

      // Layer 1: Solid color background
      ctx.fillStyle = selectedColor.startsWith('#') ? selectedColor : '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layer 2: Template image (alpha shadow overlay)
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        templateImg.onload = resolve;
        templateImg.onerror = reject;
        templateImg.src = template.images[0] || '/custom-tee-mockup.png';
      });

      // Draw template with multiply blend effect
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
      
      // Reset composite operation
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      // Layer 3: Customer design (from canvas export)
      if (designData) {
        const designImg = new Image();
        
        await new Promise((resolve, reject) => {
          designImg.onload = resolve;
          designImg.onerror = reject;
          designImg.src = designData;
        });

        // Calculate print area position
        const printArea = templateData?.printAreas?.[0] || {
          x: 30,
          y: 25,
          width: 40,
          height: 50,
        };

        const x = (canvas.width * printArea.x) / 100;
        const y = (canvas.height * printArea.y) / 100;
        const width = (canvas.width * printArea.width) / 100;
        const height = (canvas.height * printArea.height) / 100;

        ctx.drawImage(designImg, x, y, width, height);
      }

      // Convert to data URL
      const finalPreview = canvas.toDataURL('image/png', 1.0);
      setPreviewUrl(finalPreview);
    } catch (err) {
      console.error('[Preview Generation] Error:', err);
      // Fallback to design data if composite fails
      setPreviewUrl(designData);
    } finally {
      setIsGenerating(false);
    }
  };

  const getColorName = (color: string): string => {
    const colorMap: Record<string, string> = {
      '#FFFFFF': 'White',
      '#000000': 'Black',
      '#111827': 'Black',
      '#EF4444': 'Red',
      '#3B82F6': 'Blue',
      '#10B981': 'Green',
    };
    
    return colorMap[color.toUpperCase()] || color;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-32">
      {/* Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview Image */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Your Custom Design</h2>
            <p className="text-sm text-gray-500 mt-1">Preview of the final product</p>
          </div>

          <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-gray-300 shadow-xl bg-gray-50">
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
                  <p className="text-sm text-gray-600 font-bold">Generating preview...</p>
                </div>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Custom Design Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Quality Badge */}
          <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-xs font-bold text-green-900">High-quality print guaranteed</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Order Summary</h2>
            <p className="text-sm text-gray-500 mt-1">Review your customization</p>
          </div>

          {/* Product Details */}
          <div className="p-6 bg-white border-2 border-gray-200 rounded-3xl space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Product</p>
              <p className="text-lg font-black">{template.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Color</p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-gray-300"
                    style={{ 
                      backgroundColor: selectedColor.startsWith('#') ? selectedColor : '#CCCCCC' 
                    }}
                  />
                  <p className="text-sm font-bold">
                    {selectedColor.startsWith('#') ? getColorName(selectedColor) : selectedColor}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Size</p>
                <p className="text-sm font-bold mt-1">{selectedSize}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Customization</p>
              <div className="space-y-1 text-sm">
                {hasDesign && (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Custom design uploaded</span>
                  </div>
                )}
                {hasText && (
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>Custom text added</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-3xl space-y-3">
            <p className="text-sm font-black uppercase tracking-wider">Price Breakdown</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Template Base Price</span>
                <span className="font-bold">{currencySymbol}{basePrice.toFixed(2)}</span>
              </div>

              {customizationFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    + Customization Fee
                    {hasText && hasDesign && ' (Text + Design)'}
                    {hasText && !hasDesign && ' (Text Only)'}
                    {!hasText && hasDesign && ' (Design Only)'}
                  </span>
                  <span className="font-bold">{currencySymbol}{customizationFee.toFixed(2)}</span>
                </div>
              )}

              {areaSurcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Area Coverage Surcharge</span>
                  <span className="font-bold">{currencySymbol}{areaSurcharge.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-gray-300 flex justify-between">
                <span className="text-lg font-black">Total</span>
                <span className="text-lg font-black text-green-600">
                  {currencySymbol}{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-xs text-blue-900 font-bold">📦 What happens next?</p>
            <p className="text-xs text-blue-700 mt-2 leading-relaxed">
              After adding to cart, your custom design will be saved. You can proceed to checkout or continue shopping.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            className="rounded-xl h-12 px-6 text-sm font-black uppercase"
          >
            ← Edit Design
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Price</p>
              <p className="text-2xl font-black text-green-600">
                {currencySymbol}{totalPrice.toFixed(2)}
              </p>
            </div>

            <Button
              onClick={onAddToCart}
              disabled={isGenerating}
              className="rounded-xl h-12 px-8 text-sm font-black uppercase bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Add Customized to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
