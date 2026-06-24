import { useState, useEffect } from 'react';

export interface SizePrice {
  size: string;
  baseCost: number;
  sellingPrice: number;
}

export interface PrintArea {
  // Identification
  id?: string;                    // Unique ID: "pa_front_main" (optional for backwards compat)
  name: string;                   // "Front Chest Design"
  view?: 'front' | 'back' | 'side' | 'sleeve_left' | 'sleeve_right' | 'label'; // View-based (new)
  position: string;               // Legacy field (keep for backwards compat) - "front", "back", etc.
  
  // Percentage-based coordinates (for responsive UI - primary)
  x: number;                      // 25 (percentage from left)
  y: number;                      // 20 (percentage from top)
  width: number;                  // 50 (percentage width)
  height: number;                 // 60 (percentage height)
  
  // Pixel-based coordinates (for Fabric.js precision - optional, calculated dynamically)
  pixelX?: number;                // 250 (pixels from left at reference size)
  pixelY?: number;                // 200 (pixels from top)
  pixelWidth?: number;            // 500 (pixel width)
  pixelHeight?: number;           // 600 (pixel height)
  
  // Reference dimensions (mockup used during admin setup - optional)
  referenceMockupWidth?: number;  // 1000 (mockup image width in pixels)
  referenceMockupHeight?: number; // 1000 (mockup image height in pixels)
  referenceMockupUrl?: string;    // URL of mockup used for positioning
  
  // Print specifications
  dpi?: number;                   // 300 (default)
  printProviderId?: number;       // Printify provider ID (optional)
  printAreaId?: number;           // Printify print area ID if synced (optional)
}

export interface TemplateFormData {
  id?: string;
  blueprintId: number | null;
  title: string;
  description: string;
  images: string[];
  primaryImageIndex: number;
  colors: string[];
  newColor: string;
  sizes: SizePrice[];
  printAreas: PrintArea[];
  providers: any[];
  colorMockups: Record<string, {
    front?: string;
    back?: string;
    side?: string;
  }>;
}

const getDefaultFormData = (): TemplateFormData => ({
  id: undefined,
  blueprintId: null,
  title: '',
  description: '',
  images: [],
  primaryImageIndex: 0,
  colors: [],
  newColor: '',
  sizes: [],
  printAreas: [],
  providers: [],
  colorMockups: {},
});

export const useTemplateForm = (initialData?: Partial<TemplateFormData>) => {
  const [formData, setFormData] = useState<TemplateFormData>(() => {
    if (!initialData) return getDefaultFormData();
    
    return {
      ...getDefaultFormData(),
      ...initialData,
    };
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...getDefaultFormData(),
        ...initialData,
      });
    } else {
      setFormData(getDefaultFormData());
    }
  }, [initialData?.id]); // Only reset when template ID changes

  return { formData, setFormData };
};
