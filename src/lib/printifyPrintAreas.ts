import type { PrintArea } from '@/hooks/useTemplateForm';

const normalizeAreaView = (area: any) => String(area?.view || area?.position || '').trim().toLowerCase();

export const normalizePrintifyPrintAreas = (areas: any[] = []): PrintArea[] => {
  if (!Array.isArray(areas) || areas.length === 0) {
    return [];
  }

  const seenViews = new Set<string>();
  const normalized: PrintArea[] = [];

  areas.forEach((area: any, index: number) => {
    if (!area || typeof area !== 'object') {
      return;
    }

    const view = normalizeAreaView(area);
    const fallbackKey = view || String(area.id || area.name || index).trim().toLowerCase();
    if (!fallbackKey) {
      return;
    }

    if (view && seenViews.has(view)) {
      return;
    }

    if (view) {
      seenViews.add(view);
    }

    normalized.push({
      ...area,
      id: area.id || `pa_${fallbackKey}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      view: view || area.view || area.position || 'front',
      position: area.position || area.view || view || 'front',
      name: area.name || `${(view || area.position || 'front').charAt(0).toUpperCase()}${String(view || area.position || 'front').slice(1)} Area`,
      x: Number(area.x ?? 25),
      y: Number(area.y ?? 20),
      width: Number(area.width ?? 50),
      height: Number(area.height ?? 60),
      dpi: Number(area.dpi ?? 300),
      pixelX: area.pixelX,
      pixelY: area.pixelY,
      pixelWidth: area.pixelWidth,
      pixelHeight: area.pixelHeight,
      referenceMockupWidth: area.referenceMockupWidth,
      referenceMockupHeight: area.referenceMockupHeight,
      referenceMockupUrl: area.referenceMockupUrl,
    });
  });

  return normalized;
};
