import { Product, PrintifyCatalogTemplate } from '@/types';

const getSyncedVariantId = (variant: any) => (
  Number(variant?.id || variant?.variant_id || variant?.printify_variant_id) || 0
);

export const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => {
  if (!template) return false;
  
  // Check 1: Manually published templates (from Template Management)
  // These have syncStatus='published' and variants with title/price, but no providers
  const isManuallyPublished = 
    template.syncStatus === 'published' &&
    Array.isArray(template.variants) &&
    template.variants.length > 0 &&
    template.variants.some((variant: any) => 
      variant?.title && 
      (variant?.price > 0 || variant?.cost > 0)
    );
  
  if (isManuallyPublished) {
    return true;
  }
  
  // Check 2: Auto-synced templates (from Printify API)
  // These have providers and synced variant IDs
  const isAutoSynced =
    Array.isArray(template.providers) &&
    template.providers.length > 0 &&
    Array.isArray(template.variants) &&
    template.variants.some((variant: any) => getSyncedVariantId(variant) > 0);
  
  if (isAutoSynced) {
    return true;
  }
  
  return false;
};

export const hasCurrentPrintifyShopProductLink = (
  template?: Pick<PrintifyCatalogTemplate, 'productId'>,
  products: Product[] = [],
) => (
  !!template?.productId &&
  products.some((product) => (
    product.isPrintify &&
    product.printifyProductId === template.productId
  ))
);

export const isPurchasablePrintifyTemplate = (
  template?: PrintifyCatalogTemplate,
  products: Product[] = [],
) => (
  templateHasCheckoutMetadata(template) &&
  hasCurrentPrintifyShopProductLink(template, products)
);

export const isRawPrintifyTemplateProduct = (
  product?: Pick<Product, 'slug' | 'isPrintify' | 'printifyProductId'>
) => (
  !!product?.isPrintify &&
  (
    product.slug?.startsWith('printify-template-') ||
    product.printifyProductId?.startsWith('template_')
  )
);
