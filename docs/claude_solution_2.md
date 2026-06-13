Printify Integration — Exact Code Audit & Remaining Fix Requirements
Project Overview
This is a multi-tenant platform (DevsFolk) where one Git repo powers all client stores. Stack: React + TypeScript frontend, Supabase (PostgreSQL) database, Vercel hosting. One client has a Print-on-Demand storefront connected to Printify with a custom product customizer (BespokeCustomizer.tsx).

What Has Already Been Implemented (Do Not Redo These)
The following changes are already in the codebase and working:
ShopContext.tsx — upsertPrintifyCatalogTemplates (lines 1484–1588) already writes to both printify_catalog AND products table in the normal sync path. This is correct and should not be changed.
BespokeCustomizer.tsx — getSelectedColorImage (lines 513–555) already implements a fuzzy color-to-image matcher with exact match → all-words match → first-word match → any-word match fallback chain. This is correct.
BespokeCustomizer.tsx — getPrintAreaStyle (lines 265–349) already reads activeTemplate.printAreas and adjusts aspect ratio from Printify's placeholder.width / placeholder.height. This is partially correct (see Issue 4 below).
PrintifySettings.tsx — buildOptionValueMap and resolveVariantOptions (lines 17–64) already implement the integer-to-object option enrichment pipeline. This is correct logic.

What Is Still Broken — Exact Issues With File + Line References

Issue 1 — $20.99 fallback price still appears when baseCost is zero
File: ShopContext.tsx

Function: templateToProduct (around line 688)

Exact problematic line:
tsconst basePrice = template.baseCost ?? template.retailPrice ?? 0;
What happens: If baseCost is undefined or 0 (which occurs when a template's provider/variant fetch failed during sync), calculatePrintifyRetailPrice receives 0 as basePrice. Inside that function (line 684):
tsconst effectiveBase = basePrice > 0 ? basePrice : Math.max(0, Number(charges?.templateBasePrice ?? 14.99));
It falls back to $14.99, applies 40% markup, and produces exactly $20.99 for every template.
Root cause: baseCost is only set in PrintifySettings.tsx runTemplateCatalogSync when cheapestCostCents > 0 — meaning a template whose provider or variant fetch failed will always have baseCost = undefined, and will always show $20.99.
What needs to happen: The sync pipeline must ensure variants are fetched reliably. If a template has no baseCost after sync, it should be flagged visually in the admin dashboard rather than silently showing a fake price to customers. Do NOT change calculatePrintifyRetailPrice itself — the fallback logic there is intentional for edge cases.

Issue 2 — Size/color selection does not update price — silent enrichment failure
File: PrintifySettings.tsx

Function: runTemplateCatalogSync (lines 435–560)

Exact problematic block (lines 505–511):
ts} catch (enrichError: any) {
  setSyncLogs(prev => [
    ...prev,
    `[WARNING] Option resolution skipped for ${template.title}: ${enrichError.message || enrichError}`,
  ]);
  console.error('[ENRICHMENT ERROR]', enrichError);
  // enrichedVariants remains rawVariants — sync continues with unresolved IDs
}
What happens: If fetchPrintifyBlueprintDetail fails (network error, rate limit, API hiccup), the catch block silently continues with enrichedVariants = rawVariants — meaning raw integer arrays like [78, 12] get stored in Supabase instead of resolved objects like [{ id: 78, name: "color", title: "White", hex: "#ffffff" }, { id: 12, name: "size", title: "S" }].
Downstream effect in BespokeCustomizer.tsx: activeColorOptionDetails (line 375) checks:
tsif (typeof opt === 'number') return false;
So unenriched integer options are silently skipped → zero colors extracted → selectedColor stays empty → activePrintifyVariant matches no variant by color → falls back to first variant → price never changes with size.
What needs to happen: The enrichment failure must be retried at least once before giving up. If it still fails, that template's variants should be stored with a flag (e.g. _enriched: false) and the admin dashboard should surface a warning badge on that template saying "Variants not enriched — resync required." Do NOT skip storing the template entirely; just flag it clearly.

Issue 3 — Color image swap works in code but fails at runtime for most Printify images
File: BespokeCustomizer.tsx

Function: getSelectedColorImage (lines 513–555)

Status: The code logic is correct. The real-world failure is that Printify blueprint mockup image URLs (format: https://images.printify.com/mockups/...) do not contain color name tokens in their filenames. The fuzzy matcher finds no match and returns images[0] every time.
What needs to happen: During sync in PrintifySettings.tsx, when fetchPrintifyBlueprintDetail is called, the blueprint detail response contains a images array where each image object has a variant_ids array linking that image to specific variant IDs. This variant-to-image mapping needs to be stored. Specifically:
During sync, build a map: variantId → imageUrl from blueprintDetail.images (each image has variant_ids: number[] and src: string). Store this map inside each template's variants — add an image_url field to each enriched variant object. Then in BespokeCustomizer.tsx, when selectedColor changes, find the matching variant and read its image_url instead of doing filename fuzzy matching.

Issue 4 — Print areas: aspect ratio fixed but position is still hardcoded
File: BespokeCustomizer.tsx

Function: getPrintAreaStyle (lines 265–349)

Current state: The function reads placeholder.width and placeholder.height to compute aspect ratio (lines 322–340). This part works. But top and left are still determined by hardcoded keyword matching (lines 266–311) and are never updated from Printify's actual position data.
What needs to happen: Printify's print_areas[0].placeholders[0] also contains position data with percentage-based or pixel-based coordinates. If that position data exists, use it to set top and left as well — not just width/height.

Issue 5 — print_areas is never actually fetched (silent data gap)
File: PrintifySettings.tsx

Function: runTemplateCatalogSync (line 498)

Exact line:
tsprintAreasByBlueprintId[template.blueprintId] = blueprintDetail?.print_areas || [];
What happens: The Printify Blueprint Detail endpoint (/catalog/blueprints/{id}.json) does NOT return a print_areas field. That field is part of a different endpoint or is not available at the blueprint level. So blueprintDetail?.print_areas is always undefined, and printAreasByBlueprintId is always populated with [].
Result: activeTemplate.printAreas in BespokeCustomizer.tsx is always an empty array, so the aspect-ratio fix in getPrintAreaStyle never actually runs — it always falls through to the hardcoded keyword matching.
What needs to happen: Check the Printify API documentation for the correct endpoint or field that provides print_areas with placeholders (including width, height, and position). If it is available via the variants endpoint response or a separate call, fetch it and store it correctly. If it is not available via the API, remove the dead code that reads printAreasByBlueprintId and document the limitation clearly.

Data Flow Summary (For Context)
Admin triggers sync (PrintifySettings.tsx)
  → fetchPrintifyBlueprints()               — gets blueprint list
  → fetchPrintifyBlueprintProviders()       — gets print providers per blueprint
  → fetchPrintifyBlueprintVariants()        — gets variants (raw integers in options[])
  → fetchPrintifyBlueprintDetail()          — gets option metadata to resolve integers
      → buildOptionValueMap()               — builds id → { title, hex } map
      → resolveVariantOptions()             — replaces integers with objects in each variant
  → upsertPrintifyCatalogTemplates()        — saves to printify_catalog + products tables

Customer opens customizer (BespokeCustomizer.tsx)
  → reads from printify_catalog via usePrintifyCatalog hook
  → activeColorOptionDetails reads variant.options[] — needs enriched objects, not integers
  → getVariantColor / getVariantSize read enriched options to build selectors
  → activePrintifyVariant matches selected color+size to a specific variant
  → activeBaseCostDollars reads variant.cost to compute real price
  → getSelectedColorImage matches selected color to an image URL

Files Involved
FileRolesrc/context/ShopContext.tsxGlobal state, sync pipeline, DB writessrc/components/printify/BespokeCustomizer.tsxCustomer-facing editor, pricing, image swapsrc/pages/dashboard/PrintifySettings.tsxAdmin sync trigger, enrichment pipelinesrc/lib/printifyApi.tsAPI gateway callssrc/types.tsType definitionssupabase/schema.sqlDB schema

What Gemini Should Focus On

Make enrichment in runTemplateCatalogSync retry on failure and surface a visible warning badge in the admin dashboard for any template whose variants are not enriched.
During the blueprint detail fetch, extract the images array's variant_ids mapping and store image_url on each enriched variant so color-based image swapping works reliably at runtime.
Verify the correct Printify API source for print_areas with placeholders — fix or remove the dead printAreasByBlueprintId code accordingly.
Do not modify upsertPrintifyCatalogTemplates, calculatePrintifyRetailPrice, getSelectedColorImage, buildOptionValueMap, or resolveVariantOptions — these are already correct.