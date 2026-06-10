import { Product } from '@/types';

export const isRawPrintifyTemplateProduct = (product?: Pick<Product, 'id' | 'isPrintify' | 'printifyProductId'>) => (
  !!product?.isPrintify &&
  (
    product.id.startsWith('printify_template_') ||
    product.printifyProductId?.startsWith('template_')
  )
);
