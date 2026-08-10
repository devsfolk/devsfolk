export const normalizePrintifyText = (value: any) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.title || value.name || value.value || value.label || '').trim();
  }

  return String(value).trim();
};

export const getPrintifyVariantId = (variant: any) => {
  const value = Number(variant?.id || variant?.variant_id || variant?.printify_variant_id);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

export const isPrintifyVariantSelectable = (variant: any) => (
  variant?.is_enabled !== false &&
  variant?.is_available !== false
);

const getVariantOptionText = (variant: any, keys: string[]) => {
  if (!variant || typeof variant !== 'object') {
    return '';
  }

  for (const key of keys) {
    const direct = normalizePrintifyText(variant[key]);
    if (direct) {
      return direct;
    }
  }

  const options = Array.isArray(variant.options) ? variant.options : [];
  for (const option of options) {
    const optionName = normalizePrintifyText(option?.name || option?.type || option?.key || option?.label).toLowerCase();
    const optionValue = normalizePrintifyText(option?.title || option?.value || option?.name);
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
      const direct = normalizePrintifyText(variant.options[key]);
      if (direct) {
        return direct;
      }
    }
  }

  return '';
};

const getVariantTitleParts = (variant: any) => (
  normalizePrintifyText(variant?.title || variant?.name)
    .split(/\s*\/\s*|\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
);

const isSizeToken = (value: string) => (
  /^(one size|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|\d+(\.\d+)?|[a-z]*\s?\d+x\d+|[a-z]*\s?\d+oz)$/i.test(value.trim())
);

export const getPrintifyVariantSize = (variant: any) => {
  const explicit = getVariantOptionText(variant, ['size']);
  if (explicit) {
    return explicit;
  }

  return getVariantTitleParts(variant).find(isSizeToken) || '';
};

export const findLiveVariantById = (variants: any[] = [], variantId: number) => (
  variants.find((variant) => getPrintifyVariantId(variant) === variantId)
);

export const matchLivePrintifyVariantsToSizes = (variants: any[] = [], requestedSizes: string[] = []) => {
  const availableVariants = (Array.isArray(variants) ? variants : []).filter(isPrintifyVariantSelectable);
  const matches = requestedSizes
    .map((size) => {
      const normalizedSize = String(size || '').trim().toLowerCase();
      if (!normalizedSize) {
        return null;
      }

      const liveVariant = availableVariants.find((variant) => getPrintifyVariantSize(variant).trim().toLowerCase() === normalizedSize);
      return liveVariant ? { size: String(size).trim(), variant: liveVariant } : null;
    })
    .filter(Boolean) as Array<{ size: string; variant: any }>;

  const matchedSizes = new Set(matches.map((match) => match.size.toLowerCase()));
  const missingSizes = requestedSizes
    .map((size) => String(size || '').trim())
    .filter((size) => size && !matchedSizes.has(size.toLowerCase()));

  return {
    matches,
    missingSizes: Array.from(new Set(missingSizes)),
  };
};
