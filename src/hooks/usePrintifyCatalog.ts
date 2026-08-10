import { useMemo } from 'react';
import { useShop } from '@/context/ShopContext';

export const usePrintifyCatalog = () => {
  const { printifyCatalog, settings } = useShop();

  return useMemo(() => {
    const enabledTemplates = printifyCatalog.filter((template) => (
      template.isEnabled && (template.syncStatus || 'published') === 'published'
    ));
    const providerReadyTemplates = enabledTemplates.filter((template) => template.providers.length > 0);
    const editorReadyTemplates = printifyCatalog.filter((template) => (
      template.isEnabled && template.syncStatus === 'published'
    ));

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
