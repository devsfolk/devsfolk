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

export const getOrderItemDetailLines = (item: OrderItem) => {
  const lines: string[] = [];

  if (item.color) {
    lines.push(`Color: ${item.color}`);
  }

  if (item.size) {
    lines.push(`Size: ${item.size}`);
  }

  if (item.source === 'etsy') {
    const variationLabel = getEtsyVariationLabel(item);
    if (variationLabel) {
      lines.push(`Variation: ${variationLabel}`);
    }

    if (item.etsyPersonalizationAnswers && typeof item.etsyPersonalizationAnswers === 'object') {
      Object.entries(item.etsyPersonalizationAnswers).forEach(([questionId, answer]) => {
        const cleanAnswer = String(answer || '').trim();
        if (cleanAnswer) {
          lines.push(`Personalization ${questionId}: ${cleanAnswer}`);
        }
      });
    }

    if (item.etsyPersonalizationFiles && typeof item.etsyPersonalizationFiles === 'object') {
      Object.entries(item.etsyPersonalizationFiles).forEach(([fileKey, fileValue]) => {
        const fileName = String(fileValue?.name || '').trim();
        if (fileName) {
          lines.push(`Upload ${fileKey}: ${fileName}`);
        }
      });
    }
  }

  return lines;
};

export const getLineItemMatchOptions = (item: OrderItem) => ({
  source: item.source,
  etsyListingId: item.etsyListingId,
  etsySelectedVariation: item.etsySelectedVariation,
  etsyPersonalizationAnswers: item.etsyPersonalizationAnswers,
  etsyPersonalizationFiles: item.etsyPersonalizationFiles,
});
