const PRINTIFY_VIEW_LABELS: Record<string, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left Side',
  right: 'Right Side',
  side: 'Side',
};

export const getPrintifyViewLabel = (view: string) => (
  PRINTIFY_VIEW_LABELS[view] || view.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
);

export const hasPrintifyViewCustomization = (customization: any) => {
  if (!customization || typeof customization !== 'object') return false;
  const objects = customization.fabricState?.objects;
  return !!(
    customization.customImageUrl ||
    customization.customText ||
    (Array.isArray(objects) && objects.length > 0)
  );
};

export const getPrintifyCustomizationSummary = (customization: any) => {
  const customizationsByView = customization?.customizationsByView;
  if (!customizationsByView || typeof customizationsByView !== 'object') {
    return '';
  }

  const labels = Object.entries(customizationsByView)
    .filter(([, viewCustomization]) => hasPrintifyViewCustomization(viewCustomization))
    .map(([view]) => getPrintifyViewLabel(view));

  if (labels.length <= 1) {
    return '';
  }

  if (labels.length <= 3) {
    return `${labels.join(' + ')} customized`;
  }

  return `${labels.length} sides customized: ${labels.join(', ')}`;
};
