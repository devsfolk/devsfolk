import { Product } from '@/types';

const normalizeText = (value: any) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.title || value.name || value.value || value.label || '').trim();
  }

  return String(value).trim();
};

const isSizeToken = (value: string) => (
  /^(one size|xs|s|m|l|xl|xxl|xxxl|xxl|xs\/s|s\/m|m\/l|l\/xl|xl\/xxl|xxl\/3xl|3xl|4xl|5xl|6xl|small|medium|large|extra large|extra-large|extra small|\d+(\.\d+)?|[a-z]*\s?\d+x\d+|[a-z]*\s?\d+oz)$/i.test(value.trim())
);

const getVariantOptionText = (variant: any, keys: string[]) => {
  if (!variant || typeof variant !== 'object') {
    return '';
  }

  for (const key of keys) {
    const direct = normalizeText(variant[key]);
    if (direct) {
      return direct;
    }
  }

  const options = Array.isArray(variant.options) ? variant.options : [];
  for (const option of options) {
    const optionName = normalizeText(option?.name || option?.type || option?.key || option?.label).toLowerCase();
    const optionValue = normalizeText(option?.title || option?.value || option?.name);
    const hasColorMetadata = !!option?.hex || (Array.isArray(option?.colors) && option.colors.length > 0);
    const isColorLookup = keys.some((key) => key === 'color' || key === 'colour');

    if ((optionName && keys.some((key) => optionName.includes(key))) || (isColorLookup && hasColorMetadata)) {
      if (optionValue) {
        return optionValue;
      }
    }
  }

  if (variant.options && typeof variant.options === 'object' && !Array.isArray(variant.options)) {
    for (const key of keys) {
      const direct = normalizeText(variant.options[key]);
      if (direct) {
        return direct;
      }
    }
  }

  return '';
};

const getVariantTitleParts = (variant: any) => (
  normalizeText(variant?.title || variant?.name)
    .split(/\s*\/\s*|\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
);

export const getPrintifyVariantColorTitle = (variant: any) => {
  const explicit = getVariantOptionText(variant, ['color', 'colour']);
  if (explicit) {
    return explicit;
  }

  return normalizeText(variant?.color || variant?.colour || variant?.name);
};

export const getPrintifyVariantSize = (variant: any) => {
  const explicit = getVariantOptionText(variant, ['size']);
  if (explicit) {
    return explicit;
  }

  return getVariantTitleParts(variant).find(isSizeToken) || '';
};

export const resolvePrintifyProductVariant = (
  product: Pick<Product, 'variants'> | null | undefined,
  options?: { color?: string; size?: string; allowFallback?: boolean },
) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const selectableVariants = variants.filter((variant: any) => String(variant?.id || variant?.variant_id || variant?.printify_variant_id || '').trim());

  if (selectableVariants.length === 0) {
    return undefined;
  }

  const requestedColor = normalizeText(options?.color).toLowerCase();
  const requestedSize = normalizeText(options?.size).toLowerCase();

  const exactMatch = selectableVariants.find((variant: any) => {
    const variantColor = getPrintifyVariantColorTitle(variant).toLowerCase();
    const variantSize = getPrintifyVariantSize(variant).toLowerCase();
    const colorMatches = !requestedColor || variantColor === requestedColor;
    const sizeMatches = !requestedSize || variantSize === requestedSize;
    return colorMatches && sizeMatches;
  });

  if (exactMatch) {
    return exactMatch;
  }

  if (options?.allowFallback) {
    return selectableVariants[0];
  }

  return undefined;
};
