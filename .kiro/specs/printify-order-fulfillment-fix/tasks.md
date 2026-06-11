# Tasks

- [x] 1. Wire blueprint-detail enrichment into Template Sync
  - In `runTemplateCatalogSync`, after fetching raw variants for each blueprint+provider, call `fetchPrintifyBlueprintDetail` to get blueprint options
  - Call `buildOptionValueMap` on the blueprint detail to produce an ID→{title,hex} map
  - Map over raw variants with `resolveVariantOptions` to produce enriched variants (options as objects, not integers)
  - Wrap the enrichment step in try/catch with a `setSyncLogs` warning on failure; fall back to raw variants
  - Verify that both helpers `buildOptionValueMap` and `resolveVariantOptions` exist in the file and are correctly implemented
  - **Files:** `src/pages/dashboard/PrintifySettings.tsx`
  - **Depends on:** N/A

- [x] 2. Fix dynamic pricing in BespokeCustomizer
  - Change the fallback in `templateToEditorProduct` from `?? 24.99` to `?? 0`
  - Replace the static `activeBasePrice = activeProduct?.price ?? 0` with a `useMemo` that first checks `activePrintifyVariant?.cost` (Printify sends costs in cents, divide by 100), falls back to `activeProduct?.price`
  - Apply `calculateTemplateRetailPrice` to the variant cost when available so the profit margin is applied correctly
  - **Files:** `src/components/printify/BespokeCustomizer.tsx`
  - **Depends on:** Task 1

- [x] 3. Implement hex color swatch rendering
  - Add `activeColorOptionDetails` useMemo that collects `{title, hex?}` pairs from enriched `activePrintifyVariants`
  - Replace the text-pill color button loop with: hex-available → filled circle button with `style.backgroundColor` and `ring` active indicator; no-hex → existing text pill
  - Add `aria-label` and `aria-pressed` to swatch buttons for accessibility
  - Retain `activeColorOptions` (plain string array) unchanged — it is used for variant matching
  - **Files:** `src/components/printify/BespokeCustomizer.tsx`
  - **Depends on:** Task 1

- [x] 4. Remove customer-facing system note and fix localStorage crashes
  - In `BespokeCustomizer.tsx`: delete the `<p>` element containing "Orders automatically sync to Printify POD warehouses upon payment validation"
  - In `BespokeCustomizer.tsx`: change `canvas.toDataURL('image/png')` to `canvas.toDataURL('image/jpeg', 0.60)` in `generatePreviewDataUrl`
  - In `ShopContext.tsx`: wrap all three `localStorage.setItem(CART_STORAGE_KEY, ...)` calls (in `addToCart`, `removeFromCart`, `updateCartQuantity`) in try/catch with `console.warn` on failure
  - **Files:** `src/components/printify/BespokeCustomizer.tsx`, `src/context/ShopContext.tsx`
  - **Depends on:** N/A

- [x] 5. Build verification and PROGRESS.md update
  - Run `npm run build` in the project root to verify zero TypeScript errors and a clean Vite build
  - Update `PROGRESS.md` with a new dated entry summarising the four bugs fixed and the localStorage hardening
  - **Files:** `PROGRESS.md`
  - **Depends on:** Task 2, Task 3, Task 4
