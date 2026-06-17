import { useMemo } from 'react';
import { useShop } from '@/context/ShopContext';
import { PrintifyCatalogTemplate } from '@/types';

const getSyncedVariantId = (variant: any) => (
  Number(variant?.id || variant?.variant_id || variant?.printify_variant_id) || 0
);

const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => (
  !!template &&
  Array.isArray(template.providers) &&
  template.providers.length > 0 &&
  Array.isArray(template.variants) &&
  template.variants.some((variant: any) => getSyncedVariantId(variant) > 0)
);

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
