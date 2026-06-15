export type PrintifyOptionValue = { title: string; name: string; hex?: string };

/** Collect option value entries from Printify blueprint or variants API payloads. */
const getOptionDefinitions = (payload: any): any[] => {
  if (!payload || typeof payload !== 'object') return [];
  const candidates = [
    payload.options,
    payload.data?.options,
    payload.blueprint?.options,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }
  return [];
};

/** Option groups may expose values as `values` or `items` depending on Printify endpoint/version. */
const getOptionValues = (option: any): any[] => {
  if (!option || typeof option !== 'object') return [];
  if (Array.isArray(option.values) && option.values.length > 0) return option.values;
  if (Array.isArray(option.items) && option.items.length > 0) return option.items;
  return [];
};

const normalizeOptionName = (option: any) =>
  String(option?.name || option?.type || option?.title || option?.label || option?.id || '').toLowerCase();

const normalizeValueTitle = (value: any) =>
  String(value?.title || value?.name || value?.label || value?.value || '').trim();

/** Build ID → { title, name, hex? } from one or more Printify API payloads. */
export const buildOptionValueMap = (...payloads: any[]): Map<number, PrintifyOptionValue> => {
  const map = new Map<number, PrintifyOptionValue>();

  for (const payload of payloads) {
    const options = getOptionDefinitions(payload);
    for (const option of options) {
      const optionName = normalizeOptionName(option);
      const isColor = optionName.includes('color') || optionName.includes('colour') || String(option?.type || '').toLowerCase().includes('color');

      for (const value of getOptionValues(option)) {
        const id = Number(value?.id);
        const title = normalizeValueTitle(value);
        if (!id || !title) continue;

        const colors = Array.isArray(value?.colors) ? value.colors : [];
        const hex = isColor && colors.length > 0 ? String(colors[0]).trim() : undefined;
        map.set(id, { title, name: optionName, ...(hex ? { hex } : {}) });
      }
    }
  }

  return map;
};

export const isVariantOptionEnriched = (option: any): boolean => {
  if (option === undefined || option === null) return true;
  if (typeof option === 'number') return false;
  if (typeof option !== 'object') return false;
  const title = normalizeValueTitle(option);
  return title.length > 0 && title !== String(option.id ?? '');
};

export const isVariantEnriched = (variant: any): boolean => {
  if (!variant || !Array.isArray(variant.options)) return true;
  if (variant.options.length === 0) return true;
  return variant.options.every(isVariantOptionEnriched);
};

export const resolveVariantOptions = (
  variant: any,
  optionValueMap: Map<number, PrintifyOptionValue>,
  optionDefinitions?: any,
): any => {
  if (!variant || !Array.isArray(variant.options)) return variant;

  const options = getOptionDefinitions(optionDefinitions);
  const resolvedOptions = variant.options.map((optionIdOrObj: any, idx: number) => {
    if (isVariantOptionEnriched(optionIdOrObj)) {
      const existing = optionIdOrObj as any;
      const id = Number(existing?.id ?? 0);
      const resolved = id ? optionValueMap.get(id) : undefined;
      const name = String(existing?.name || existing?.type || resolved?.name || '').toLowerCase();
      const title = normalizeValueTitle(existing) || resolved?.title || String(id);
      return {
        ...existing,
        id: id || existing?.id,
        name: name || resolved?.name || existing?.name,
        title,
        ...(resolved?.hex || existing?.hex ? { hex: resolved?.hex || existing?.hex } : {}),
      };
    }

    const id = Number(optionIdOrObj);
    const resolved = optionValueMap.get(id);
    const optionDef = options.find((option: any) =>
      getOptionValues(option).some((value: any) => Number(value?.id) === id),
    ) || options[idx];
    const name = normalizeOptionName(optionDef);
    return {
      id,
      name: resolved?.name || name,
      title: resolved?.title ?? String(id),
      ...(resolved?.hex ? { hex: resolved.hex } : {}),
    };
  });

  return { ...variant, options: resolvedOptions };
};

export const enrichVariants = (
  rawVariants: any[],
  ...payloads: any[]
): any[] => {
  const optionValueMap = buildOptionValueMap(...payloads);
  const optionDefinitions = payloads.flatMap(getOptionDefinitions);

  return rawVariants.map((variant) => {
    const resolved = resolveVariantOptions(variant, optionValueMap, { options: optionDefinitions });
    return {
      ...resolved,
      _enriched: isVariantEnriched(resolved),
    };
  });
};

export const templateVariantsNeedResync = (variants: any[] | undefined): boolean => {
  if (!Array.isArray(variants) || variants.length === 0) return true;
  return variants.some((variant) => !isVariantEnriched(variant));
};
