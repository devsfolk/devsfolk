import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrintifyCatalog } from '@/hooks/usePrintifyCatalog';
import { Product, PrintifyCatalogTemplate, PrintifyCustomization } from '@/types';
import { isRawPrintifyTemplateProduct } from '@/lib/printifyProductGuards';
import { EditorStepIndicator } from './editor/EditorStepIndicator';
import { TemplateSelector } from './editor/TemplateSelector';
import { ColorSizeSelector } from './editor/ColorSizeSelector';
import { DesignStudio } from './editor/DesignStudio';
import { PreviewCheckout } from './editor/PreviewCheckout';

interface BespokeCustomizerProps {
  productSlug?: string;
  showHeader?: boolean;
}

export const BespokeCustomizer: React.FC<BespokeCustomizerProps> = ({ productSlug, showHeader = true }) => {
  const navigate = useNavigate();
  const { products, settings, addToCart } = useShop();
  const { editorReadyTemplates } = usePrintifyCatalog();

  // Step Management
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [designData, setDesignData] = useState<string>('');
  const [hasText, setHasText] = useState(false);
  const [hasDesign, setHasDesign] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const normalizeTemplateImage = (image: any) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.src || image.url || image.preview_url || '';
  };

  const calculateTemplateRetailPrice = (basePrice: number) => {
    return Number(basePrice.toFixed(2));
  };

  const templateToEditorProduct = (template: PrintifyCatalogTemplate): Product => {
    const images = template.images.map(normalizeTemplateImage).filter(Boolean);

    return {
      id: `printify_template_${template.id}`,
      categoryId: 'cat_printify',
      name: template.title,
      slug: `printify-template-${template.blueprintId}`,
      description: template.description || `${template.brand || 'Printify'} customizable blank template.`,
      price: calculateTemplateRetailPrice(template.sellingPrice ?? template.retailPrice ?? template.baseCost ?? 0),
      images: images.length > 0 ? images : ['/custom-tee-mockup.png'],
      stock: 999,
      isFeatured: false,
      variants: [],
      createdAt: Date.now(),
      isPrintify: true,
      printifyCatalogId: String(template.blueprintId),
      colors: template.colors || [],
      sizes: template.sizes || [],
    };
  };

  const getSyncedVariantId = (variant: any) => (
    Number(variant?.id || variant?.variant_id || variant?.printify_variant_id) || 0
  );

  const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => (
    !!template &&
    Array.isArray(template.providers) &&
    template.providers.length > 0 &&
    Array.isArray(template.variants) &&
    template.variants.some((variant: any) => getSyncedVariantId(variant) > 0)
  );

  // Get available templates
  const customProducts = useMemo(() => {
    const syncedTemplateProducts = products.filter((product) => (
      isRawPrintifyTemplateProduct(product) &&
      (
        product.variants?.some((variant: any) => getSyncedVariantId(variant) > 0 && variant.stock !== 0) ||
        templateHasCheckoutMetadata(editorReadyTemplates.find((template) => String(template.blueprintId) === product.printifyCatalogId))
      )
    ));
    const syncedTemplateIds = new Set(syncedTemplateProducts.map((product) => product.printifyCatalogId).filter(Boolean));
    const catalogTemplateProducts = editorReadyTemplates
      .filter(templateHasCheckoutMetadata)
      .filter((template) => !syncedTemplateIds.has(String(template.blueprintId)))
      .map(templateToEditorProduct);

    return [...syncedTemplateProducts, ...catalogTemplateProducts];
  }, [products, editorReadyTemplates]);

  const filteredProducts = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return customProducts;

    return customProducts.filter((product) => (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.printifyCatalogId?.toLowerCase().includes(query)
    ));
  }, [customProducts, templateSearch]);

  const getTemplateForProduct = (product?: Product) => {
    if (!product) return undefined;

    const candidateIds = [
      product.printifyCatalogId,
      product.printifyProductId?.replace(/^template_/, ''),
      product.id.replace(/^printify_template_/, ''),
      product.id.replace(/^printify_template_bp_/, ''),
    ].filter(Boolean).map(String);

    return editorReadyTemplates.find((template) => (
      candidateIds.includes(String(template.blueprintId)) ||
      candidateIds.includes(String(template.id)) ||
      candidateIds.includes(template.id.replace(/^bp_/, ''))
    ));
  };

  const printifyEnabled = settings.printifySettings?.enabled;
  const editorCharges = settings.printifySettings?.charges?.editorCharges || {
    textOnly: 5,
    designOnly: 10,
    textAndDesign: 12,
    areaMultiplier: {
      enabled: false,
      threshold: 50,
      surcharge: 3,
    },
  };

  // Step Handlers
  const handleSelectTemplate = (template: Product) => {
    setSelectedTemplate(template);
  };

  const handleTemplateNext = () => {
    if (selectedTemplate) {
      setCurrentStep(2);
    }
  };

  const handleColorSizeNext = () => {
    if (selectedColor && selectedSize) {
      setCurrentStep(3);
    }
  };

  const handleDesignNext = (data: string) => {
    setDesignData(data);
    // Determine what was added based on canvas content
    // This is a simplified check - in production you'd analyze the canvas more carefully
    setHasDesign(true); // Assume design if we got here
    setHasText(true); // Assume text if we got here
    setCurrentStep(4);
  };

  const handleAddToCart = () => {
    if (!selectedTemplate || !selectedColor || !selectedSize) return;

    const customization: PrintifyCustomization = {
      hasText,
      hasDesign,
      designData,
      previewUrl: designData, // In production, this would be the merged preview
      coverage: 0, // Would be calculated from actual design dimensions
    };

    addToCart(
      selectedTemplate,
      undefined,
      1,
      {
        color: selectedColor,
        size: selectedSize,
        customization,
      }
    );

    alert('✓ Custom product added to cart!');
    navigate('/cart');
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4);
    }
  };

  if (!printifyEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Printify integration is disabled
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Enable it in Dashboard → Printify Settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {showHeader && (
        <div className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="rounded-xl h-10 px-4 text-xs font-black uppercase"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Button>
            
            <h1 className="text-lg font-black uppercase tracking-tight">
              {settings.shopName || 'Custom Design Studio'}
            </h1>

            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <EditorStepIndicator currentStep={currentStep} />

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 1 && (
            <TemplateSelector
              templates={filteredProducts}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleSelectTemplate}
              onNext={handleTemplateNext}
              searchQuery={templateSearch}
              onSearchChange={setTemplateSearch}
              currencySymbol={settings.currencySymbol}
            />
          )}

          {currentStep === 2 && selectedTemplate && (
            <ColorSizeSelector
              template={selectedTemplate}
              templateData={getTemplateForProduct(selectedTemplate)}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onSelectColor={setSelectedColor}
              onSelectSize={setSelectedSize}
              onNext={handleColorSizeNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && selectedTemplate && selectedColor && selectedSize && (
            <DesignStudio
              template={selectedTemplate}
              templateData={getTemplateForProduct(selectedTemplate)}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onNext={handleDesignNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && selectedTemplate && selectedColor && selectedSize && designData && (
            <PreviewCheckout
              template={selectedTemplate}
              templateData={getTemplateForProduct(selectedTemplate)}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              designData={designData}
              hasText={hasText}
              hasDesign={hasDesign}
              onAddToCart={handleAddToCart}
              onBack={handleBack}
              currencySymbol={settings.currencySymbol}
              editorCharges={editorCharges}
            />
          )}
        </div>
      </div>
    </div>
  );
};
