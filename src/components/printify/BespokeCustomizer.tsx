import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShop } from '@/context/ShopContext';
import { fabric } from 'fabric';
import { ArrowLeft, Upload, Type, Layout, ShoppingBag, RefreshCw, HelpCircle, Palette, RotateCcw, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Copy, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { optimizeImage } from '@/lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { usePrintifyCatalog } from '@/hooks/usePrintifyCatalog';
import { Product, PrintifyCatalogTemplate, PrintifyViewCustomization, PrintifyViewKey } from '@/types';
import { isRawPrintifyTemplateProduct } from '@/lib/printifyProductGuards';

interface BespokeCustomizerProps {
  productSlug?: string;
  showHeader?: boolean;
}

export const BespokeCustomizer: React.FC<BespokeCustomizerProps> = ({ productSlug, showHeader = true }) => {
  const navigate = useNavigate();
  const { products, settings, addToCart } = useShop();
  const { editorReadyTemplates } = usePrintifyCatalog();
  const [templateSearch, setTemplateSearch] = useState('');

  const normalizeTemplateImage = (image: any) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.src || image.url || image.preview_url || '';
  };

  const calculateTemplateRetailPrice = (basePrice: number) => {
    // Don't override $0.00 with hardcoded fallback - it should be visible if there's an issue
    return Number(basePrice.toFixed(2));
  };

  const calculateTemplateOrderPrice = (basePrice: number) => {
    return calculateTemplateRetailPrice(basePrice);
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

  // Filter raw Printify templates only. Admin-created Printify shop products remain storefront products.
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
  }, [products, editorReadyTemplates, settings.printifySettings?.charges]);

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
    if (!product) {
      return undefined;
    }

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

  const getPrimaryPrintifyProvider = (template?: PrintifyCatalogTemplate) => {
    const providers = Array.isArray(template?.providers) ? template.providers : [];
    return providers[0];
  };

  const getPrimaryPrintifyVariant = (template?: PrintifyCatalogTemplate) => {
    const variants = Array.isArray(template?.variants) ? template.variants : [];
    return variants.find((variant: any) => variant?.is_enabled !== false && variant?.is_available !== false) || variants[0];
  };

  const getPrintifyVariantId = (variant: any) => {
    if (!variant || typeof variant !== 'object') {
      return undefined;
    }

    const directId = Number(variant.id || variant.variant_id || variant.printify_variant_id);
    if (directId) {
      return directId;
    }

    const nestedValues = [variant.options, variant.variant, variant.data].filter(Boolean);
    for (const value of nestedValues) {
      if (Array.isArray(value)) {
        const found = value
          .map((entry) => getPrintifyVariantId(entry))
          .find(Boolean);
        if (found) return found;
      } else {
        const found = getPrintifyVariantId(value);
        if (found) return found;
      }
    }

    return undefined;
  };

  const normalizeOptionText = (value: any) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') {
      return String(value.title || value.name || value.value || value.label || '').trim();
    }
    return String(value).trim();
  };

  const getVariantOptionText = (variant: any, keys: string[]) => {
    if (!variant || typeof variant !== 'object') return '';

    for (const key of keys) {
      const direct = normalizeOptionText(variant[key]);
      if (direct) return direct;
    }

    const options = variant.options;
    if (Array.isArray(options)) {
      for (const option of options) {
        const optionName = normalizeOptionText(option?.name || option?.type || option?.key || option?.label).toLowerCase();
        const hasColorMetadata = !!option?.hex || (Array.isArray(option?.colors) && option.colors.length > 0);
        const isColorLookup = keys.some((key) => key === 'color' || key === 'colour');
        if (keys.some((key) => optionName.includes(key)) || (isColorLookup && hasColorMetadata)) {
          const value = normalizeOptionText(option?.title || option?.value || option?.name);
          if (value && value.toLowerCase() !== optionName) return value;
        }
      }
    }

    if (options && typeof options === 'object' && !Array.isArray(options)) {
      for (const key of keys) {
        const value = normalizeOptionText(options[key]);
        if (value) return value;
      }
    }

    return '';
  };

  const getVariantTitleParts = (variant: any) => (
    normalizeOptionText(variant?.title || variant?.name)
      .split(/\s*\/\s*|\s*,\s*/)
      .map((part) => part.trim())
      .filter(Boolean)
  );

  const isSizeToken = (value: string) => (
    /^(one size|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|\d+(\.\d+)?|[a-z]*\s?\d+x\d+|[a-z]*\s?\d+oz)$/i.test(value.trim())
  );

  const getVariantSize = (variant: any) => {
    const explicit = getVariantOptionText(variant, ['size']);
    if (explicit) return explicit;
    return getVariantTitleParts(variant).find(isSizeToken) || '';
  };

  const getVariantColor = (variant: any) => {
    const explicit = getVariantOptionText(variant, ['color', 'colour']);
    if (explicit) return explicit;
    return getVariantTitleParts(variant).find((part) => !isSizeToken(part)) || '';
  };

  const uniqueOptionValues = (values: string[]) => (
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
  );

  // Active product state
  const [activeProduct, setActiveProduct] = useState(() => {
    return customProducts.find((p) => p.slug === productSlug) || 
           customProducts[0];
  });

  const printifyEnabled = settings.printifySettings?.enabled;
  const aiPreviewEnabled = settings.printifySettings?.preview?.aiEnabled;
  const activeTemplate = getTemplateForProduct(activeProduct);
  const activePrintifyProvider = getPrimaryPrintifyProvider(activeTemplate);

  // Helper: Extract size-specific pricing from variants array (admin saves pricing here)
  const getSizePricingFromVariants = (template: typeof activeTemplate) => {
    if (!template?.variants || !Array.isArray(template.variants)) {
      return [];
    }
    
    return template.variants.map((variant: any) => {
      const size = variant.title || String(variant.id || '');
      
      // Handle cost: Printify uses cents (1000 = $10.00), but some may store dollars
      const costValue = Number(variant.cost || 0);
      const baseCost = costValue > 0
        ? (costValue < 100 && !Number.isInteger(costValue) ? costValue : costValue / 100)
        : 0;
      
      // Handle price: Printify uses cents (1999 = $19.99), but some may store dollars
      const priceValue = Number(variant.price || 0);
      const sellingPrice = priceValue > 0
        ? (priceValue < 100 && !Number.isInteger(priceValue) ? priceValue : priceValue / 100)
        : 0;
      
      return { size, baseCost, sellingPrice };
    });
  };

  useEffect(() => {
    const nextActiveProduct = customProducts.find((p) => p.slug === productSlug) || customProducts[0];
    if (!activeProduct || !customProducts.some((p) => p.id === activeProduct.id)) {
      setActiveProduct(nextActiveProduct);
    }
  }, [activeProduct, customProducts, productSlug]);

  const getPrintAreaStyle = () => {
    if (activeViewPrintArea) {
      const pX = Number(activeViewPrintArea.x);
      const pY = Number(activeViewPrintArea.y);
      const pWidth = Number(activeViewPrintArea.width);
      const pHeight = Number(activeViewPrintArea.height);

      if (
        Number.isFinite(pX) &&
        Number.isFinite(pY) &&
        Number.isFinite(pWidth) &&
        Number.isFinite(pHeight)
      ) {
        return {
          left: `${pX}%`,
          top: `${pY}%`,
          width: `${pWidth}%`,
          height: `${pHeight}%`,
        };
      }
    }

    const title = (activeProduct?.name || activeTemplate?.title || '').toLowerCase();
    
    // Default style (suitable for T-shirts/clothing)
    let style = {
      width: 35,
      height: 45,
      top: 28,
      left: 32.5,
    };

    if (title.includes('mug') || title.includes('cup') || title.includes('bottle')) {
      style = {
        width: 55,
        height: 35,
        top: 35,
        left: 22.5,
      };
    } else if (title.includes('poster') || title.includes('canvas') || title.includes('print')) {
      style = {
        width: 80,
        height: 80,
        top: 10,
        left: 10,
      };
    } else if (title.includes('phone') || title.includes('case')) {
      style = {
        width: 45,
        height: 75,
        top: 12.5,
        left: 27.5,
      };
    } else if (title.includes('shoe') || title.includes('sneaker') || title.includes('boot')) {
      style = {
        width: 60,
        height: 40,
        top: 30,
        left: 20,
      };
    } else if (title.includes('hoodie') || title.includes('sweatshirt')) {
      style = {
        width: 32,
        height: 38,
        top: 34,
        left: 34,
      };
    }
    
    return {
      width: `${style.width}%`,
      height: `${style.height}%`,
      top: `${style.top}%`,
      left: `${style.left}%`,
    };
  };

  // Option configurations
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeTab, setActiveTab] = useState<'product' | 'upload' | 'text' | 'ai'>('product');
  
  // Issue 3 Fix: Add view/position state for multi-image support
  const [selectedView, setSelectedView] = useState<string>('front');

  // FIXED: availableViews should ALWAYS return image-based views, NOT print area positions
  const availableViews = useMemo(() => {
    const imageCount = activeProduct?.images?.length || 0;
    
    // Map image count to standard views
    if (imageCount >= 4) {
      return ['front', 'back', 'left', 'right'];
    } else if (imageCount === 3) {
      return ['front', 'back', 'side'];
    } else if (imageCount === 2) {
      return ['front', 'back'];
    }
    
    return ['front']; // Single image default
  }, [activeProduct]);

  // Phase 5: Get the print area for the currently selected view (NEW SCHEMA)
  const activeViewPrintArea = useMemo(() => {
    const printAreas = activeTemplate?.printAreas || activeTemplate?.print_areas || [];
    
    // Phase 5: Priority lookup - check for new view field first, fallback to position
    const found = printAreas.find((area: any) => {
      const areaView = (area?.view || area?.position || '').toLowerCase();
      return areaView === selectedView.toLowerCase();
    });
    
    // Phase 5: Validate print area has required data
    if (found) {
      console.log('[BespokeCustomizer] Active print area for view:', selectedView, found);
      return found;
    }
    
    // Fallback to first print area if no match
    const fallback = printAreas[0] || null;
    if (fallback) {
      console.warn('[BespokeCustomizer] No print area found for view:', selectedView, '- using fallback:', fallback);
    }
    
    return fallback;
  }, [activeTemplate, selectedView]);

  // FIXED: Get the image for the currently selected view - direct index mapping
  const activeViewImage = useMemo(() => {
    // Priority 1: Check for color-specific mockup from admin dashboard
    if (selectedColor && activeTemplate?.colorMockups) {
      const colorData = activeTemplate.colorMockups[selectedColor];
      if (colorData) {
        // Map view to colorMockups keys
        const viewKey = selectedView.toLowerCase();
        let colorMockupUrl = colorData[viewKey as 'front' | 'back' | 'side' | 'left' | 'right'];
        
        // Fallback mapping: left/right → side
        if (!colorMockupUrl && (viewKey === 'left' || viewKey === 'right')) {
          colorMockupUrl = colorData.side;
        }
        
        // Final fallback: use front
        if (!colorMockupUrl) {
          colorMockupUrl = colorData.front;
        }
        
        if (colorMockupUrl) {
          console.log(`[BespokeCustomizer] Using color-specific mockup: ${selectedColor} / ${viewKey} → ${colorMockupUrl}`);
          return colorMockupUrl;
        }
      }
    }

    // Priority 2: Fallback to general product images with DIRECT INDEX MAPPING
    if (!activeProduct?.images || activeProduct.images.length === 0) {
      return '/custom-tee-mockup.png';
    }

    // FIXED: Direct view to index mapping (not dependent on availableViews)
    const viewIndexMap: Record<string, number> = {
      'front': 0,
      'back': 1,
      'left': 2,
      'side': 2, // Alias for left
      'right': 3,
      'detail': 3, // Alias for right
    };
    
    const imageIndex = viewIndexMap[selectedView.toLowerCase()] || 0;
    const imageUrl = activeProduct.images[imageIndex] || activeProduct.images[0];
    
    console.log(`[BespokeCustomizer] Using product image: view=${selectedView}, index=${imageIndex}, url=${imageUrl}`);
    return imageUrl;
  }, [activeProduct, selectedView, selectedColor, activeTemplate]);

  const getPreviewView = (customizationsByView?: Partial<Record<PrintifyViewKey, PrintifyViewCustomization>>) => {
    const orderedViews: PrintifyViewKey[] = ['front', 'back', 'left', 'right'];
    return orderedViews.find((view) => !!customizationsByView?.[view]) || (selectedView as PrintifyViewKey);
  };

  const getViewImageForView = (view: string) => {
    if (selectedColor && activeTemplate?.colorMockups) {
      const colorData = activeTemplate.colorMockups[selectedColor];
      if (colorData) {
        const viewKey = view.toLowerCase();
        let colorMockupUrl = colorData[viewKey as 'front' | 'back' | 'side' | 'left' | 'right'];

        if (!colorMockupUrl && (viewKey === 'left' || viewKey === 'right')) {
          colorMockupUrl = colorData.side;
        }

        if (!colorMockupUrl) {
          colorMockupUrl = colorData.front;
        }

        if (colorMockupUrl) {
          return colorMockupUrl;
        }
      }
    }

    if (!activeProduct?.images || activeProduct.images.length === 0) {
      return '/custom-tee-mockup.png';
    }

    const viewIndexMap: Record<string, number> = {
      front: 0,
      back: 1,
      left: 2,
      side: 2,
      right: 3,
      detail: 3,
    };

    const imageIndex = viewIndexMap[view.toLowerCase()] || 0;
    return activeProduct.images[imageIndex] || activeProduct.images[0];
  };

  // Ensure selectedView is valid when template changes
  useEffect(() => {
    if (!availableViews.includes(selectedView.toLowerCase())) {
      setSelectedView(availableViews[0] || 'front');
    }
  }, [availableViews, selectedView]);

  const activePrintifyVariants = useMemo(() => {
    const rawVariants = Array.isArray(activeTemplate?.variants) && activeTemplate.variants.length > 0
      ? activeTemplate.variants
      : (Array.isArray(activeProduct?.variants) ? activeProduct.variants : []);

    return rawVariants.filter((variant: any) => 
      variant?.enabled !== false &&
      variant?.is_enabled !== false &&
      variant?.is_available !== false &&
      variant?.stock !== 0
    );
  }, [activeTemplate, activeProduct]);


  // Feature 4: Template Colors Display - Read from admin-published template.colors
  // Collect { title, hex? } pairs for the color selector
  // This single useMemo replaces both activeColorOptions and activeColorOptionDetails to avoid circular dependencies
  const activeColorOptionDetails = useMemo(() => {
    // Priority 1: Use admin-published template colors from Supabase
    if (activeTemplate?.colors && Array.isArray(activeTemplate.colors) && activeTemplate.colors.length > 0) {
      const seen = new Set<string>();
      const result: Array<{ title: string; hex?: string }> = [];

      for (const color of activeTemplate.colors) {
        // Handle both string colors and { title, hex } objects
        const colorTitle = typeof color === 'string' ? color : String(color?.title || color?.name || '').trim();
        const colorHex = typeof color === 'string' 
          ? (/^#[0-9a-f]{3,6}$/i.test(color) ? color : undefined)
          : String(color?.hex || color?.color || '').trim() || undefined;

        if (!colorTitle || seen.has(colorTitle)) {
          continue;
        }
        seen.add(colorTitle);

        result.push({
          title: colorTitle,
          hex: colorHex,
        });
      }

      if (result.length > 0) {
        return result;
      }
    }

    // Priority 2: Extract colors from template's syncDetails.colorCodes if available
    if (activeTemplate?.syncDetails?.colorCodes && typeof activeTemplate.syncDetails.colorCodes === 'object') {
      const colorCodes = activeTemplate.syncDetails.colorCodes;
      const result: Array<{ title: string; hex?: string }> = [];

      for (const [title, hex] of Object.entries(colorCodes)) {
        if (title && typeof hex === 'string' && hex.startsWith('#')) {
          result.push({ title, hex });
        }
      }

      if (result.length > 0) {
        return result;
      }
    }

    // Priority 3 (Fallback): Extract from Printify variants (original logic)
    const seen = new Set<string>();
    const result: Array<{ title: string; hex?: string }> = [];

    for (const variant of activePrintifyVariants) {
      const options = Array.isArray(variant?.options) ? variant.options : [];
      
      // Find color option - check enriched 'name' field, original 'type' field, or infer from position
      const colorOpt = options.find((opt: any) => {
        // If opt is just a number (unenriched), skip it - we'll handle this differently
        if (typeof opt === 'number') return false;
        
        const name = String(opt?.name || opt?.key || opt?.label || '').toLowerCase();
        const type = String(opt?.type || '').toLowerCase();
        
        // Check if this is a color option
        return name.includes('color') || name.includes('colour') || 
               type.includes('color') || type.includes('colour') ||
               !!opt?.hex ||
               (Array.isArray(opt?.colors) && opt.colors.length > 0);
      });
      
      if (!colorOpt) {
        continue;
      }
      
      // Extract title from multiple possible fields
      const title = String(
        colorOpt?.title || 
        colorOpt?.value || 
        colorOpt?.name || 
        colorOpt?.label || 
        ''
      ).trim();
      
      if (!title || seen.has(title)) {
        continue;
      }
      seen.add(title);
      
      // Extract hex color - check multiple fields
      const hex = colorOpt?.hex
        ? String(colorOpt.hex).trim()
        : colorOpt?.colors && Array.isArray(colorOpt.colors) && colorOpt.colors.length > 0
        ? String(colorOpt.colors[0]).trim()
        : /^#[0-9a-f]{3,6}$/i.test(title) ? title : undefined;
      
      result.push({
        title,
        hex,
      });
    }

    // Final fallback if no enriched color details are found
    const fallbackColors = uniqueOptionValues(activePrintifyVariants.map(getVariantColor));
    if (result.length === 0 && fallbackColors.length > 0) {
      return fallbackColors.map((color) => ({
        title: color,
        hex: undefined, // Will be rendered as a text pill instead of a colored circle
      }));
    }

    return result;
  }, [activeTemplate, activePrintifyVariants]);

  // Derived array of color title strings for selection logic
  const activeColorOptions = useMemo(() => (
    activeColorOptionDetails.map(detail => detail.title)
  ), [activeColorOptionDetails]);

  const activeSizeOptions = useMemo(() => (
    uniqueOptionValues(activePrintifyVariants.map(getVariantSize))
  ), [activePrintifyVariants]);

  const activePrintifyVariant = useMemo(() => {
    const matchedVariant = activePrintifyVariants.find((variant: any) => {
      const colorMatches = !selectedColor || getVariantColor(variant) === selectedColor;
      const sizeMatches = !selectedSize || getVariantSize(variant) === selectedSize;
      return colorMatches && sizeMatches;
    });

    return matchedVariant || getPrimaryPrintifyVariant(activeTemplate) || activeProduct?.variants?.[0];
  }, [activePrintifyVariants, activeTemplate, activeProduct, selectedColor, selectedSize]);

  // Base cost calculation logic to handle cents from Printify variants and dollars from fallback products.
  const activeBaseCostDollars = useMemo(() => {
    // Priority 1: Check for size-specific pricing from variants array (where admin actually saves it)
    const sizePricing = getSizePricingFromVariants(activeTemplate);
    
    if (selectedSize && sizePricing.length > 0) {
      const sizePrice = sizePricing.find(sp => sp.size === selectedSize);
      
      if (sizePrice && sizePrice.baseCost > 0) {
        return sizePrice.baseCost;
      }
    }

    // Priority 2: Fall back to legacy sizesPricing field (if it exists in future)
    if (selectedSize && activeTemplate?.sizesPricing) {
      const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
      if (sizePrice && sizePrice.baseCost > 0) {
        return sizePrice.baseCost;
      }
    }

    // Priority 3: Use Printify variant pricing
    const charges = settings.printifySettings?.charges;
    const variantCostCents = Number(
      activePrintifyVariant?.cost ??
      activePrintifyVariant?.price ??
      0
    );
    
    let base = 0;
    if (variantCostCents > 0) {
      if (activePrintifyVariant?.cost !== undefined && activePrintifyVariant?.cost !== null) {
        const costVal = Number(activePrintifyVariant.cost);
        base = costVal < 100 && !Number.isInteger(costVal) ? costVal : costVal / 100;
      } else {
        const priceVal = Number(activePrintifyVariant?.price);
        base = priceVal < 100 && !Number.isInteger(priceVal) ? priceVal : priceVal / 100;
      }
    } else if (activeTemplate?.baseCost && activeTemplate.baseCost > 0) {
      base = activeTemplate.baseCost;
    } else {
      base = activeProduct?.price ?? 0;
    }

    // Only use fallback if we truly have no price data at all
    // Don't override $0.00 - that might be intentional or indicate a sync issue that should be visible
    if (base === 0 && !activePrintifyVariant && !activeTemplate?.baseCost && !activeProduct?.price) {
      return Math.max(0, Number(charges?.templateBasePrice ?? 14.99));
    }
    
    return base;
  }, [activePrintifyVariant, activeProduct, activeTemplate, settings.printifySettings?.charges, selectedSize]);

  const activeDisplayBasePrice = useMemo(() => {
    // Priority 1: Check for size-specific selling price from variants array (where admin actually saves it)
    const sizePricing = getSizePricingFromVariants(activeTemplate);
    
    if (selectedSize && sizePricing.length > 0) {
      const sizePrice = sizePricing.find(sp => sp.size === selectedSize);
      
      if (sizePrice && sizePrice.sellingPrice > 0) {
        return calculateTemplateRetailPrice(sizePrice.sellingPrice);
      }
    }

    // Priority 2: Fall back to legacy sizesPricing field (if it exists in future)
    if (selectedSize && activeTemplate?.sizesPricing) {
      const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
      if (sizePrice && sizePrice.sellingPrice > 0) {
        return calculateTemplateRetailPrice(sizePrice.sellingPrice);
      }
    }

    // Priority 3: Fall back to variant-specific or template-wide pricing
    const variantId = String(activePrintifyVariant?.id || activePrintifyVariant?.variant_id || activePrintifyVariant?.printify_variant_id || '');
    const manualVariantPrice = variantId ? activeTemplate?.variantSellingPrices?.[variantId] : undefined;
    return calculateTemplateRetailPrice(Number(manualVariantPrice ?? activeTemplate?.sellingPrice ?? activeTemplate?.retailPrice ?? activeProduct?.price ?? activeBaseCostDollars));
  }, [activeBaseCostDollars, activePrintifyVariant, activeProduct, activeTemplate, settings.printifySettings?.charges, selectedSize]);

  const activeOrderBasePrice = useMemo(() => {
    return calculateTemplateOrderPrice(activeDisplayBasePrice);
  }, [activeDisplayBasePrice, settings.printifySettings?.charges]);

  // Customizer canvas states - MUST BE DEFINED BEFORE calculateCustomizedPrice
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [textFont, setTextFont] = useState('Inter');
  const [textColor, setTextColor] = useState('#000000');
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs - MUST BE DEFINED BEFORE calculateCustomizedPrice
  const printAreaRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const compiledCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasStatesRef = useRef<Record<string, any>>({});
  const [canvasStateVersion, setCanvasStateVersion] = useState(0);

  const resetWorkspaceIndicators = () => {
    setCustomImage(null);
    setCustomText('');
    setHasSelection(false);
    setSelectedAngle(0);
    setSelectedScale(1);
    setTextColor('#000000');
    setTextFont('Inter');
    setTextIsBold(false);
    setTextIsItalic(false);
    setTextIsUnderline(false);
    setTextAlign('left');
  };

  const getImageSource = (imageObj?: fabric.Object) => {
    if (!imageObj) return '';
    const source = (imageObj as any).getSrc?.() || (imageObj as any).src || imageObj.toObject?.()?.src;
    return typeof source === 'string' ? source : '';
  };

  const syncWorkspaceIndicatorsFromCanvas = (canvas?: fabric.Canvas | null) => {
    resetWorkspaceIndicators();
    if (!canvas) return;

    const imageObj = canvas.getObjects('image')[0];
    const textObj = canvas.getObjects('i-text')[0] as fabric.IText | undefined;

    if (imageObj) {
      setCustomImage(getImageSource(imageObj) || null);
    }

    if (textObj) {
      setCustomText(textObj.text || '');
      setTextFont(textObj.fontFamily || 'Inter');
      if (typeof textObj.fill === 'string') {
        setTextColor(textObj.fill || '#000000');
      } else {
        setTextColor('gradient');
      }
      setTextIsBold(textObj.fontWeight === 'bold');
      setTextIsItalic(textObj.fontStyle === 'italic');
      setTextIsUnderline(!!textObj.underline);
      setTextAlign((textObj.textAlign as 'left' | 'center' | 'right') || 'left');
    }
  };

  const getCanvasStateDebugSnapshot = () => {
    const entries = Object.entries(canvasStatesRef.current).map(([view, state]) => ({
      view,
      hasObjects: Array.isArray(state?.objects) && state.objects.length > 0,
      objectCount: Array.isArray(state?.objects) ? state.objects.length : 0,
    }));

    return {
      selectedView,
      entries,
    };
  };

  const saveCurrentCanvasState = (view = selectedView) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const state = canvas.toJSON(['id', 'layerName', 'selectable']);
    const hasObjects = Array.isArray(state.objects) && state.objects.length > 0;
    if (hasObjects) {
      canvasStatesRef.current[view] = state;
    } else {
      delete canvasStatesRef.current[view];
    }
    setCanvasStateVersion((version) => version + 1);
  };

  const loadCanvasStateForView = (view: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.clear();
    const savedState = canvasStatesRef.current[view];
    if (savedState) {
      canvas.loadFromJSON(savedState, () => {
        canvas.renderAll();
        syncWorkspaceIndicatorsFromCanvas(canvas);
      });
      return;
    }

    canvas.renderAll();
    syncWorkspaceIndicatorsFromCanvas(canvas);
  };

  const handleViewChange = (newView: string) => {
    if (selectedView === newView) return;
    saveCurrentCanvasState(selectedView);
    setSelectedView(newView);
    loadCanvasStateForView(newView);
    console.log('[BespokeCustomizer] handleViewChange snapshot', {
      fromView: selectedView,
      toView: newView,
      canvasStates: getCanvasStateDebugSnapshot(),
    });
  };

  const getViewCustomizationFromState = (view: string, fabricState: any): PrintifyViewCustomization | null => {
    const objects = Array.isArray(fabricState?.objects) ? fabricState.objects : [];
    const imageObj = objects.find((object: any) => object?.type === 'image');
    const textObj = objects.find((object: any) => object?.type === 'i-text' || object?.type === 'text');

    if (!imageObj && !textObj) {
      return null;
    }

    return {
      view: view as PrintifyViewKey,
      customImageUrl: imageObj?.src || undefined,
      customText: textObj?.text || undefined,
      textColor: textObj?.fill && typeof textObj.fill === 'string' ? textObj.fill : undefined,
      fontFamily: textObj?.fontFamily || undefined,
      imagePosition: imageObj ? {
        x: imageObj.left || 0,
        y: imageObj.top || 0,
        scale: imageObj.scaleX || 1,
        rotate: imageObj.angle || 0,
      } : undefined,
      textPosition: textObj ? {
        x: textObj.left || 0,
        y: textObj.top || 0,
        scale: textObj.scaleX || 1,
        rotate: textObj.angle || 0,
      } : undefined,
      fabricState,
    };
  };

  const getViewCustomizationFromCanvas = (view: string, canvas?: fabric.Canvas | null): PrintifyViewCustomization | null => {
    if (!canvas) return null;

    const imageObj = canvas.getObjects('image')[0];
    const textObj = canvas.getObjects('i-text')[0] as fabric.IText | undefined;
    if (!imageObj && !textObj) {
      return null;
    }

    return {
      view: view as PrintifyViewKey,
      customImageUrl: getImageSource(imageObj) || undefined,
      customText: textObj?.text || undefined,
      textColor: textObj?.fill && typeof textObj.fill === 'string' ? textObj.fill : undefined,
      fontFamily: textObj?.fontFamily || undefined,
      imagePosition: imageObj ? {
        x: imageObj.left || 0,
        y: imageObj.top || 0,
        scale: imageObj.scaleX || 1,
        rotate: imageObj.angle || 0,
      } : undefined,
      textPosition: textObj ? {
        x: textObj.left || 0,
        y: textObj.top || 0,
        scale: textObj.scaleX || 1,
        rotate: textObj.angle || 0,
      } : undefined,
      fabricState: canvas.toJSON(['id', 'layerName', 'selectable']),
    };
  };

  const getCustomizationForPriceView = (view: PrintifyViewKey) => (
    view === selectedView
      ? getViewCustomizationFromCanvas(view, fabricCanvasRef.current)
      : getViewCustomizationFromState(view, canvasStatesRef.current[view])
  );

  const getViewCustomizationFee = (view: PrintifyViewKey, editorCharges: NonNullable<typeof settings.printifySettings>['charges']['editorCharges']) => {
    const viewCustomization = getCustomizationForPriceView(view);
    const hasText = !!viewCustomization?.customText?.trim();
    const hasDesign = !!viewCustomization?.customImageUrl;

    const fee =
      hasText && hasDesign ? Number(editorCharges?.textAndDesign ?? 0) :
      hasDesign ? Number(editorCharges?.designOnly ?? 0) :
      hasText ? Number(editorCharges?.textOnly ?? 0) :
      0;

    console.log('[BespokeCustomizer] getViewCustomizationFee', {
      selectedView,
      view,
      hasText,
      hasDesign,
      fee,
      viewCustomization,
    });

    if (hasText && hasDesign) {
      return fee;
    }
    if (hasDesign) {
      return fee;
    }
    if (hasText) {
      return fee;
    }
    return fee;
  };

  const buildCustomizationsByView = () => {
    saveCurrentCanvasState(selectedView);

    return Object.entries(canvasStatesRef.current).reduce<Partial<Record<PrintifyViewKey, PrintifyViewCustomization>>>((accumulator, [view, state]) => {
      const viewCustomization = getViewCustomizationFromState(view, state);
      if (viewCustomization) {
        accumulator[view as PrintifyViewKey] = viewCustomization;
      }
      return accumulator;
    }, {});
  };

  const hasSavedCanvasCustomization = useMemo(
    () => Object.values(canvasStatesRef.current).some((state: any) => Array.isArray(state?.objects) && state.objects.length > 0),
    [canvasStateVersion],
  );

  useEffect(() => {
    canvasStatesRef.current = {};
    setCanvasStateVersion((version) => version + 1);
    setSelectedView('front');
    resetWorkspaceIndicators();
  }, [activeProduct?.id]);

  // Feature 2: Pricing with Design Charges - useCallback to avoid circular dependencies
  const calculateCustomizedPrice = React.useCallback((retailPrice: number) => {
    const editorCharges = settings.printifySettings?.charges?.editorCharges || {
      textOnly: 0,
      designOnly: 0,
      textAndDesign: 0,
      areaMultiplier: {
        enabled: false,
        threshold: 50,
        surcharge: 0,
      },
    };

    const pricedViews: PrintifyViewKey[] = ['front', 'back', 'left', 'right'];
    const customizationFee = pricedViews.reduce(
      (total, view) => total + getViewCustomizationFee(view, editorCharges),
      0,
    );

    // Area-based surcharge (placeholder - would need actual coverage calculation in production)
    const areaSurcharge = 0;

    return Number((retailPrice + customizationFee + areaSurcharge).toFixed(2));
  }, [settings.printifySettings?.charges?.editorCharges, customText, customImage, canvasStateVersion]);

  // Calculate customer prices AFTER calculateCustomizedPrice is defined
  const activeDisplayCustomerPrice = useMemo(() => 
    activeProduct ? calculateCustomizedPrice(activeDisplayBasePrice) : 0,
    [activeProduct, activeDisplayBasePrice, calculateCustomizedPrice]
  );
  
  const activeOrderCustomerPrice = useMemo(() => 
    activeProduct ? calculateCustomizedPrice(activeOrderBasePrice) : 0,
    [activeProduct, activeOrderBasePrice, calculateCustomizedPrice]
  );

  // Selected object properties for sliders
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [selectedScale, setSelectedScale] = useState(1);
  const [hasSelection, setHasSelection] = useState(false);

  // Premium UI: Color/Gradient selector state
  const [colorGradientTab, setColorGradientTab] = useState<'solid' | 'gradient'>('solid');
  const [showAllColors, setShowAllColors] = useState(false);
  const [showAllGradients, setShowAllGradients] = useState(false);

  // Text formatting states
  const [textIsBold, setTextIsBold] = useState(false);
  const [textIsItalic, setTextIsItalic] = useState(false);
  const [textIsUnderline, setTextIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // AI mockups placeholder state
  const [aiMockups, setAiMockups] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Available fonts - Issue 2: Expanded from 5 to 20 fonts
  const fontOptions = [
    { name: 'Modern Sans (Inter)', value: 'Inter' },
    { name: 'Elegant Serif (Playfair Display)', value: 'Playfair Display' },
    { name: 'Playful Cursive (Pacifico)', value: 'Pacifico' },
    { name: 'Bold Geometric (Montserrat)', value: 'Montserrat' },
    { name: 'Impact Condensed (Oswald)', value: 'Oswald' },
    { name: 'Modern Roboto', value: 'Roboto' },
    { name: 'Stylish Lora', value: 'Lora' },
    { name: 'Bold Display (Bebas Neue)', value: 'Bebas Neue' },
    { name: 'Handwritten (Caveat)', value: 'Caveat' },
    { name: 'Rounded (Comfortaa)', value: 'Comfortaa' },
    { name: 'Elegant (Raleway)', value: 'Raleway' },
    { name: 'Popular (Poppins)', value: 'Poppins' },
    { name: 'Monospace (Source Code Pro)', value: 'Source Code Pro' },
    { name: 'Artistic (Shadows Into Light)', value: 'Shadows Into Light' },
    { name: 'Bold Anton', value: 'Anton' },
    { name: 'Classic (Merriweather)', value: 'Merriweather' },
    { name: 'Script (Dancing Script)', value: 'Dancing Script' },
    { name: 'Serif (Libre Baskerville)', value: 'Libre Baskerville' },
    { name: 'Friendly (Quicksand)', value: 'Quicksand' },
    { name: 'Classic Times', value: 'Times New Roman' },
  ];

  // Issue 2: Premium curated color palette
  const colorPalette = [
    { name: 'Rich Black', hex: '#0a0a0a' },
    { name: 'Charcoal', hex: '#36454f' },
    { name: 'Slate Gray', hex: '#708090' },
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Ivory', hex: '#fffff0' },
    { name: 'Deep Navy', hex: '#000080' },
    { name: 'Royal Blue', hex: '#4169e1' },
    { name: 'Sky Blue', hex: '#87ceeb' },
    { name: 'Teal', hex: '#008080' },
    { name: 'Forest Green', hex: '#228b22' },
    { name: 'Sage', hex: '#9caf88' },
    { name: 'Olive', hex: '#808000' },
    { name: 'Burgundy', hex: '#800020' },
    { name: 'Crimson', hex: '#dc143c' },
    { name: 'Coral', hex: '#ff7f50' },
    { name: 'Blush Pink', hex: '#ff6fff' },
    { name: 'Mustard', hex: '#ffdb58' },
    { name: 'Amber', hex: '#ffbf00' },
    { name: 'Burnt Orange', hex: '#cc5500' },
    { name: 'Deep Purple', hex: '#663399' },
    { name: 'Lavender', hex: '#e6e6fa' },
    { name: 'Plum', hex: '#8e4585' },
  ];

  // Issue 2: Gradient presets for text
  const gradientPresets = [
    { name: 'Sunset', colors: ['#FF512F', '#DD2476'] },
    { name: 'Ocean', colors: ['#2E3192', '#1BFFFF'] },
    { name: 'Purple Pink', colors: ['#8E2DE2', '#4A00E0'] },
    { name: 'Gold', colors: ['#FFD89B', '#19547B'] },
    { name: 'Fire', colors: ['#F37335', '#FDC830'] },
    { name: 'Mint', colors: ['#00F260', '#0575E6'] },
    { name: 'Rose', colors: ['#ED213A', '#93291E'] },
    { name: 'Sky', colors: ['#56CCF2', '#2F80ED'] },
  ];

  // Sync colors & sizes when active Printify metadata shifts
  useEffect(() => {
    if (activeColorOptions.length > 0) {
      setSelectedColor((current) => activeColorOptions.includes(current) ? current : activeColorOptions[0]);
    } else {
      setSelectedColor('');
    }

    if (activeSizeOptions.length > 0) {
      setSelectedSize((current) => activeSizeOptions.includes(current) ? current : activeSizeOptions[0]);
    } else {
      setSelectedSize('');
    }
  }, [activeColorOptions, activeSizeOptions]);

  // Initialize Fabric.js Canvas — deferred until the print area has real layout dimensions
  useEffect(() => {
    const printArea = printAreaRef.current;
    const canvasEl = canvasElRef.current;
    if (!printArea || !canvasEl || !activeProduct) return;

    let canvas: fabric.Canvas | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const initOrResizeCanvas = () => {
      if (disposed) return;

      const rect = printArea.getBoundingClientRect();
      const width = Math.round(rect.width || printArea.clientWidth);
      const height = Math.round(rect.height || printArea.clientHeight);
      if (width < 24 || height < 24) return;

      if (!canvas) {
        resetWorkspaceIndicators();
        canvas = new fabric.Canvas(canvasEl, {
          width,
          height,
          backgroundColor: 'transparent',
          preserveObjectStacking: true,
        });
        fabricCanvasRef.current = canvas;
        loadCanvasStateForView(selectedView);

        const syncSelection = () => {
          const activeObj = canvas?.getActiveObject();
          if (activeObj) {
            setHasSelection(true);
            setSelectedAngle(Math.round(activeObj.angle || 0));
            setSelectedScale(activeObj.scaleX || 1);

            if (activeObj.type === 'i-text') {
              const textObj = activeObj as fabric.IText;
              setCustomText(textObj.text || '');
              setTextFont(textObj.fontFamily || 'Inter');
              
              // CRITICAL FIX: Check if fill is a gradient object or string
              // React state can only store strings, not Fabric.js gradient objects
              if (typeof textObj.fill === 'string') {
                setTextColor(textObj.fill || '#000000');
              } else {
                // If fill is a gradient object, store a placeholder string
                setTextColor('gradient');
              }
              
              setTextIsBold(textObj.fontWeight === 'bold');
              setTextIsItalic(textObj.fontStyle === 'italic');
              setTextIsUnderline(!!textObj.underline);
              setTextAlign((textObj.textAlign as 'left' | 'center' | 'right') || 'left');
            }
          } else {
            setHasSelection(false);
          }
        };

        canvas.on('selection:created', syncSelection);
        canvas.on('selection:updated', syncSelection);
        canvas.on('selection:cleared', () => setHasSelection(false));
        canvas.on('object:moving', syncSelection);
        canvas.on('object:scaling', syncSelection);
        canvas.on('object:rotating', syncSelection);
        canvas.on('object:modified', syncSelection);

        // ===== PHASE 5: STRICT BOUNDARY ENFORCEMENT (NEW IMPLEMENTATION) =====
        /**
         * Phase 5: Hard Containment Lock
         * 
         * Dynamically calculates boundary pixels based on:
         * 1. Admin-defined print area percentages (from Phase 1-3)
         * 2. Customer's current responsive viewport mockup image
         * 3. Actual canvas dimensions at runtime
         * 
         * Strategy:
         * - Print area percentages are relative to mockup image
         * - Canvas may be smaller/larger than mockup (responsive)
         * - Scale print area percentages to actual canvas dimensions
         * - Enforce strict pixel boundaries using Fabric.js object constraints
         */
        
        const calculateCanvasBoundaries = () => {
          if (!canvas) {
            return {
              minX: 0,
              minY: 0,
              maxX: 0,
              maxY: 0,
            };
          }
          return {
            minX: 0,
            minY: 0,
            maxX: canvas.getWidth(),
            maxY: canvas.getHeight(),
          };
        };

        /**
         * CRITICAL FIX: Absolute synchronous Fabric.js containment
         * 
         * The bug: RAF approach defers constraint to next frame, causing lag/jumping
         * because the mouse has already moved by the time the constraint applies.
         * 
         * Solution: SYNCHRONOUS clamping during object:moving event
         * 1. Get bounding rect in absolute canvas coordinates
         * 2. Calculate clamped position limits
         * 3. Apply constraints IMMEDIATELY (not deferred)
         * 4. Work with object's center point (originX/originY = 'center')
         */
        
        const constrainObjectToBounds = (obj: fabric.Object) => {
          if (!obj || !canvas) return;

          const boundaries = calculateCanvasBoundaries();
          
          // Get the object's bounding rectangle in absolute coordinates
          // This handles rotation, scaling, and origin point automatically
          const bound = obj.getBoundingRect(false, true);
          
          // Calculate object center point (where left/top refer to with center origin)
          const objCenterX = obj.left || 0;
          const objCenterY = obj.top || 0;
          
          // Calculate how far the bounding rect extends from center
          const halfWidth = bound.width / 2;
          const halfHeight = bound.height / 2;
          
          // Calculate the valid range for the object's CENTER point
          const minCenterX = boundaries.minX + halfWidth;
          const maxCenterX = boundaries.maxX - halfWidth;
          const minCenterY = boundaries.minY + halfHeight;
          const maxCenterY = boundaries.maxY - halfHeight;
          
          // Clamp the center position to valid range
          let newCenterX = objCenterX;
          let newCenterY = objCenterY;
          
          if (newCenterX < minCenterX) newCenterX = minCenterX;
          if (newCenterX > maxCenterX) newCenterX = maxCenterX;
          if (newCenterY < minCenterY) newCenterY = minCenterY;
          if (newCenterY > maxCenterY) newCenterY = maxCenterY;
          
          // Only update if position changed (avoid unnecessary renders)
          if (newCenterX !== objCenterX || newCenterY !== objCenterY) {
            obj.set({
              left: newCenterX,
              top: newCenterY,
            });
            obj.setCoords(); // Update coordinate cache
          }
        };

        // Phase 5: Attach boundary enforcement to Fabric.js events
        // These fire during drag, scale, rotate operations
        canvas.on('object:moving', (e) => {
          if (e.target) {
            constrainObjectToBounds(e.target);
          }
        });

        // Phase 5: Enforce boundaries AFTER scaling/rotating completes
        canvas.on('object:modified', (e) => {
          if (e.target) {
            constrainObjectToBounds(e.target);
            canvas.renderAll();
          }
        });

        // Phase 5: Enforce during rotation (prevents escape while rotating)
        canvas.on('object:rotating', (e) => {
          if (e.target) {
            constrainObjectToBounds(e.target);
          }
        });

        // Phase 5: Enforce during scaling (prevents escape while scaling)
        canvas.on('object:scaling', (e) => {
          if (e.target) {
            constrainObjectToBounds(e.target);
          }
        });

        // ===== END PHASE 5 BOUNDARY ENFORCEMENT =====
      } else {
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.renderAll();
      }
    };

    initOrResizeCanvas();
    requestAnimationFrame(initOrResizeCanvas);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => initOrResizeCanvas());
      resizeObserver.observe(printArea);
    }

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (canvas) {
        canvas.dispose();
      }
      fabricCanvasRef.current = null;
    };
  }, [activeProduct]);

  if (!printifyEnabled) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-dashed rounded-3xl">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Printify integration is disabled. Enable it in Dashboard → Printify Settings.
        </p>
      </div>
    );
  }

  if (!activeProduct) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-dashed rounded-3xl space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          No customizable templates are available yet.
        </p>
        <p className="text-[11px] text-gray-400 max-w-md mx-auto">
          Sync templates in Dashboard → Printify, then publish or resync any template flagged as incomplete.
        </p>
      </div>
    );
  }

  // Optimize and Upload image onto Fabric.js Canvas
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔵 [IMAGE UPLOAD] Handler triggered');
    const file = e.target.files?.[0];
    console.log('🔵 [IMAGE UPLOAD] File selected:', file ? `${file.name} (${Math.round(file.size / 1024)}KB)` : 'NO FILE');
    if (!file) return;
    
    setIsUploading(true);
    console.log('🔵 [IMAGE UPLOAD] Starting optimization...');
    
    try {
      const optimized = await optimizeImage(file, 800, 800);
      console.log('🔵 [IMAGE UPLOAD] Optimization complete. Data URL length:', optimized.length, 'chars');
      
      const canvas = fabricCanvasRef.current;
      console.log('🔵 [IMAGE UPLOAD] Canvas ref status:', canvas ? `EXISTS (${canvas.getWidth()}x${canvas.getHeight()})` : '❌ NULL');
      
      if (canvas) {
        console.log('🔵 [IMAGE UPLOAD] Loading image into Fabric.js...');
        fabric.Image.fromURL(optimized, (img) => {
          console.log('🔵 [IMAGE UPLOAD] Fabric.js callback fired. Image object:', img ? 'CREATED' : '❌ NULL');
          
          if (!img) {
            console.error('❌ [IMAGE UPLOAD] Fabric.js failed to create image object');
            alert('Failed to load image. Please try a different file.');
            return;
          }

          // Resize to fit print area reasonably
          const scaleFactor = (canvas.width * 0.7) / (img.width || 1);
          console.log('🔵 [IMAGE UPLOAD] Scale factor:', scaleFactor, `(image: ${img.width}x${img.height})`);
          
          img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            cornerColor: '#000000',
            cornerStrokeColor: '#ffffff',
            borderColor: '#000000',
            cornerSize: 8,
            transparentCorners: false,
            padding: 0,
          });

          // Remove any existing graphic layers to keep it focused
          const oldImages = canvas.getObjects('image');
          console.log('🔵 [IMAGE UPLOAD] Removing old images:', oldImages.length);
          oldImages.forEach((obj) => canvas.remove(obj));

          canvas.add(img);
          console.log('🔵 [IMAGE UPLOAD] Image added to canvas');
          canvas.setActiveObject(img);
          console.log('🔵 [IMAGE UPLOAD] Image set as active object');
          canvas.renderAll();
          console.log('🔵 [IMAGE UPLOAD] Canvas rendered');

          setCustomImage(optimized);
          setActiveTab('upload');
          console.log('✅ [IMAGE UPLOAD] Upload complete!');
        });
      } else {
        console.error('❌ [IMAGE UPLOAD] Canvas not initialized. Print area may not have dimensions yet.');
        alert('Editor not ready. Please wait a moment and try again.');
      }
    } catch (err) {
      console.error('❌ [IMAGE UPLOAD] Error during upload:', err);
      alert('Failed to process custom design. Please try another image.');
    } finally {
      setIsUploading(false);
      console.log('🔵 [IMAGE UPLOAD] Upload state reset (isUploading = false)');
    }
  };

  // Issue 2 Fix: Add new text layer (supports multiple independent text layers)
  const handleAddNewText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const newText = new fabric.IText('New Text', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 24,
      fontFamily: textFont,
      fill: textColor,
      fontWeight: 'normal',
      cornerColor: '#000000',
      cornerStrokeColor: '#ffffff',
      borderColor: '#000000',
      cornerSize: 8,
      transparentCorners: false,
      padding: 0,
    });
    
    canvas.add(newText);
    canvas.setActiveObject(newText);
    canvas.renderAll();
    
    // Update text input to show the new text
    setCustomText(newText.text || '');
  };

  // Issue 2 Fix: Modify selected text layer (not just the first one)
  const handleTextChange = (val: string) => {
    setCustomText(val);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    // Get the currently selected object if it's text
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
      const activeText = activeObj as fabric.IText;
      activeText.set('text', val);
      canvas.renderAll();
    } else {
      // If no text is selected, create a new text layer
      if (val.trim()) {
        const newText = new fabric.IText(val, {
          left: canvas.width / 2,
          top: canvas.height * 0.3,
          originX: 'center',
          originY: 'center',
          fontSize: 24,
          fontFamily: textFont,
          fill: textColor,
          fontWeight: 'bold',
          cornerColor: '#000000',
          cornerStrokeColor: '#ffffff',
          borderColor: '#000000',
          cornerSize: 8,
          transparentCorners: false,
          padding: 0,
        });
        canvas.add(newText);
        canvas.setActiveObject(newText);
        canvas.renderAll();
      }
    }
  };

  // Handle Font styles change - Issue 3 FIX: Use requestRenderAll and ensure font is loaded
  const handleFontChange = (font: string) => {
    setTextFont(font);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const activeText = activeObj as fabric.IText;
        activeText.set('fontFamily', font);
        // CRITICAL FIX: Use requestRenderAll() which is safer than renderAll()
        canvas.requestRenderAll();
      }
    }
  };

  // Handle Text color change - Issue 1 FIX: Use requestRenderAll
  const handleColorChange = (color: string) => {
    setTextColor(color);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const activeText = activeObj as fabric.IText;
        activeText.set('fill', color);
        // CRITICAL FIX: Use requestRenderAll() which is safer than renderAll()
        canvas.requestRenderAll();
      }
    }
  };

  // Issue 2: Apply gradient to selected text
  // FIXED: Black screen bug - gradient coordinates must be in object's local space
  const handleApplyGradient = (gradient: { name: string; colors: string[] }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') {
      const activeText = activeObj as fabric.IText;
      
      // CRITICAL FIX: Fabric.js gradients on text require coordinates in the text's
      // local coordinate system (relative to text's own dimensions, not canvas)
      // The gradient will automatically transform with the object
      const gradientFill = new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels', // Use pixels relative to object, not canvas percentage
        coords: {
          x1: 0,
          y1: 0,
          x2: activeText.width || 100, // Gradient goes from left to right of text
          y2: 0,
        },
        colorStops: [
          { offset: 0, color: gradient.colors[0] },
          { offset: 1, color: gradient.colors[1] },
        ],
      });
      
      activeText.set({ fill: gradientFill });
      
      // Force Fabric.js to recalculate the gradient transform matrix
      // This ensures the gradient renders correctly in the object's coordinate space
      activeText.setCoords();
      canvas.renderAll();
    }
  };

  // Canvas manual controls modification
  const handleScaleSlider = (val: number) => {
    setSelectedScale(val);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set({
          scaleX: val,
          scaleY: val,
        });
        canvas.renderAll();
      }
    }
  };

  const handleRotateSlider = (val: number) => {
    setSelectedAngle(val);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set('angle', val);
        canvas.renderAll();
      }
    }
  };

  // Delete selected layer element
  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.remove(activeObj);
        canvas.discardActiveObject();
        canvas.renderAll();
        
        // Reset corresponding state
        if (activeObj.type === 'i-text') {
          setCustomText('');
        } else if (activeObj.type === 'image') {
          setCustomImage(null);
        }
      }
    }
  };

  // Bring active layer forward
  const handleBringForward = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.bringForward(activeObj);
        canvas.renderAll();
      }
    }
  };

  // Send active layer backward
  const handleSendBackward = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.sendBackwards(activeObj);
        canvas.renderAll();
      }
    }
  };

  // Center layer horizontally in print area
  const handleCenterHorizontally = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.centerH();
        activeObj.setCoords();
        canvas.renderAll();
      }
    }
  };

  // Center layer vertically in print area
  const handleCenterVertically = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.centerV();
        activeObj.setCoords();
        canvas.renderAll();
      }
    }
  };

  // Duplicate active layer
  const handleDuplicateSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.clone((cloned: fabric.Object) => {
          canvas.discardActiveObject();
          cloned.set({
            left: (cloned.left || 0) + 15,
            top: (cloned.top || 0) + 15,
            evented: true,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          
          if (cloned.type === 'i-text') {
            const textObj = cloned as fabric.IText;
            setCustomText(textObj.text || '');
          }
        });
      }
    }
  };

  // Toggle Bold style on selected text object
  const toggleBold = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = textObj.fontWeight === 'bold' ? 'normal' : 'bold';
        textObj.set('fontWeight', nextVal);
        canvas.renderAll();
        setTextIsBold(nextVal === 'bold');
      }
    }
  };

  // Toggle Italic style on selected text object
  const toggleItalic = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = textObj.fontStyle === 'italic' ? 'normal' : 'italic';
        textObj.set('fontStyle', nextVal);
        canvas.renderAll();
        setTextIsItalic(nextVal === 'italic');
      }
    }
  };

  // Toggle Underline style on selected text object
  const toggleUnderline = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        const nextVal = !textObj.underline;
        textObj.set('underline', nextVal);
        canvas.renderAll();
        setTextIsUnderline(nextVal);
      }
    }
  };

  // Change text alignment on selected text object
  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'i-text') {
        const textObj = activeObj as fabric.IText;
        textObj.set('textAlign', align);
        canvas.renderAll();
        setTextAlign(align);
      }
    }
  };

  // Reset entire Canvas workspace
  const handleReset = () => {
    if (confirm('Are you sure you want to clear your current workspace?')) {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.clear();
        delete canvasStatesRef.current[selectedView];
        setCanvasStateVersion((version) => version + 1);
        resetWorkspaceIndicators();
      }
    }
  };

  const generatePreviewDataUrl = async (
    customizationsByView?: Partial<Record<PrintifyViewKey, PrintifyViewCustomization>>,
  ): Promise<string> => {
    try {
      const canvas = compiledCanvasRef.current;
      const fCanvas = fabricCanvasRef.current;
      if (!canvas || !fCanvas) {
        return '';
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return '';
      }

      const previewView = getPreviewView(customizationsByView);
      const previewFabricState = previewView === selectedView
        ? fCanvas.toJSON(['id', 'layerName', 'selectable'])
        : canvasStatesRef.current[previewView];

      canvas.width = 600;
      canvas.height = 600;

      // 1. Draw neutral canvas; product colors should come from Printify mockups/variants, not simulated tinting.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);

      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';
      baseImg.src = getViewImageForView(previewView) || '/custom-tee-mockup.png';

      await new Promise<void>((resolve) => {
        baseImg.onload = () => resolve();
        baseImg.onerror = () => resolve();
      });

      ctx.drawImage(baseImg, 0, 0, 600, 600);

      const printStyle = getPrintAreaStyle();
      const parsePct = (val: string) => parseFloat(val) / 100;
      const widthPct = parsePct(printStyle.width);
      const heightPct = parsePct(printStyle.height);
      const topPct = parsePct(printStyle.top);
      const leftPct = parsePct(printStyle.left);

      const pw = 600 * widthPct;
      const ph = 600 * heightPct;
      const px = 600 * leftPct;
      const py = 600 * topPct;

      const fabricDataUrl = await new Promise<string>((resolve) => {
        try {
          if (previewView === selectedView) {
            const activeObj = fCanvas.getActiveObject();
            if (activeObj) {
              fCanvas.discardActiveObject();
              fCanvas.renderAll();
            }

            const dataUrl = fCanvas.toDataURL({ format: 'png' });
            if (activeObj) {
              fCanvas.setActiveObject(activeObj);
              fCanvas.renderAll();
            }
            resolve(dataUrl);
            return;
          }

          if (!previewFabricState) {
            resolve('');
            return;
          }

          const tempCanvasEl = document.createElement('canvas');
          tempCanvasEl.width = fCanvas.getWidth();
          tempCanvasEl.height = fCanvas.getHeight();
          const tempCanvas = new fabric.StaticCanvas(tempCanvasEl, {
            width: fCanvas.getWidth(),
            height: fCanvas.getHeight(),
            backgroundColor: 'transparent',
            preserveObjectStacking: true,
          });

          tempCanvas.loadFromJSON(previewFabricState, () => {
            tempCanvas.renderAll();
            resolve(tempCanvas.toDataURL({ format: 'png' }));
            tempCanvas.dispose();
          });
        } catch (error) {
          console.warn('Preview generation failed; continuing without compiled preview.', error);
          resolve('');
        }
      });

      if (!fabricDataUrl) {
        return '';
      }

      const fabricImg = new Image();
      fabricImg.src = fabricDataUrl;

      await new Promise<void>((resolve) => {
        fabricImg.onload = () => resolve();
        fabricImg.onerror = () => resolve();
      });

      ctx.drawImage(fabricImg, px, py, pw, ph);
      return canvas.toDataURL('image/jpeg', 0.60);
    } catch (err) {
      console.error('Failed to compile preview image:', err);
      return '';
    }
  };

  // Add compiled customization item to cart
  const handleAddToCart = async () => {
    if (!activeProduct) {
      return;
    }

    try {
      const fCanvas = fabricCanvasRef.current;

      // Resolve provider ID once — used in both the no-canvas and full-canvas paths
      const providerIdVal = Number(activePrintifyProvider?.id || activePrintifyProvider?.print_provider_id);
      const printifyPrintProviderId = (providerIdVal && !isNaN(providerIdVal)) ? providerIdVal : undefined;
      const printifyBlueprintId = activeTemplate?.blueprintId;

      if (!fCanvas) {
        if (!getPrintifyVariantId(activePrintifyVariant)) {
          alert('This template is not available for checkout right now. Please choose another template.');
          return;
        }

        addToCart({ ...activeProduct, price: activeOrderCustomerPrice }, undefined, 1, {
          color: selectedColor,
          size: selectedSize,
          customization: {
            printifyBlueprintId,
            printifyPrintProviderId,
            printifyVariantId: getPrintifyVariantId(activePrintifyVariant),
          },
        });
        navigate('/cart');
        return;
      }

      const printifyVariantId = getPrintifyVariantId(activePrintifyVariant);

      if (!printifyVariantId) {
        alert('This template is not available for checkout right now. Please choose another template.');
        return;
      }

      console.log('[BespokeCustomizer] handleAddToCart before buildCustomizationsByView', getCanvasStateDebugSnapshot());
      const customizationsByView = buildCustomizationsByView();
      const hasViewCustomizations = Object.keys(customizationsByView).length > 0;
      const previewUrl = await generatePreviewDataUrl(customizationsByView).catch((error) => {
        console.warn('Preview generation failed; adding item with fallback image.', error);
        return '';
      });

      const customization = {
        customizationsByView: hasViewCustomizations ? customizationsByView : undefined,
        previewUrl: previewUrl || undefined,
        printifyBlueprintId,
        printifyPrintProviderId,
        printifyVariantId,
        printifyPrintAreas: activeTemplate?.printAreas?.[0] || undefined,
      };

      addToCart({ ...activeProduct, price: activeOrderCustomerPrice }, undefined, 1, {
        color: selectedColor,
        size: selectedSize,
        customization,
      });

      navigate('/cart');
    } catch (err: any) {
      console.error('Error adding customized product to cart:', err);
      alert(`Could not add product to cart: ${err?.message || err}`);
    }
  };

  // Generate AI preview mockups
  const handleGenerateAiMockup = () => {
    setIsGeneratingAi(true);
    setAiMockups([]);
    setTimeout(() => {
      setAiMockups([activeProduct.images[0]]);
      setIsGeneratingAi(false);
    }, 1500);
  };

  // Filter tabs: only include AI Preview if enabled in backend settings
  const tabsList = [
    { id: 'product', label: 'Product', icon: Layout },
    { id: 'upload', label: 'Graphics', icon: Upload },
    { id: 'text', label: 'Text', icon: Type },
  ];

  if (aiPreviewEnabled) {
    tabsList.push({ id: 'ai', label: 'AI Preview', icon: RefreshCw });
  }

  return (
    <div className="w-full">
      {/* Standalone Header */}
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Link to={`/product/${activeProduct.slug}`} className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-black">
              <ArrowLeft className="h-4 w-4" /> Back to Product
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs font-black uppercase tracking-widest text-black">Bespoke Customizer</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl text-[10px] font-black uppercase">
              Reset Workspace
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Canvas Preview area */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[500px] aspect-square rounded-[2.5rem] bg-gray-50 border border-gray-100 shadow-sm flex items-center justify-center">
            
            {/* Defensive Fix: Aspect-ratio-locked inner wrapper — print-area percentages resolve
                against the rendered image rect, not the outer square container. Prevents misalignment
                if a non-square mockup is ever introduced (same pattern as Fix 1 in PrintAreasTab). */}
            <div className="relative w-fit h-fit max-w-full max-h-full">
            
              {/* Template Mockup Image */}
              <img 
                src={activeViewImage} 
                alt={`${activeProduct?.name || 'Product'} - ${selectedView}`} 
                className="max-w-full max-h-[500px] w-auto h-auto block select-none pointer-events-none"
              />

              {/* Print Area Bounds holding Fabric Canvas */}
              <div 
                ref={printAreaRef}
                className="absolute border-2 border-dashed border-gray-400/30 hover:border-gray-500/50 rounded-xl transition-all flex items-center justify-center overflow-hidden"
                style={getPrintAreaStyle()}
              >
                <canvas ref={canvasElRef} id="fabric-canvas" className="absolute inset-0 w-full h-full" />
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-gray-400 mt-4 uppercase font-black tracking-widest flex items-center gap-1.5 opacity-70">
            <HelpCircle className="h-3.5 w-3.5" /> Customize design layers interactively on the selected product.
          </p>

          {/* Issue 3 Fix: View/Position Switcher */}
          {(availableViews.length > 1 || (activeProduct?.images && activeProduct.images.length > 1)) && (
            <div className="mt-6 flex justify-center gap-2">
              {availableViews.map((view) => (
                <button
                  key={view}
                  onClick={() => handleViewChange(view)}
                  className={`px-6 py-2.5 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${
                    selectedView.toLowerCase() === view.toLowerCase()
                      ? 'bg-black text-white border-black shadow-md'
                      : 'bg-white text-black border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Control Options */}
        <div className="lg:col-span-5 bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex flex-col w-full">
          {/* Tab buttons list */}
          <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${tabsList.length}, minmax(0, 1fr))` }}>
            {tabsList.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 flex flex-col items-center justify-center gap-1.5 border-r last:border-r-0 transition-colors ${activeTab === tab.id ? 'bg-gray-50 text-black border-b-2 border-b-black' : 'text-gray-400 hover:text-black'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 flex-1 min-h-[350px]">
            {/* Tab: Shirt / Product Select */}
            {activeTab === 'product' && (
              <div className="space-y-6">
                {/* Product Selector Dropdown */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Search Blank Templates</Label>
                  <Input
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    placeholder="Search T-shirts, hoodies, mugs, posters..."
                    className="rounded-xl h-11 text-xs border-gray-200"
                  />
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-2 max-h-52 overflow-y-auto space-y-1">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setActiveProduct(product)}
                        className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                          activeProduct.id === product.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-100 text-black'
                        }`}
                      >
                        <img
                          src={product.images[0] || '/custom-tee-mockup.png'}
                          alt={product.name}
                          className="h-9 w-9 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="block text-[10px] font-black uppercase tracking-tight truncate">{product.name}</span>
                            <span className="text-[10px] font-black shrink-0">
                              {/* Show size-aware price for active product, static price for others */}
                              {activeProduct.id === product.id 
                                ? `${settings.currencySymbol}${activeDisplayBasePrice.toFixed(2)}`
                                : `${settings.currencySymbol}${calculateCustomizedPrice(product.price).toFixed(2)}`
                              }
                            </span>
                          </span>
                          <span className={`block text-[9px] truncate ${activeProduct.id === product.id ? 'text-white/60' : 'text-gray-400'}`}>
                            Customizable blank product
                          </span>
                        </span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="px-2 py-3 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                        No matching templates are available right now. Please try a different search.
                      </p>
                    )}
                  </div>
                </div>

                {activeColorOptionDetails.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Select Color
                      {selectedColor && (
                        <span className="ml-2 font-normal normal-case tracking-normal text-gray-500">
                          — {selectedColor}
                        </span>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {activeColorOptionDetails.map(({ title, hex }) => {
                        const isActive = selectedColor === title;
                        return hex ? (
                          <button
                            key={title}
                            title={title}
                            aria-label={title}
                            aria-pressed={isActive}
                            onClick={() => setSelectedColor(title)}
                            className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                              isActive
                                ? 'border-black ring-2 ring-black ring-offset-1 shadow-md scale-110'
                                : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ) : (
                          <button
                            key={title}
                            onClick={() => setSelectedColor(title)}
                            aria-pressed={isActive}
                            className={`px-4 py-2 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${
                              isActive
                                ? 'bg-black text-white border-black shadow-md'
                                : 'bg-white text-black hover:border-gray-300'
                            }`}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSizeOptions.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Size</Label>
                    <div className="flex flex-wrap gap-2">
                      {activeSizeOptions.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-5 py-2 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${selectedSize === size ? 'bg-black text-white border-black shadow-md' : 'bg-white text-black hover:border-gray-300'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Upload Custom Graphics */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upload Artwork Layer</Label>
                  
                  <label className="relative group border-2 border-dashed border-gray-200 hover:border-black rounded-2xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ zIndex: 10 }}
                    />
                    <Upload className="h-8 w-8 text-gray-400 group-hover:text-black mb-3 transition-colors pointer-events-none" />
                    <span className="text-xs font-black uppercase tracking-wider pointer-events-none">{isUploading ? 'Optimizing Image...' : 'Select File'}</span>
                    <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-wider opacity-60 pointer-events-none">Supports JPG, PNG (WebP Auto-compressed)</span>
                  </label>
                </div>

                {hasSelection && (
                  <div className="space-y-4 pt-4 border-t animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pl-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Layer Controls</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Layer Scale (Size)</span>
                        <span>{Math.round(selectedScale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.5"
                        step="0.05"
                        value={selectedScale}
                        onChange={(e) => handleScaleSlider(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                        <span>Layer Rotation</span>
                        <span>{selectedAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={selectedAngle}
                        onChange={(e) => handleRotateSlider(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    {/* Layer arrangement, center alignment, duplication and deletion */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase text-gray-400">Layer Order</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={handleBringForward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                              <ChevronUp className="h-3.5 w-3.5" /> Forward
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSendBackward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                              <ChevronDown className="h-3.5 w-3.5" /> Backward
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[8px] font-black uppercase text-gray-400">Position Align</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={handleCenterHorizontally} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Horizontally">
                              Center H
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCenterVertically} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Vertically">
                              Center V
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={handleDuplicateSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl">
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl border-red-200 hover:bg-red-50 text-red-500">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Text overlay options */}
            {activeTab === 'text' && (
              <div className="space-y-6">
                {/* Issue 2: Add Another Text Button */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddNewText}
                    className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-neutral-800"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Another Text
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Edit Selected Text</Label>
                  <Input
                    placeholder="Type customized word..."
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="rounded-xl h-11 border-gray-200 text-sm font-medium"
                  />
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Select a text layer on canvas to edit, or type to create new
                  </p>
                </div>

                {customText.trim() && (
                  <div className="space-y-5 pt-4 border-t animate-in slide-in-from-top-4 duration-300">
                    {/* Issue 3 FIX + Issue 2: Font selector with preview */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select Font</Label>
                      <select
                        value={textFont}
                        onChange={(e) => handleFontChange(e.target.value)}
                        className="w-full h-10 border rounded-xl px-3 text-xs bg-white focus:outline-none border-gray-200"
                        style={{ fontFamily: textFont }}
                      >
                        {fontOptions.map((font) => (
                          <option 
                            key={font.value} 
                            value={font.value}
                            style={{ fontFamily: font.value }}
                          >
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PREMIUM UI: Compact Color & Gradient Selector */}
                    <div className="space-y-3">
                      {/* Tabs */}
                      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                        <button
                          onClick={() => setColorGradientTab('solid')}
                          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            colorGradientTab === 'solid'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-gray-500 hover:text-black'
                          }`}
                        >
                          Solid Colors
                        </button>
                        <button
                          onClick={() => setColorGradientTab('gradient')}
                          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            colorGradientTab === 'gradient'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-gray-500 hover:text-black'
                          }`}
                        >
                          Gradients
                        </button>
                      </div>

                      {/* Solid Colors Tab */}
                      {colorGradientTab === 'solid' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {textColor !== 'gradient' && colorPalette.find(c => c.hex === textColor)
                              ? colorPalette.find(c => c.hex === textColor)?.name
                              : 'Select Color'}
                          </Label>
                          
                          {/* Compact swatch grid - show first 8 */}
                          <div className="grid grid-cols-8 gap-2">
                            {colorPalette.slice(0, showAllColors ? undefined : 8).map((color) => {
                              const isActive = textColor === color.hex;
                              return (
                                <button
                                  key={color.hex}
                                  title={color.name}
                                  aria-label={color.name}
                                  aria-pressed={isActive}
                                  onClick={() => handleColorChange(color.hex)}
                                  className={`relative w-full aspect-square rounded-full border-2 transition-all group ${
                                    isActive
                                      ? 'border-black ring-2 ring-black ring-offset-2 scale-110'
                                      : 'border-gray-300 hover:border-black hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: color.hex }}
                                >
                                  {isActive && (
                                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-lg" strokeWidth={3} />
                                  )}
                                  {/* Tooltip on hover */}
                                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {color.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Show More/Less button */}
                          {colorPalette.length > 8 && (
                            <button
                              onClick={() => setShowAllColors(!showAllColors)}
                              className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-black transition-colors flex items-center justify-center gap-1"
                            >
                              {showAllColors ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  {colorPalette.length - 8} More Colors
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Gradients Tab */}
                      {colorGradientTab === 'gradient' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {textColor === 'gradient' ? '✨ Gradient Applied' : 'Select Gradient'}
                          </Label>
                          
                          {/* Compact gradient swatches - show first 6 */}
                          <div className="grid grid-cols-6 gap-2">
                            {gradientPresets.slice(0, showAllGradients ? undefined : 6).map((gradient) => {
                              const isActive = textColor === 'gradient';
                              return (
                                <button
                                  key={gradient.name}
                                  title={gradient.name}
                                  aria-label={gradient.name}
                                  onClick={() => handleApplyGradient(gradient)}
                                  className={`relative w-full aspect-square rounded-full border-2 transition-all overflow-hidden group ${
                                    isActive
                                      ? 'border-black ring-2 ring-black ring-offset-2 scale-110'
                                      : 'border-gray-300 hover:border-black hover:scale-110'
                                  }`}
                                  style={{
                                    background: `linear-gradient(135deg, ${gradient.colors[0]} 0%, ${gradient.colors[1]} 100%)`,
                                  }}
                                >
                                  {/* Tooltip on hover */}
                                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {gradient.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Show More/Less button */}
                          {gradientPresets.length > 6 && (
                            <button
                              onClick={() => setShowAllGradients(!showAllGradients)}
                              className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-black transition-colors flex items-center justify-center gap-1"
                            >
                              {showAllGradients ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  {gradientPresets.length - 6} More Gradients
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {hasSelection && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                          <span>Text Scale (Size)</span>
                          <span>{Math.round(selectedScale * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={selectedScale}
                          onChange={(e) => handleScaleSlider(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />

                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                          <span>Text Rotation</span>
                          <span>{selectedAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={selectedAngle}
                          onChange={(e) => handleRotateSlider(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />

                        {/* Text Styling Formatting Bar */}
                        <div className="space-y-1.5 pt-2 border-t">
                          <span className="text-[8px] font-black uppercase text-gray-400">Text Styling & Align</span>
                          <div className="flex gap-1 items-center">
                            <Button 
                              variant={textIsBold ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleBold} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsBold ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Bold"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textIsItalic ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleItalic} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsItalic ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Italic"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textIsUnderline ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={toggleUnderline} 
                              className={`h-9 w-9 p-0 rounded-xl ${textIsUnderline ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Underline"
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            
                            <div className="w-px h-6 bg-gray-200 mx-2" />
                            
                            <Button 
                              variant={textAlign === 'left' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('left')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'left' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Left"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textAlign === 'center' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('center')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'center' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Center"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant={textAlign === 'right' ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => handleTextAlignChange('right')} 
                              className={`h-9 w-9 p-0 rounded-xl ${textAlign === 'right' ? 'bg-black text-white hover:bg-neutral-800' : ''}`}
                              title="Align Right"
                            >
                              <AlignRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Layer order, alignment, duplicate and delete */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-gray-400">Layer Order</span>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={handleBringForward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                                  <ChevronUp className="h-3.5 w-3.5" /> Forward
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSendBackward} className="flex-1 h-8 text-[9px] uppercase font-bold gap-1 rounded-xl">
                                  <ChevronDown className="h-3.5 w-3.5" /> Backward
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase text-gray-400">Position Align</span>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={handleCenterHorizontally} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Horizontally">
                                  Center H
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleCenterVertically} className="flex-1 h-8 text-[9px] uppercase font-bold rounded-xl" title="Center Vertically">
                                  Center V
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={handleDuplicateSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl">
                              <Copy className="h-3.5 w-3.5" /> Duplicate
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDeleteSelected} className="h-8 text-[9px] uppercase font-bold gap-1.5 rounded-xl border-red-200 hover:bg-red-50 text-red-500">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Live Previews */}
            {activeTab === 'ai' && aiPreviewEnabled && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider mb-1">AI Live Preview Pipeline</h3>
                  <p className="text-[10px] text-gray-400 leading-normal uppercase font-black tracking-wider opacity-70">
                    Active AI Model: {settings.printifySettings?.preview.aiConfig.provider || 'gemini'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border text-center space-y-3">
                  <p className="text-xs text-gray-500 leading-normal">
                    Generate highly photorealistic models wearing your custom-designed T-shirt dynamically using artificial intelligence.
                  </p>
                  
                  <Button
                    onClick={handleGenerateAiMockup}
                    disabled={isGeneratingAi}
                    className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-11"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: 'var(--primary-foreground)',
                    }}
                  >
                    {isGeneratingAi ? 'Invoking AI Pipeline...' : 'Generate AI Live Preview'}
                  </Button>
                </div>

                {aiMockups.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Generated AI Mockups</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {aiMockups.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden border bg-gray-100 shadow-sm relative group">
                          <img src={url} alt="AI Mock" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white border border-white/50 px-2 py-1 rounded-full">
                              Active Mockup
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t bg-gray-50 flex flex-col gap-3">
            {/* Feature 2: Pricing Breakdown Display */}
            {activeProduct && (
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Price Breakdown</p>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Template Base Price</span>
                    <span className="font-bold">{settings.currencySymbol}{activeDisplayBasePrice.toFixed(2)}</span>
                  </div>

                  {(() => {
                    const fCanvas = fabricCanvasRef.current;
                    const hasText = !!customText.trim() || (fCanvas && fCanvas.getObjects('i-text').length > 0);
                    const hasDesign = !!customImage || (fCanvas && fCanvas.getObjects('image').length > 0);
                    const editorCharges = settings.printifySettings?.charges?.editorCharges || {
                      textOnly: 0,
                      designOnly: 0,
                      textAndDesign: 0,
                    };

                    let customizationFee = 0;
                    let feeLabel = '';

                    if (hasText && hasDesign) {
                      customizationFee = Number(editorCharges.textAndDesign ?? 0);
                      feeLabel = 'Customization Fee (Text + Design)';
                    } else if (hasDesign) {
                      customizationFee = Number(editorCharges.designOnly ?? 0);
                      feeLabel = 'Customization Fee (Design Only)';
                    } else if (hasText) {
                      customizationFee = Number(editorCharges.textOnly ?? 0);
                      feeLabel = 'Customization Fee (Text Only)';
                    }

                    if (customizationFee > 0) {
                      return (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">+ {feeLabel}</span>
                          <span className="font-bold">{settings.currencySymbol}{customizationFee.toFixed(2)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-black uppercase text-sm">Total</span>
                    <span className="font-black text-green-600 text-lg">
                      {settings.currencySymbol}{activeDisplayCustomerPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 2 & 5: Add to Cart Button with Validation */}
            {(() => {
              const fCanvas = fabricCanvasRef.current;
              const hasText = !!customText.trim() || (fCanvas && fCanvas.getObjects('i-text').length > 0);
              const hasDesign = !!customImage || (fCanvas && fCanvas.getObjects('image').length > 0);
              const hasCustomization = hasText || hasDesign || hasSavedCanvasCustomization;

              return (
                <>
                  {!hasCustomization && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 font-bold text-center">
                        ⚠️ Please add a design or text to customize
                      </p>
                    </div>
                  )}
                  
                  <Button
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={!hasCustomization}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: hasCustomization ? settings.primaryColor : '#9CA3AF',
                      color: 'var(--primary-foreground)',
                      borderColor: 'var(--primary-border)',
                    }}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Add Customized to Cart — {settings.currencySymbol}{activeOrderCustomerPrice.toFixed(2)}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Hidden compilation Canvas */}
      <canvas ref={compiledCanvasRef} className="hidden" />
    </div>
  );
};
