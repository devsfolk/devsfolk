import { useState, useEffect } from 'react';

export interface SizePrice {
  size: string;
  baseCost: number;
  sellingPrice: number;
}

export interface PrintArea {
  name: string;
  position: string;
  width: number;
  height: number;
  x: number;
  y: number;
  dpi?: number;
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
