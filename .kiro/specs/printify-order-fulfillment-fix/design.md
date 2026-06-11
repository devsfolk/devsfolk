# Design Document: Printify Order Fulfillment Fix

## Overview

Six targeted bug fixes and one stability hardening for the Printify POD (Print-on-Demand) integration:

---

## Bug Details

### Bug 1 — `print_areas` payload shape (`api/printify/orders.ts`)
`buildPrintAreasForItem` was generating a plain key/value object `{ "front": "<artworkUrl>" }` instead of the array-of-objects format required by Printify's order API, causing all custom template orders to be rejected at submission.

### Bug 2 — Dynamic pricing (`BespokeCustomizer.tsx`)
Every raw template displayed the same hardcoded `$24.99` price because the fallback value `24.99` was hard-coded in `templateToEditorProduct`. Selecting a larger variant (e.g. XXL) never triggered a price recalculation because `activeBasePrice` was derived from the frozen product price, not the live variant.

### Bug 3 — Unresolved variant option IDs (`PrintifySettings.tsx`)
Template Sync stored raw integer option IDs (e.g. `[10, 12]`) in each variant's `options` array. The human-readable labels and hex codes live in the blueprint detail endpoint, which was never called during sync.

### Bug 4 — Color swatches not rendered (`BespokeCustomizer.tsx`)
Even after Fix 3 provides enriched variant data, the color selector only renders text pills. Hex color data available in the enriched `options[].hex` field was not used to render circular colour swatches.

### Bug 5 — Customer-facing system note (`BespokeCustomizer.tsx`)
A literal implementation note — "Orders automatically sync to Printify POD warehouses upon payment validation" — was hard-coded in the customer-visible editor footer.

### Bug 6 — localStorage crash on cart writes (`ShopContext.tsx`, `BespokeCustomizer.tsx`)
Three `localStorage.setItem(CART_STORAGE_KEY, ...)` calls inside cart mutation functions were not wrapped in try/catch. When the browser storage quota is exceeded (accelerated by large PNG preview data URLs), these calls throw uncaught `QuotaExceededError`, silently breaking cart persistence.

---

## Expected Behavior

- **Bug 1:** `print_areas` is always an array with `variant_ids`, `placeholders[].position`, and `placeholders[].images[].id` (Printify media library ID from the upload step).
- **Bug 2:** Each template displays a price equal to `baseCost × (1 + profitMarginPercent/100)`. Selecting a different variant size/color updates the displayed price immediately. Falls back to the template-level price when no per-variant cost is available.
- **Bug 3:** After Template Sync, each variant's `options` array contains `{ id, name, title, hex? }` objects instead of bare integers. Color options include the hex code from the blueprint detail response.
- **Bug 4:** Color options with a `hex` value render as filled circular swatches. Active swatch shows a ring/outline indicator. Options without hex fall back to text pills. Screen-reader accessible via `aria-label` and `aria-pressed`.
- **Bug 5:** The system note string is absent from all rendered output.
- **Bug 6:** Cart write failures are silently swallowed with a `console.warn`; the in-memory cart continues to work. Preview images are exported as JPEG at 0.60 quality instead of PNG, reducing data URL size by ~5–10×.

---

## Hypothesized Root Cause

- **Bug 1:** The array format was the intended output but the pre-rewrite code produced a plain object. The fix was applied in a prior iteration; this document confirms it.
- **Bug 2:** The fallback `?? 24.99` was a placeholder that was never replaced with `0`. The `activeBasePrice` variable was not reactive to `activePrintifyVariant`.
- **Bug 3:** The `runTemplateCatalogSync` function only called the variants endpoint, not the blueprint detail endpoint. The option-resolution helpers (`buildOptionValueMap`, `resolveVariantOptions`) were added but not wired into the sync loop.
- **Bug 4:** The color-selector JSX was written before enriched variant data was available, so it only used plain string labels.
- **Bug 5:** The note was added during development as a placeholder and was never removed.
- **Bug 6:** Cart persistence was written without defensive storage handling. PNG was chosen as the canvas export format without considering size implications for localStorage.

---

## Fix Implementation

| Fix | File | Root Cause |
|-----|------|------------|
| 1 — `print_areas` payload shape | `api/printify/orders.ts` | `buildPrintAreasForItem` was already fixed in a previous iteration to return the array format. This document confirms the correct shape and the `mediaId` threading. |
| 2 — Dynamic pricing | `src/components/printify/BespokeCustomizer.tsx` | Template price uses a hardcoded `$24.99` fallback; variant selection does not update the displayed price. |
| 3 — Variant option enrichment (Template Sync) | `src/pages/dashboard/PrintifySettings.tsx` | Printify variants arrive with raw integer option IDs; blueprint detail is never fetched during sync so IDs remain unresolved. |
| 4 — Color swatch rendering | `src/components/printify/BespokeCustomizer.tsx` | `getVariantColor` returns empty string when options are still integer IDs; swatch area is hidden. After Fix 3 enriches the variants, the *display layer* must also be upgraded from text pills to hex-based circular swatches. |
| 5 — Remove system note | `src/components/printify/BespokeCustomizer.tsx` | A literal implementation note is hard-coded in the customer-facing editor footer. |
| 6 — localStorage crash prevention | `src/context/ShopContext.tsx` + `src/components/printify/BespokeCustomizer.tsx` | Three cart `setItem` calls are not inside try/catch; quota-exceeded errors silently crash state. Canvas preview exports PNG, producing unnecessarily large data URLs that accelerate quota exhaustion. |

All changes are surgical. No mobile layout, responsive logic, or unrelated code paths are touched.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (React / Vite)                                          │
│                                                                 │
│  BespokeCustomizer.tsx                                          │
│    ├─ Fix 2: activeBasePrice derived from activePrintifyVariant │
│    ├─ Fix 4: Render hex-circle swatches from enriched variants  │
│    ├─ Fix 5: Delete system-note <p> from Action Footer          │
│    └─ Fix 6: canvas.toDataURL('image/jpeg', 0.60)               │
│                                                                 │
│  PrintifySettings.tsx                                           │
│    └─ Fix 3: runTemplateCatalogSync() fetches blueprint detail  │
│               and calls resolveVariantOptions() before saving   │
│                                                                 │
│  ShopContext.tsx                                                 │
│    └─ Fix 6: three CART_STORAGE_KEY setItem calls wrapped in    │
│               try/catch with graceful silent failure            │
└─────────────────────────────────────────────────────────────────┘
                        │ fetch /api/printify/catalog
┌─────────────────────────────────────────────────────────────────┐
│  Serverless Functions (Vercel / api/)                           │
│                                                                 │
│  api/printify/catalog.ts  (no changes required)                 │
│    └─ mode: 'blueprint' already routes to                       │
│       /catalog/blueprints/:id.json                              │
│                                                                 │
│  api/printify/orders.ts                                         │
│    └─ Fix 1 (confirmed): buildPrintAreasForItem already returns │
│       the correct array format with mediaId from upload         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fix 1 — `buildPrintAreasForItem` in `api/printify/orders.ts`

### Status

The function has already been rewritten in a prior pass to return the Printify-compatible array. This section exists to document the required shape and confirm that `mediaId` threading is correct.

### Required `print_areas` shape

```json
[
  {
    "variant_ids": [<variantId: number>],
    "placeholders": [
      {
        "position": "<position: string>",
        "images": [
          {
            "id": "<mediaLibraryId: string>",
            "x": 0.5,
            "y": 0.5,
            "scale": 1,
            "angle": 0
          }
        ]
      }
    ]
  }
]
```

### How `mediaId` is threaded

1. `uploadArtworkDataUrl` calls `POST /v1/uploads/images.json` and parses the response.
2. The Printify upload response contains both `id` (the media library ID) and `preview_url`.
3. `uploadArtworkDataUrl` currently returns `{ id, previewUrl }`.
4. `buildPrintAreasForItem` receives `uploadedMediaId = uploadResult.id` and puts it in `images[0].id`.
5. `variantId` (passed as a parameter) goes directly into `variant_ids: [variantId]`.

No change to this file is required. The function signature is:

```ts
const buildPrintAreasForItem = async (
  apiKey: string,
  item: any,
  index: number,
  orderId: string,
  missing: string[],
  variantId: number
): Promise<PrintifyPrintArea[] | null>
```

### Correctness invariant

For any `(position, mediaId, variantId)` where each is non-empty/non-zero:

```
result[0].variant_ids[0]                 === variantId
result[0].placeholders[0].position      === position
result[0].placeholders[0].images[0].id  === mediaId
```

---

## Fix 2 — Dynamic Pricing in `BespokeCustomizer.tsx`

### Root cause

`templateToEditorProduct` converts a `PrintifyCatalogTemplate` to the `Product` type used internally. It computes `price` once at product-list build time:

```ts
price: calculateTemplateRetailPrice(template.baseCost ?? template.retailPrice ?? 24.99)
```

Two problems:
1. The fallback is `24.99` — a hardcoded dollar amount that masks a missing `baseCost`. This makes every template whose `baseCost` was not synced appear to cost `$24.99`, which is wrong and inconsistent.
2. `activeBasePrice` is sourced from `activeProduct?.price`, which is fixed at the snapshot captured when the product list was built. Selecting an XXL variant (which may have a higher cost in Printify) never triggers a price recalculation.

### Changes

**A — Fix fallback in `templateToEditorProduct`**

Change:
```ts
price: calculateTemplateRetailPrice(template.baseCost ?? template.retailPrice ?? 24.99)
```
To:
```ts
price: calculateTemplateRetailPrice(template.baseCost ?? template.retailPrice ?? 0)
```

A zero `baseCost` with zero margin produces `$0.00`, which is visually distinct and prompts an admin to run a sync — correct signal. It does not mislead the customer with a fabricated price.

**B — Reactive `activeBasePrice` derived from the active variant**

Replace the static derivation:
```ts
const activeBasePrice = activeProduct?.price ?? 0;
```

With a `useMemo` that checks the selected variant first:
```ts
const activeBasePrice = useMemo(() => {
  // Printify variant costs are in cents (e.g. 1499 = $14.99)
  const variantCostCents = Number(
    activePrintifyVariant?.cost ??
    activePrintifyVariant?.price ?? 0
  );
  if (variantCostCents > 0) {
    const variantCostDollars = variantCostCents / 100;
    return calculateTemplateRetailPrice(variantCostDollars);
  }
  // Fall back to the template-level price already encoded in the product
  return activeProduct?.price ?? 0;
}, [activePrintifyVariant, activeProduct]);
```

`activeCustomerPrice` remains `calculateCustomizedPrice(activeBasePrice)` — no change downstream.

**Dependency note:** `activePrintifyVariant` already changes reactively when `selectedColor` or `selectedSize` changes (it is a `useMemo` dependent on both). Chaining `activeBasePrice` to `activePrintifyVariant` completes the reactive chain:

```
selectedColor / selectedSize → activePrintifyVariant → activeBasePrice → activeCustomerPrice → displayed price
```

**Where `profitMarginPercent` is read from**

`calculateTemplateRetailPrice` in `BespokeCustomizer.tsx` already reads from `settings.printifySettings?.charges`:

```ts
const calculateTemplateRetailPrice = (basePrice: number) => {
  const charges = settings.printifySettings?.charges;
  const profitMarginPercent = Math.max(0, Number(charges?.profitMarginPercent ?? 0));
  return Number((basePrice * (1 + profitMarginPercent / 100)).toFixed(2));
};
```

`settings` comes from `useShop()` which hydrates from Supabase (`store_settings` table, key `default`) on load, falling back to localStorage. No change needed here — the existing read path is correct.

---

## Fix 3 — Variant Option Enrichment During Template Sync in `PrintifySettings.tsx`

### Root cause

`runTemplateCatalogSync` calls `fetchPrintifyBlueprintVariants` which hits:

```
GET /catalog/blueprints/:id/print_providers/:pid/variants.json
```

The returned variants have the shape:
```json
{ "id": 12345, "title": "Navy / XL", "options": [10, 12] }
```

The integers `10` and `12` are option *value* IDs. The human-readable labels (`"Navy Blue"`, `"XL"`) and color hex codes (`"#1F2E4D"`) live in the blueprint detail endpoint:

```
GET /catalog/blueprints/:id.json
```

…which returns:
```json
{
  "options": [
    {
      "name": "Colors",
      "type": "color",
      "values": [
        { "id": 10, "title": "Navy Blue", "colors": ["#1F2E4D"] }
      ]
    },
    {
      "name": "Sizes",
      "type": "size",
      "values": [
        { "id": 12, "title": "XL" }
      ]
    }
  ]
}
```

### API calls

Inside the per-template loop in `runTemplateCatalogSync`, after fetching variants:

1. **Blueprint detail:**
   ```
   GET /v1/catalog/blueprints/{blueprintId}.json
   ```
   Called via the existing `fetchPrintifyBlueprintDetail(apiKey, template.blueprintId)` helper in `printifyApi.ts`. This function is already exported and already supported by `api/printify/catalog.ts` via `mode: 'blueprint'`.

2. **Variant enrichment:**
   Call `buildOptionValueMap(blueprintDetail)` to get a flat `Map<optionValueId → { title, hex? }>`.
   Then map over the raw variants array with `resolveVariantOptions(variant, map, blueprintDetail)`.

### Pure helpers (already present in `PrintifySettings.tsx`)

Both helpers were added in a prior pass. For completeness:

```ts
// Builds: Map<optionValueId, { title, hex? }> from blueprint detail options array
const buildOptionValueMap = (blueprintDetail: any): Map<number, { title: string; hex?: string }> => {
  const map = new Map<number, { title: string; hex?: string }>();
  for (const option of blueprintDetail?.options ?? []) {
    const isColor = String(option?.type || '').toLowerCase() === 'color';
    for (const value of option?.values ?? []) {
      const id = Number(value?.id);
      const title = String(value?.title || value?.name || '').trim();
      if (!id || !title) continue;
      const hex = isColor && Array.isArray(value?.colors) && value.colors[0]
        ? String(value.colors[0]).trim()
        : undefined;
      map.set(id, { title, ...(hex ? { hex } : {}) });
    }
  }
  return map;
};

// Replaces integer option IDs in a variant with { id, name, title, hex? } objects
const resolveVariantOptions = (
  variant: any,
  optionValueMap: Map<number, { title: string; hex?: string }>,
  blueprintDetail?: any
): any => {
  if (!variant || !Array.isArray(variant.options)) return variant;
  const optionDefs = blueprintDetail?.options ?? [];
  const resolvedOptions = variant.options.map((optionIdOrObj: any, idx: number) => {
    // If already resolved (object with title), pass through unchanged
    if (optionIdOrObj && typeof optionIdOrObj === 'object' && optionIdOrObj.title) {
      return optionIdOrObj;
    }
    const id = Number(optionIdOrObj);
    const resolved = optionValueMap.get(id);
    const optionDef = optionDefs[idx];
    const name = String(optionDef?.name || optionDef?.type || '').toLowerCase();
    return {
      id,
      name,
      title: resolved?.title ?? String(id),
      ...(resolved?.hex ? { hex: resolved.hex } : {}),
    };
  });
  return { ...variant, options: resolvedOptions };
};
```

### Integration in `runTemplateCatalogSync`

Inside the per-template try block, after variants are fetched:

```ts
// Existing code:
const variantData = await fetchPrintifyBlueprintVariants(apiKey, blueprintId, primaryProviderId);
const rawVariants = normalizePrintifyList(variantData, ['variants']);

// New: fetch blueprint detail and enrich variants
let enrichedVariants = rawVariants;
try {
  const blueprintDetail = await fetchPrintifyBlueprintDetail(apiKey, template.blueprintId);
  const optionValueMap = buildOptionValueMap(blueprintDetail);
  enrichedVariants = rawVariants.map((v: any) =>
    resolveVariantOptions(v, optionValueMap, blueprintDetail)
  );
} catch (enrichError: any) {
  setSyncLogs(prev => [
    ...prev,
    `[WARNING] Option resolution skipped for ${template.title}: ${enrichError.message || enrichError}`,
  ]);
  // enrichedVariants remains rawVariants — sync continues with unresolved IDs
}

variantsByBlueprintId[template.blueprintId] = enrichedVariants;
```

The `fetchPrintifyBlueprintDetail` import is already present in `PrintifySettings.tsx` (confirmed in the imports list).

### Enriched variant shape stored in catalog

After enrichment, a variant looks like:

```json
{
  "id": 12345,
  "title": "Navy / XL",
  "options": [
    { "id": 10, "name": "colors", "title": "Navy Blue", "hex": "#1F2E4D" },
    { "id": 12, "name": "sizes",  "title": "XL" }
  ]
}
```

This shape is exactly what `getVariantColor` and `getVariantSize` in `BespokeCustomizer.tsx` already know how to parse via `getVariantOptionText`.

---

## Fix 4 — Color Swatch Rendering in `BespokeCustomizer.tsx`

### Root cause

The existing color-selection UI renders text pill buttons:

```tsx
{activeColorOptions.map((color) => (
  <button key={color} onClick={() => setSelectedColor(color)}
    className={`px-4 py-2 text-xs rounded-xl font-black uppercase tracking-wider border-2 ...`}
  >
    {color}
  </button>
))}
```

`activeColorOptions` is derived as:

```ts
const activeColorOptions = useMemo(() => (
  uniqueOptionValues(activePrintifyVariants.map(getVariantColor))
), [activePrintifyVariants]);
```

After Fix 3, `getVariantColor` returns the `.title` field from the resolved option (e.g. `"Navy Blue"` or a hex code like `"#1F2E4D"`). The text-pill UI works for color names but wastes the hex data. The fix upgrades the UI to use circular swatches when a hex color is available, with a text fallback when it is not.

### New state

Add a `useMemo` to extract the full color-option objects (not just the title strings):

```ts
// Collect { title, hex? } pairs for the color selector — used by the swatch renderer
const activeColorOptionDetails = useMemo(() => {
  const seen = new Set<string>();
  const result: Array<{ title: string; hex?: string }> = [];

  for (const variant of activePrintifyVariants) {
    const options = Array.isArray(variant?.options) ? variant.options : [];
    const colorOpt = options.find((opt: any) => {
      const name = String(opt?.name || opt?.type || '').toLowerCase();
      return name.includes('color') || name.includes('colour');
    });
    if (!colorOpt) continue;
    const title = normalizeOptionText(colorOpt.title || colorOpt.value || colorOpt.name);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    result.push({
      title,
      hex: colorOpt.hex
        ? String(colorOpt.hex).trim()
        : /^#[0-9a-f]{3,6}$/i.test(title) ? title : undefined,
    });
  }
  return result;
}, [activePrintifyVariants]);
```

`activeColorOptions` (the plain string array) is retained — it is used by `activePrintifyVariant` matching logic which must continue to work.

### Swatch renderer

Replace the text-pill button block with:

```tsx
{activeColorOptionDetails.length > 0 && (
  <div className="space-y-3 pt-2">
    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      Select Color
      {selectedColor && (
        <span className="ml-2 font-normal normal-case tracking-normal text-gray-500">
          — {selectedColor}
        </span>
      )}
    </Label>
    <div className="flex flex-wrap gap-2">
      {activeColorOptionDetails.map(({ title, hex }) => {
        const isActive = selectedColor === title;
        return hex ? (
          // Hex swatch: filled circle with ring indicator when active
          <button
            key={title}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
            onClick={() => setSelectedColor(title)}
            className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
              isActive
                ? 'border-black ring-2 ring-black ring-offset-1 shadow-md scale-110'
                : 'border-gray-200 hover:border-gray-400 hover:scale-105'
            }`}
            style={{ backgroundColor: hex }}
          />
        ) : (
          // Text fallback pill when no hex is available
          <button
            key={title}
            onClick={() => setSelectedColor(title)}
            aria-pressed={isActive}
            className={`px-4 py-2 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${
              isActive
                ? 'bg-black text-white border-black shadow-md'
                : 'bg-white text-black hover:border-gray-300'
            }`}
          >
            {title}
          </button>
        );
      })}
    </div>
  </div>
)}
```

Key design decisions:
- `aria-label` and `aria-pressed` preserve accessibility for screen-reader users.
- Active state uses a `ring` + `border` combination for clear visual distinction without relying on color alone (WCAG 1.4.11 non-text contrast).
- `scale-110` on the active swatch replaces the dark fill for hex swatches, so the swatch color is always visible.
- No new library dependencies.

---

## Fix 5 — Remove System Note from Editor Footer in `BespokeCustomizer.tsx`

### Location

The Action Footer in `BespokeCustomizer.tsx` currently renders (approximately line 1320 in the original file, just below the "Add Customized to Cart" button):

```tsx
<p className="text-[8px] text-gray-400 text-center uppercase font-bold tracking-widest opacity-60">
  Orders automatically sync to Printify POD warehouses upon payment validation
</p>
```

### Change

Delete this `<p>` element entirely. The surrounding `<div className="p-6 border-t bg-gray-50 flex flex-col gap-3">` and the `Button` remain untouched. The footer height will collapse slightly; this is intentional and does not affect any layout constraint.

---

## Fix 6 — localStorage Crash Prevention in `ShopContext.tsx` + `BespokeCustomizer.tsx`

### Context

Three `localStorage.setItem(CART_STORAGE_KEY, ...)` calls inside `ShopContext.tsx` — in `addToCart`, `removeFromCart`, and `updateCartQuantity` — are **not** wrapped in try/catch. When the browser storage quota is exceeded (common when the Printify catalog or large PNG preview data URLs accumulate), these calls throw a `DOMException: QuotaExceededError` that propagates out of the `setState` updater function, leaving the in-memory cart state updated but the persisted state unchanged.

Compounding this: `generatePreviewDataUrl` in `BespokeCustomizer.tsx` produces a `image/png` data URL at full 600×600 resolution, which can be ≈ 300 KB per item stored in cart state. Switching to JPEG at 0.60 quality reduces this to ≈ 30–60 KB — a 5–10× reduction.

### Changes in `ShopContext.tsx`

The three cart writes (inside `addToCart`, `removeFromCart`, and `updateCartQuantity`) must each be wrapped:

```ts
// Before (example from addToCart):
localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));

// After:
try {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
} catch (storageError) {
  console.warn('[DevsFolk] Cart could not be persisted to localStorage (storage quota exceeded). Cart changes will be lost on page refresh.', storageError);
}
```

The same pattern applies to the `removeFromCart` and `updateCartQuantity` updater paths. The in-memory `cart` state is **always** updated — the try/catch only protects the persistence call. No error is surfaced to the user; the cart keeps working for the current session.

Other `setItem` calls (settings, products, orders, wishlist, reviews, etc.) already have Supabase as the primary persistence layer and are guarded separately by the `!supabase` condition or by the existing `savePrintifyCatalogLocally` try/catch wrapper. Those are **not** changed.

### Change in `BespokeCustomizer.tsx`

In `generatePreviewDataUrl`, the final `canvas.toDataURL` call:

```ts
// Before:
resolve(canvas.toDataURL('image/png'));

// After:
resolve(canvas.toDataURL('image/jpeg', 0.60));
```

`image/jpeg` does not support transparency, but the canvas background is already filled with `#ffffff` (the `ctx.fillRect` call earlier in the function), so transparency is not required here. The JPEG output is visually indistinguishable for a product preview at this resolution.

The Fabric.js canvas intermediate export (`fCanvas.toDataURL({ format: 'png' })`) is **not** changed — this is an internal compositing step, not a persisted URL.

---

## Data Models

### Printify Print Area Array Item

```ts
interface PrintifyPrintAreaImage {
  id: string;       // Printify Media Library ID from upload response
  x: number;        // 0.5 = centered horizontally
  y: number;        // 0.5 = centered vertically
  scale: number;    // 1.0 = 100%
  angle: number;    // 0 = no rotation
}

interface PrintifyPrintAreaPlaceholder {
  position: string; // "front" | "back" | "left" | "right" | ...
  images: PrintifyPrintAreaImage[];
}

interface PrintifyPrintArea {
  variant_ids: number[];
  placeholders: PrintifyPrintAreaPlaceholder[];
}
```

### Artwork Upload Result

`uploadArtworkDataUrl` returns:
```ts
interface ArtworkUploadResult {
  id: string;         // Printify Media Library ID → used in print_areas[].placeholders[].images[].id
  previewUrl: string; // Public HTTPS URL → kept for display/validation only
}
```

### Enriched Variant Option Item

After Fix 3, each element of `variant.options` is:
```ts
interface EnrichedVariantOption {
  id: number;      // original option value ID (for traceability)
  name: string;    // option type: "colors" | "sizes" | ...
  title: string;   // human-readable: "Navy Blue" | "XL" | "#1F2E4D"
  hex?: string;    // hex code, present only for color-type options
}
```

### Color Option Detail (UI only)

Used by `activeColorOptionDetails` in `BespokeCustomizer.tsx`. Not persisted.
```ts
interface ColorOptionDetail {
  title: string;  // display name and selection key (matched against selectedColor)
  hex?: string;   // hex code if available; undefined → text pill fallback
}
```

---

## Correctness Properties

### Property 1: print_areas output is always a valid Printify array

For any `(position: non-empty string, mediaId: non-empty string, variantId: positive integer)`, the output of `buildPrintAreasForItem` when artwork upload succeeds SHALL satisfy:

```
Array.isArray(result)                               === true
result.length                                       >= 1
result[0].variant_ids[0]                            === variantId
result[0].placeholders[0].position                  === position
result[0].placeholders[0].images[0].id              === mediaId
result[0].placeholders[0].images[0].x               === 0.5
result[0].placeholders[0].images[0].y               === 0.5
result[0].placeholders[0].images[0].scale           === 1
result[0].placeholders[0].images[0].angle           === 0
```

**Validates: Requirements 2.1**

### Property 2: Template retail price equals baseCost multiplied by one plus margin over 100

For any `baseCost ∈ [0, 1000]` and `profitMarginPercent ∈ [0, 500]`:

```
calculateTemplateRetailPrice(baseCost) === parseFloat((baseCost * (1 + margin / 100)).toFixed(2))
```

where `margin` is the value read from `settings.printifySettings.charges.profitMarginPercent`.

**Validates: Requirements 2.2**

### Property 3: Variant option resolution always produces non-numeric titles

For any variant `v` with `options: [id1, id2, ...]` (all positive integers) and a covering `OptionValueMap`:

```
resolveVariantOptions(v, map).options.every(opt =>
  typeof opt.title === 'string' &&
  opt.title.trim() !== '' &&
  isNaN(Number(opt.title))   // title is not a bare integer string
)
```

And the `id` fields are preserved:
```
resolveVariantOptions(v, map).options[i].id === Number(v.options[i])
```

**Validates: Requirements 2.4**

---

## Glossary

| Term | Definition |
|------|-----------|
| **Blueprint** | A Printify catalog item representing a blank product type (e.g. "Unisex Jersey Tee"). Identified by a numeric `blueprintId`. |
| **Print Provider** | A Printify fulfillment partner that prints and ships a given blueprint. A blueprint may have multiple providers. |
| **Variant** | A specific combination of options (color × size) for a blueprint+provider pair. Carries a numeric `id` used in order line items. |
| **Option Value ID** | An integer used by Printify's variants endpoint to encode an option choice (e.g. `10` = "Navy Blue"). Must be resolved to a human-readable label via the blueprint detail endpoint. |
| **Media Library ID** | The string `id` returned by `POST /v1/uploads/images.json`. Required in `print_areas[].placeholders[].images[].id`; a raw URL is not accepted here. |
| **baseCost** | The Printify provider's wholesale cost for a template, stored in `PrintifyCatalogTemplate.baseCost` in cents converted to dollars during sync. |
| **profitMarginPercent** | The admin-configured markup percentage stored in `settings.printifySettings.charges.profitMarginPercent`. Applied as `baseCost × (1 + margin/100)`. |
| **Template Sync** | The admin operation in Dashboard → Printify Settings → Product Sync that fetches blueprints, providers, and variants from Printify and stores them in the local catalog. |
| **Enriched Variant** | A variant whose `options` array has been resolved from integer IDs to `{ id, name, title, hex? }` objects via the blueprint detail endpoint. |
| **Cart Storage Key** | `devsfolk_cart` — the localStorage key used to persist the customer's cart across page refreshes. |

---

## Error Handling

### Fix 1 — Media ID absent from upload response

If `uploadData.id` is falsy after a successful upload HTTP status, `uploadArtworkDataUrl` throws:
```
Printify artwork upload succeeded but did not return a usable media ID or preview URL.
```
This surfaces via `buildPrintAreasForItem` returning `null`, which causes a `missing[]` entry for the line item, and the order is rejected with a 422 before touching Printify's order endpoint.

### Fix 2 — Variant cost in unexpected unit

If `activePrintifyVariant.cost` is an unreasonably large integer (> 100,000, i.e. > $1,000 after /100), the component should still display it — this is a data correctness issue for the admin, not a crash scenario. No special guard is needed; the price will show as a large number, signalling a sync data problem.

### Fix 3 — Blueprint detail fetch fails during sync

The enrichment step is wrapped in its own try/catch (see code snippet above). If the fetch fails:
- A warning log entry is emitted.
- `enrichedVariants` falls back to the raw (unenriched) variants.
- The sync continues to the next template.
- `getVariantColor` will return empty strings for unenriched variants, so color swatches remain hidden for that specific template only.

### Fix 6 — localStorage quota exceeded

The try/catch in the cart `setItem` calls swallows the `QuotaExceededError` with a `console.warn`. The cart remains functional in-memory for the session. On the next page load it will be empty (because persistence failed). This is acceptable: the alternative (crashing the React tree on cart mutation) is far worse. No UI-level error is shown to the customer.

---

## Testing Strategy

### Property-Based Tests (Vitest + fast-check)

Use `fc.assert(fc.property(...))` with at least 100 runs per suite.

**Property 1** — `buildPrintAreasOutput` (extracted pure helper):
```ts
fc.assert(fc.property(
  fc.string({ minLength: 1 }),          // position
  fc.string({ minLength: 1 }),          // mediaId
  fc.integer({ min: 1 }),              // variantId
  (position, mediaId, variantId) => {
    const result = buildPrintAreasOutput(position, mediaId, variantId);
    return (
      Array.isArray(result) &&
      result[0].variant_ids[0] === variantId &&
      result[0].placeholders[0].position === position &&
      result[0].placeholders[0].images[0].id === mediaId
    );
  }
));
```

**Property 2** — `calculateTemplateRetailPrice`:
```ts
fc.assert(fc.property(
  fc.float({ min: 0, max: 200, noNaN: true }),
  fc.float({ min: 0, max: 500, noNaN: true }),
  (baseCost, margin) => {
    const result = calculateTemplateRetailPriceWithMargin(baseCost, margin);
    const expected = parseFloat((baseCost * (1 + margin / 100)).toFixed(2));
    return result === expected;
  }
));
```

**Property 3** — `resolveVariantOptions`:
```ts
fc.assert(fc.property(
  fc.array(fc.integer({ min: 1, max: 99999 }), { minLength: 1, maxLength: 6 }),
  (ids) => {
    const map = buildOptionValueMapFromIds(ids); // test helper: ids → { title: "Color_${id}", hex: undefined }
    const variant = { id: 1, title: 'Test', options: ids };
    const resolved = resolveVariantOptions(variant, map);
    return resolved.options.every((opt: any) =>
      typeof opt.title === 'string' &&
      opt.title.trim() !== '' &&
      isNaN(Number(opt.title)) &&
      typeof opt.id === 'number'
    );
  }
));
```

### Unit / Example Tests

- **Fix 2 — variant price update:** Call `activeBasePrice` logic with a mock variant having `cost: 1499` (cents). Assert the derived price is `calculateTemplateRetailPrice(14.99)`.
- **Fix 4 — swatch renders hex circles:** Render `BespokeCustomizer` with enriched variant data that includes a `hex: '#1F2E4D'` color option. Assert that a `<button>` with `style.backgroundColor === '#1F2E4D'` is in the DOM and no text-pill appears for that color.
- **Fix 4 — text fallback:** With a variant having a color option with `title: 'Navy Blue'` but no `hex`, assert a text-pill button with text `"NAVY BLUE"` is rendered.
- **Fix 5 — note removal:** Render `BespokeCustomizer`. Assert the string `"Orders automatically sync to Printify POD warehouses upon payment validation"` is absent from the DOM.
- **Fix 6 — JPEG export:** Spy on `HTMLCanvasElement.prototype.toDataURL`. Trigger `handleAddToCart`. Assert it was called with `'image/jpeg'` and `0.60` as arguments.

### Regression Guards

- **Bug 1 preservation:** Existing shop products (with a 24-char hex `product_id`) take the `existingProductId` path and never call `buildPrintAreasForItem`. Assert that path produces a line item with `product_id` and no `print_areas` key.
- **Bug 3 idempotency:** Running `resolveVariantOptions` twice on an already-enriched variant (where each option is already an object with `title`) returns the variant unchanged.

### Validation Command

```bash
npm run build
```

TypeScript compilation is the primary gate. The project uses Vite + tsc; a clean build with zero type errors confirms all interface contracts are satisfied.

---

## What NOT to Change

The following are explicitly out of scope and must not be modified:

| Scope | Reason |
|-------|--------|
| Mobile-specific Tailwind classes (`sm:`, `md:` breakpoint variants inside `BespokeCustomizer`, `PrintifySettings`, `ShopContext`) | Mobile layouts are locked per `AGENTS.md` |
| `StoreLayout.tsx`, `DashboardLayout.tsx` | Not involved in any of these bugs |
| Fabric.js canvas initialization, event handlers, layer manipulation | Not involved; any change risks breaking the customizer canvas |
| `api/printify/catalog.ts` | Already routes `mode: 'blueprint'` correctly — no change needed |
| `api/printify/orders.ts` `buildPrintAreasForItem` | Already correct — documented in Fix 1 for reference only |
| Existing Printify shop product fulfillment path (`isRealPrintifyProductId` → `existingProductId` branch in `buildLineItems`) | Requirements 3.2 — this path must remain untouched |
| `uploadArtworkDataUrl` function signature or return type | Already returns `{ id, previewUrl }` — no change needed |
| `getVariantOptionText`, `getVariantTitleParts`, `isSizeToken`, `getVariantSize` functions | These work correctly with enriched variant data |
| `generatePreviewDataUrl` canvas *compositing* logic | Only the final `toDataURL` format string changes (Fix 6); all draw calls, coordinates, and Fabric export are unchanged |
| Any non-Printify `localStorage.setItem` calls | Only CART_STORAGE_KEY writes are touched in Fix 6 |
