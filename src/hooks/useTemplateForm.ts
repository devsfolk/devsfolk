import { useState } from 'react';

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

export interface GeneratorSettings {
  enableColorization: boolean;
  maskImageUrl: string;
  baseImageUrl: string;
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
  generatorSettings: GeneratorSettings;
}

export const useTemplateForm = (initialData?: Partial<TemplateFormData>) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    id: initialData?.id,
    blueprintId: initialData?.blueprintId || null,
    title: initialData?.title || '',
    description: initialData?.description || '',
    images: initialData?.images || [],
    primaryImageIndex: initialData?.primaryImageIndex || 0,
    colors: initialData?.colors || [],
    newColor: '',
    sizes: initialData?.sizes || [],
    printAreas: initialData?.printAreas || [],
    generatorSettings: initialData?.generatorSettings || {
      enableColorization: false,
      maskImageUrl: '',
      baseImageUrl: '',
    },
  });

  return { formData, setFormData };
};
