import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BlueprintSearch } from '../BlueprintSearch';
import { Upload, X, ChevronDown, ChevronUp, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplateForm';
import { supabase } from '@/lib/supabase';

interface DisplayTabProps {
  formData: TemplateFormData;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  apiKey: string;
}

export const DisplayTab: React.FC<DisplayTabProps> = ({
  formData,
  setFormData,
  apiKey,
}) => {
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});

  const handleBlueprintSelect = (blueprintId: number, title: string) => {
    setFormData(prev => ({
      ...prev,
      blueprintId,
      title: prev.title || title,
    }));
  };

  const toggleExpanded = (color: string) => {
    setExpandedColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) {
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
  };

  const updateMockupUrl = (color: string, view: 'front' | 'back' | 'side', url: string) => {
    setFormData(prev => ({
      ...prev,
      colorMockups: {
        ...prev.colorMockups,
        [color]: {
          ...prev.colorMockups[color],
          [view]: url || undefined,
        },
      },
    }));
  };

  const deleteColor = (color: string) => {
    const confirmed = confirm(`Delete "${color}" and all its mockup images?`);
    if (!confirmed) return;

    setFormData(prev => {
      const { [color]: removed, ...remainingMockups } = prev.colorMockups;
      return {
        ...prev,
        colors: prev.colors.filter(c => c !== color),
        colorMockups: remainingMockups,
      };
    });
  };

  const addColor = () => {
    if (formData.newColor.trim() && !formData.colors.includes(formData.newColor.trim())) {
      const colorName = formData.newColor.trim();
      setFormData(prev => ({
        ...prev,
        colors: [...prev.colors, colorName],
        newColor: '',
        colorMockups: {
          ...prev.colorMockups,
          [colorName]: {},
        },
      }));
      // Auto-expand new color
      setExpandedColors(prev => new Set(prev).add(colorName));
    }
  };

  const handleFileUpload = async (color: string, view: 'front' | 'back' | 'side', file: File) => {
    const uploadKey = `${color}-${view}`;
    setUploadingStates(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `mockups/${color.toLowerCase().replace(/\s+/g, '-')}-${view}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Update form data
      updateMockupUrl(color, view, publicUrl);
    } catch (err: any) {
      console.error('[File Upload Error]:', err);
      alert(`Upload failed: ${err.message}\n\nNote: If storage bucket doesn't exist, you may need to create it in Supabase dashboard.`);
    } finally {
      setUploadingStates(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const getMockupCount = (color: string): number => {
    const mockups = formData.colorMockups[color];
    if (!mockups) return 0;
    return [mockups.front, mockups.back, mockups.side].filter(Boolean).length;
  };

  const getColorHex = (color: string): string => {
    if (color.startsWith('#')) return color;
    
    const colorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'blue': '#0000FF',
      'navy': '#000080',
      'green': '#00FF00',
      'yellow': '#FFFF00',
      'gray': '#808080',
      'grey': '#808080',
      'army': '#4B5320',
    };
    
    return colorMap[color.toLowerCase()] || '#CCCCCC';
  };

  return (
    <div className="space-y-6">
      {/* Blueprint ID Search */}
      <div className="space-y-3">
        <div>
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Printify Blueprint ID (Bridge Field)
          </Label>
          <p className="text-[9px] text-gray-500 mt-1 pl-1">
            Search and select a Printify blueprint to auto-sync data, or leave empty for manual entry
          </p>
        </div>

        <BlueprintSearch
          apiKey={apiKey}
          onSelect={handleBlueprintSelect}
        />

        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Or enter Blueprint ID manually (e.g., 6)"
            value={formData.blueprintId || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, blueprintId: e.target.value ? Number(e.target.value) : null }))}
            className="rounded-xl h-11 text-xs"
          />
          {formData.blueprintId && (
            <span className="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-black whitespace-nowrap">
              ✓ ID: {formData.blueprintId}
            </span>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Template Title
          </Label>
          <Input
            type="text"
            placeholder="e.g., Unisex Heavy Cotton Tee"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="rounded-xl h-11 text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
            Description
          </Label>
          <Textarea
            placeholder="Enter product description..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="rounded-xl text-xs min-h-[100px]"
          />
        </div>
      </div>

      {/* Color Mockups Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
              Color-Specific Mockups
            </Label>
            <p className="text-[9px] text-gray-500 mt-1 pl-1">
              Upload mockup images for each color variant (Front/Back/Side views)
            </p>
          </div>
        </div>

        {/* Add New Color Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter color name (e.g., Black, White, Army)"
            value={formData.newColor}
            onChange={(e) => setFormData(prev => ({ ...prev, newColor: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && addColor()}
            className="rounded-xl h-11 text-xs flex-1"
          />
          <Button
            type="button"
            onClick={addColor}
            className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
          >
            <ImagePlus className="h-3 w-3 mr-2" />
            Add Color
          </Button>
        </div>

        {/* Color Cards */}
        {formData.colors.length > 0 ? (
          <div className="space-y-3">
            {formData.colors.map((color) => {
              const isExpanded = expandedColors.has(color);
              const mockupCount = getMockupCount(color);
              const colorHex = getColorHex(color);

              return (
                <div
                  key={color}
                  className={`border-2 rounded-2xl transition-all ${
                    isExpanded ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Color Card Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Color Preview Dot */}
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                      />

                      {/* Color Name */}
                      <div>
                        <span className="font-black text-sm uppercase tracking-tight">{color}</span>
                        {mockupCount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded">
                              {mockupCount} mockup{mockupCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleExpanded(color)}
                        className="rounded-xl h-9 px-3 text-[10px] font-black uppercase"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ImagePlus className="h-3 w-3 mr-1" />
                            {mockupCount > 0 ? 'Edit' : 'Add'} Images
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => deleteColor(color)}
                        className="rounded-xl h-9 px-3 text-[10px] font-black uppercase text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Content: View Inputs */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      {(['front', 'back', 'side'] as const).map((view) => {
                        const currentUrl = formData.colorMockups[color]?.[view];
                        const uploadKey = `${color}-${view}`;
                        const isUploading = uploadingStates[uploadKey];
                        const viewLabel = view === 'front' ? 'Front View' : view === 'back' ? 'Back View (Optional)' : 'Side View (Optional)';

                        return (
                          <div key={view} className="border border-gray-200 rounded-xl p-3 bg-white">
                            <Label className="text-xs font-black uppercase mb-2 block text-gray-700">
                              {viewLabel}
                            </Label>

                            <div className="flex gap-2">
                              {/* URL Input */}
                              <Input
                                type="url"
                                placeholder={`Paste ${view} mockup URL...`}
                                value={currentUrl || ''}
                                onChange={(e) => updateMockupUrl(color, view, e.target.value)}
                                className="flex-1 rounded-lg h-10 text-xs"
                              />

                              {/* OR Divider */}
                              <div className="flex items-center px-2 text-[10px] font-black text-gray-400">
                                OR
                              </div>

                              {/* File Upload Button */}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(`file-${color}-${view}`)?.click()}
                                disabled={isUploading}
                                className="rounded-lg h-10 px-4"
                              >
                                {isUploading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                              </Button>

                              {/* Hidden File Input */}
                              <input
                                id={`file-${color}-${view}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(color, view, file);
                                }}
                              />
                            </div>

                            {/* Preview Thumbnail */}
                            {currentUrl && (
                              <div className="mt-3 flex items-start gap-3">
                                <img
                                  src={currentUrl}
                                  alt={`${color} ${view}`}
                                  className="w-24 h-24 object-contain border-2 border-gray-200 rounded-lg bg-gray-50"
                                  onError={(e) => {
                                    e.currentTarget.src = '/custom-tee-mockup.png';
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateMockupUrl(color, view, '')}
                                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-gray-50 border-2 border-dashed rounded-2xl text-center">
            <ImagePlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-600">No colors added yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Add colors above, or go to Prices Tab → Load Prices to auto-sync from Printify
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
