import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TemplateImageGalleryProps {
  images: string[];
  variantImages?: Record<string, string[]>;
  colors?: string[];
  title: string;
}

export const TemplateImageGallery: React.FC<TemplateImageGalleryProps> = ({
  images,
  variantImages = {},
  colors = [],
  title,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeColorFilter, setActiveColorFilter] = useState<string>('all');

  // Group images by color if variant images available
  const imagesByColor: Record<string, string[]> = {};
  
  if (Object.keys(variantImages).length > 0) {
    // Organize by color using variant images
    Object.entries(variantImages).forEach(([variantId, imgs]) => {
      // Try to find color from variant ID or just add to general
      imgs.forEach(img => {
        const existingColor = Object.keys(imagesByColor).find(color => 
          imagesByColor[color].includes(img)
        );
        if (!existingColor) {
          imagesByColor['General'] = imagesByColor['General'] || [];
          if (!imagesByColor['General'].includes(img)) {
            imagesByColor['General'].push(img);
          }
        }
      });
    });
  } else {
    imagesByColor['All Images'] = images;
  }

  // Get color options from colors prop or image groups
  const colorOptions = colors.length > 0 ? ['all', ...colors] : ['all', ...Object.keys(imagesByColor)];

  // Filter images based on active color
  const displayImages = activeColorFilter === 'all' 
    ? images 
    : imagesByColor[activeColorFilter] || images;

  const openLightbox = (img: string) => {
    setSelectedImage(img);
    setLightboxIndex(displayImages.indexOf(img));
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % displayImages.length);
    setSelectedImage(displayImages[(lightboxIndex + 1) % displayImages.length]);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    setSelectedImage(displayImages[(lightboxIndex - 1 + displayImages.length) % displayImages.length]);
  };

  return (
    <div className="space-y-4">
      {/* Color Filter */}
      {colorOptions.length > 2 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-black uppercase text-gray-400 self-center">Filter:</span>
          {colorOptions.map((color) => (
            <Button
              key={color}
              variant={activeColorFilter === color ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveColorFilter(color)}
              className="h-7 text-[10px] font-bold uppercase rounded-lg"
            >
              {color}
              {color !== 'all' && imagesByColor[color] && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[8px]">
                  {imagesByColor[color].length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {displayImages.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 border border-dashed rounded-xl">
          No images available
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {displayImages.map((img, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 hover:border-black transition-all cursor-pointer bg-gray-50"
              onClick={() => openLightbox(img)}
            >
              <img
                src={img}
                alt={`${title} - Image ${idx + 1}`}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/custom-tee-mockup.png';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Maximize2 className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[8px] text-white font-bold uppercase truncate">Image {idx + 1}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 rounded-full"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation Buttons */}
            {displayImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 rounded-full"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Image */}
            <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] p-8">
              <img
                src={selectedImage || ''}
                alt={`${title} - Full size`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold">
              {lightboxIndex + 1} / {displayImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
