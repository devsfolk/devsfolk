import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BlueprintSearch } from '../BlueprintSearch';
import { Upload, X, Star } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplateForm';

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
  const [imageUrl, setImageUrl] = useState('');

  const handleBlueprintSelect = (blueprintId: number, title: string) => {
    setFormData(prev => ({
      ...prev,
      blueprintId,
      title: prev.title || title,
    }));
  };

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl.trim()],
      }));
      setImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      primaryImageIndex: prev.primaryImageIndex >= index ? Math.max(0, prev.primaryImageIndex - 1) : prev.primaryImageIndex,
    }));
  };

  const setPrimaryImage = (index: number) => {
    setFormData(prev => ({ ...prev, primaryImageIndex: index }));
  };

  const addColor = () => {
    if (formData.newColor.trim() && !formData.colors.includes(formData.newColor.trim())) {
      setFormData(prev => ({
        ...prev,
        colors: [...prev.colors, prev.newColor.trim()],
        newColor: '',
      }));
    }
  };

  const removeColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter(c => c !== color),
    }));
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

      {/* Images/Media Grid */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Product Images / Mockups
        </Label>

        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Paste image URL..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addImage()}
            className="rounded-xl h-11 text-xs flex-1"
          />
          <Button
            type="button"
            onClick={addImage}
            className="rounded-xl h-11 px-4 text-[10px] font-black uppercase"
          >
            <Upload className="h-3 w-3 mr-2" />
            Add
          </Button>
        </div>

        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {formData.images.map((img, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <img
                    src={img}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/custom-tee-mockup.png';
                    }}
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPrimaryImage(index)}
                    className={`p-1.5 rounded-lg ${
                      formData.primaryImageIndex === index
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/90 text-gray-600 hover:bg-yellow-500 hover:text-white'
                    } transition-colors`}
                    title="Set as primary"
                  >
                    <Star className="h-3 w-3" fill={formData.primaryImageIndex === index ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Color Picker */}
      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase text-gray-400 pl-1">
          Available Colors
        </Label>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter color (e.g., Black, White, #FF0000)"
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
            Add Color
          </Button>
        </div>

        {formData.colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.colors.map((color, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl border"
              >
                {color.startsWith('#') && (
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-xs font-bold">{color}</span>
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
