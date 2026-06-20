import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info, Layers } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplateForm';

interface GeneratorTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
}

export const GeneratorTab: React.FC<GeneratorTabProps> = ({
  formData,
  setFormData,
}) => {
  const updateGeneratorSettings = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      generatorSettings: {
        ...prev.generatorSettings,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-700 leading-relaxed">
          <p className="font-bold mb-1">Smart Colorization Engine</p>
          <p>
            Enable dynamic color generation to automatically tint product mockups when customers
            select different colors in the storefront. This eliminates the need to upload separate
            images for each color variant.
          </p>
        </div>
      </div>

      {/* Enable Colorization */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
        <div>
          <Label className="text-xs font-black uppercase tracking-tight">
            Enable Color Tinting
          </Label>
          <p className="text-[10px] text-gray-500 mt-1">
            Dynamically generate color variants from a single base image
          </p>
        </div>
        <Switch
          checked={formData.generatorSettings.enableColorization}
          onCheckedChange={(checked) => updateGeneratorSettings('enableColorization', checked)}
        />
      </div>

      {formData.generatorSettings.enableColorization && (
        <>
          {/* Two-Layer System Explanation */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <Layers className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-purple-900 leading-relaxed">
                <p className="font-bold mb-2">Two-Layer Colorization System</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-[9px] font-black shrink-0">
                      LAYER 1
                    </span>
                    <p><strong>Base Image:</strong> Clean garment photo with transparent/white background</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 bg-pink-200 text-pink-900 rounded text-[9px] font-black shrink-0">
                      LAYER 2
                    </span>
                    <p><strong>Mask Overlay:</strong> Transparent PNG with shadows, folds, and highlights preserved</p>
                  </div>
                </div>
                <p className="mt-2 text-[10px]">
                  The system places the colored div behind the mask to create photorealistic results
                  while preserving fabric texture and lighting.
                </p>
              </div>
            </div>
          </div>

          {/* Base Image URL */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
              Base Image URL (Layer 1)
            </Label>
            <Input
              type="url"
              placeholder="https://example.com/garment-base.png"
              value={formData.generatorSettings.baseImageUrl}
              onChange={(e) => updateGeneratorSettings('baseImageUrl', e.target.value)}
              className="rounded-xl h-11 text-xs"
            />
            <p className="text-[9px] text-gray-500 pl-1">
              Clean product photo with transparent or white background (will be color-tinted)
            </p>

            {formData.generatorSettings.baseImageUrl && (
              <div className="mt-2 p-2 bg-white border rounded-xl">
                <img
                  src={formData.generatorSettings.baseImageUrl}
                  alt="Base preview"
                  className="w-32 h-32 object-contain mx-auto"
                  onError={(e) => {
                    e.currentTarget.src = '/custom-tee-mockup.png';
                  }}
                />
                <p className="text-[9px] text-center text-gray-500 mt-1">Base Image Preview</p>
              </div>
            )}
          </div>

          {/* Mask Image URL */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
              Shadow/Highlight Mask URL (Layer 2)
            </Label>
            <Input
              type="url"
              placeholder="https://example.com/garment-mask.png"
              value={formData.generatorSettings.maskImageUrl}
              onChange={(e) => updateGeneratorSettings('maskImageUrl', e.target.value)}
              className="rounded-xl h-11 text-xs"
            />
            <p className="text-[9px] text-gray-500 pl-1">
              Transparent PNG with shadows, folds, and highlights (overlays on colored base)
            </p>

            {formData.generatorSettings.maskImageUrl && (
              <div className="mt-2 p-2 bg-white border rounded-xl">
                <img
                  src={formData.generatorSettings.maskImageUrl}
                  alt="Mask preview"
                  className="w-32 h-32 object-contain mx-auto"
                  onError={(e) => {
                    e.currentTarget.src = '/custom-tee-mockup.png';
                  }}
                />
                <p className="text-[9px] text-center text-gray-500 mt-1">Mask Image Preview</p>
              </div>
            )}
          </div>

          {/* Preview Demo */}
          {formData.generatorSettings.baseImageUrl && formData.generatorSettings.maskImageUrl && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
                Preview Demo (How it will look)
              </Label>

              {formData.colors.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {formData.colors.slice(0, 6).map((color) => {
                    // Convert color names to hex if needed (basic mapping)
                    const colorMap: Record<string, string> = {
                      'black': '#000000',
                      'white': '#FFFFFF',
                      'red': '#FF0000',
                      'blue': '#0000FF',
                      'green': '#00FF00',
                      'yellow': '#FFFF00',
                      'navy': '#000080',
                      'gray': '#808080',
                      'grey': '#808080',
                    };
                    
                    const colorValue = color.startsWith('#') 
                      ? color 
                      : colorMap[color.toLowerCase()] || '#CCCCCC';

                    return (
                      <div key={color} className="space-y-1">
                        <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2">
                          {/* Layer 1: Colored background */}
                          <div
                            className="absolute inset-0"
                            style={{ backgroundColor: colorValue }}
                          />
                          {/* Layer 2: Mask overlay */}
                          <img
                            src={formData.generatorSettings.maskImageUrl}
                            alt="Mask"
                            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
                          />
                        </div>
                        <p className="text-[9px] text-center text-gray-600 font-bold truncate">{color}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-[10px] text-yellow-800">
                    No colors defined yet. Go to Display Tab → Add colors or use Load Prices to populate colors from Printify.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
