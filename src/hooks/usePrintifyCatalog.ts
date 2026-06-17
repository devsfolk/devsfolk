import { useMemo } from 'react';
import { useShop } from '@/context/ShopContext';
import { PrintifyCatalogTemplate } from '@/types';

const getSyncedVariantId = (variant: any) => (
  Number(variant?.id || variant?.variant_id || variant?.printify_variant_id) || 0
);

const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => {
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
    console.log('[templateHasCheckoutMetadata] Template', template.id, 'accepted as manually published');
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
    console.log('[templateHasCheckoutMetadata] Template', template.id, 'accepted as auto-synced');
    return true;
  }
  
  console.log('[templateHasCheckoutMetadata] Template', template.id, 'REJECTED - providers:', template.providers?.length, 'variants:', template.variants?.length, 'syncStatus:', template.syncStatus);
  return false;
};

export const usePrintifyCatalog = () => {
  const { printifyCatalog, settings } = useShop();

  console.log('[usePrintifyCatalog] printifyCatalog count:', printifyCatalog.length);
  const bp440 = printifyCatalog.find(t => t.id === 'bp_440');
  if (bp440) {
    console.log('[usePrintifyCatalog] bp_440 found, variants:', bp440.variants);
  }

  return useMemo(() => {
    const enabledTemplates = printifyCatalog.filter((template) => (
      template.isEnabled && (template.syncStatus || 'published') === 'published'
    ));
    const providerReadyTemplates = enabledTemplates.filter((template) => template.providers.length > 0);
    const editorReadyTemplates = printifyCatalog.filter((template) => templateHasCheckoutMetadata(template));

    console.log('[usePrintifyCatalog] editorReadyTemplates count:', editorReadyTemplates.length);
    const bp440InEditor = editorReadyTemplates.find(t => t.id === 'bp_440');
    if (bp440InEditor) {
      console.log('[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants:', bp440InEditor.variants);
    }

    return {
      templates: printifyCatalog,
      enabledTemplates,
      providerReadyTemplates,
      editorReadyTemplates,
      isPrintifyEnabled: Boolean(settings.printifySettings?.enabled),
      hasTemplates: printifyCatalog.length > 0,
      hasProviderReadyTemplates: providerReadyTemplates.length > 0,
      hasEditorReadyTemplates: editorReadyTemplates.length > 0,
    };
  }, [printifyCatalog, settings.printifySettings?.enabled]);
};
