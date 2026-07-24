import { OrderItem } from '@/types';
import { getPrintifyCustomizationSummary } from './printifyCustomizationSummary';

const getEtsyVariationLabel = (item: OrderItem) => {
  const variation = item.etsySelectedVariation;
  if (!variation || typeof variation !== 'object') {
    return '';
  }

  return String(variation.title || variation.name || variation.sku || '').trim();
};

export const getOrderItemSummary = (item: OrderItem) => {
  if (item.source === 'etsy') {
    const labels: string[] = [];
    const variationLabel = getEtsyVariationLabel(item);
    if (variationLabel) {
      labels.push(variationLabel);
    }

    const hasPersonalization =
      (item.etsyPersonalizationAnswers && Object.keys(item.etsyPersonalizationAnswers).length > 0) ||
      (item.etsyPersonalizationFiles && Object.keys(item.etsyPersonalizationFiles).length > 0);

    if (hasPersonalization) {
      labels.push('Personalized');
    }

    return labels.join(' • ');
  }

  return getPrintifyCustomizationSummary(item.customization);
};

export const getLineItemMatchOptions = (item: OrderItem) => ({
  source: item.source,
  etsyListingId: item.etsyListingId,
  etsySelectedVariation: item.etsySelectedVariation,
  etsyPersonalizationAnswers: item.etsyPersonalizationAnswers,
  etsyPersonalizationFiles: item.etsyPersonalizationFiles,
});
