import { Product } from '@/types';

export const isRawPrintifyTemplateProduct = (
  product?: Pick<Product, 'slug' | 'isPrintify' | 'printifyProductId'>
) => (
  !!product?.isPrintify &&
  (
    product.slug?.startsWith('printify-template-') ||
    product.printifyProductId?.startsWith('template_')
  )
);
