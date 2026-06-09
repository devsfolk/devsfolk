# Project Progress Handoff

Last updated: 2026-06-09  
Active working branch: `feat/printify-editor`  
Preview branch also updated: `feat/printify-mini-platform`  
Preview URL: `https://aurabloom-git-feat-printify-mini-platform-devsfolks-projects.vercel.app`

## How To Use This File

- Read this file before continuing Printify/editor work.
- Add a new entry under **Recent Updates** whenever a task is completed.
- Keep entries short but specific: branch, commit, files changed, validation, current issue, and next step.
- Do not remove older entries unless they are duplicated elsewhere.

## Current Feature Goal

Build a Printify-powered mini POD platform inside the admin's own storefront:

- Admin connects Printify with a Full Access PAT.
- Admin can sync Printify templates/blueprints and existing shop products.
- Storefront shows existing Printify shop products in product listings.
- Storefront editor lets customers choose raw Printify templates, customize them, add to cart, checkout, and queue fulfillment.
- Backend bridge safely validates and eventually submits eligible orders to Printify.

## Safety Notes

- Mobile Dashboard and Storefront layouts are locked by `AGENTS.md`; do not alter mobile-specific layout/responsive logic without explicit permission.
- Work is happening on feature branches, not `main`.
- Supabase quota must be protected: avoid storing huge API payloads, large images, or unnecessary local/database writes.
- Current implementation uses fallback storage patterns because deployed Supabase schemas may not yet include all newer Printify columns/tables.

## Completed Printify Work So Far

### Printify Admin Settings

- Added/expanded `Dashboard -> Printify` settings with tabs for APIs, Editor, Preview, Product Sync, Orders, and Webhooks.
- PAT validation supports direct `/shops` validation and normalizes `Bearer ...` tokens.
- Shop ID is auto-detected after successful PAT validation.
- Webhook URL is generated and displayed in dashboard.
- Printify credentials support fallback storage when `printify_credentials` table is missing.

### Template And Product Sync

- Existing Printify shop products sync into storefront product listings.
- Raw Printify templates/blueprints sync for editor use.
- Template search and sync limit controls were added.
- Editor search filters templates by name/description/template ID.
- Admin-created Printify shop products were removed from the editor list; they remain normal storefront products.
- Template pricing displays an estimated customer price using dashboard markup settings.
- Template Sync now attempts to fetch provider and variant metadata for selected templates.
- Printify catalog local cache was compacted to avoid browser `localStorage` quota crashes.

### Storefront Editor

- Editor appears on the storefront when Printify/customizer is active.
- Customers can select templates, add text/images, and add customized products to cart.
- Fixed silent Add to Cart failures caused by external Printify image/canvas preview issues.
- If preview generation fails, cart flow still continues safely.
- Editor now blocks checkout for selected templates that still lack variant metadata, instead of hiding the entire editor.

### Checkout And Orders

- Cart/order items preserve Printify metadata:
  - `printifyBlueprintId`
  - `printifyPrintProviderId`
  - `printifyVariantId`
  - `printifyPrintAreas`
- Checkout collects structured shipping fields:
  - country
  - region/state
  - city
  - ZIP/postal code
- Structured shipping metadata persists through fallback JSON storage.
- Customized/Printify orders appear in:
  - Dashboard overview
  - Main Orders section
  - Printify Orders section
- Printify Orders fallback infers queued status when DB columns are missing.
- Failed Printify sync status now persists through legacy `items` JSON fallback if DB columns are unavailable.

### Backend Fulfillment Bridge

- Added backend route: `api/printify/orders.ts`.
- Added client helper: `submitPrintifyOrder` in `src/lib/printifyApi.ts`.
- Dashboard `Push / Retry` now calls the backend route instead of showing a fake alert.
- Bridge validates order data before contacting Printify and returns missing metadata instead of submitting malformed orders.
- Retry errors are now shown clearly in the dashboard alert and row tooltip.

## Recent Updates

### 2026-06-10 - Persist Fallback Template Variant IDs

- Commit: `e2d4e16`
- Files:
  - `src/context/ShopContext.tsx`
  - `src/components/printify/BespokeCustomizer.tsx`
  - `PROGRESS.md`
- What changed:
  - Template fallback products now store lightweight Printify variant IDs in `product.variants`.
  - Editor uses synced catalog variants first, then falls back to the selected product's stored variants.
- Reason:
  - Template Sync reported variants ready, but Add to Cart still showed the missing variant metadata alert because fallback products did not retain variant IDs.
- Current issue / next step:
  - After deploy, run Template Sync again for `hoodie` so fallback products are republished with variant IDs, then retry Add to Cart.

### 2026-06-09 - Editor Variant Metadata Matching Fix

- Commit: `daade05`
- Files:
  - `src/components/printify/BespokeCustomizer.tsx`
- What changed:
  - Storefront editor now matches selected fallback template products to synced catalog templates using multiple identifiers:
    - `printifyCatalogId`
    - `printifyProductId`
    - generated `printify_template_*` product IDs
    - `bp_*` template IDs
  - Variant ID extraction now checks direct and nested Printify response shapes.
- Reason:
  - Template Sync reported `54 templates have variant metadata ready for checkout`, but Add to Cart still showed the missing variant metadata alert.
- Current issue / next step:
  - After deploy, refresh storefront and retry hoodie Add to Cart without re-syncing unless the editor still uses stale cache.

### 2026-06-09 - Compact Printify Catalog Cache

- Commit: `8d51e6f`
- Files:
  - `src/context/ShopContext.tsx`
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - Added compact local Printify catalog cache.
  - Trimmed descriptions/images/providers/variants/print areas for browser storage.
  - Made localStorage quota errors non-fatal.
  - Improved quota-specific sync tip.
- Validation:
  - `npm run build` passed.
  - Existing bundle-size warning remains.
- Reason:
  - Hoodie template sync failed with:
    - `Setting the value of 'devsfolk_printify_catalog' exceeded the quota.`

### 2026-06-09 - Variant Sync Parser

- Commit: `ed12017`
- Files:
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - Added flexible Printify list normalization for nested variant API response shapes.
  - Added sync log:
    - `[SUCCESS] X templates have variant metadata ready for checkout.`
- Validation:
  - `npm run build` passed.
- Current test needed:
  - Run Template Sync with `hoodie`.
  - Confirm the `X` value in the new sync log.

### 2026-06-09 - Keep Editor Visible

- Commit: `c4320ff`
- Files:
  - `src/components/printify/BespokeCustomizer.tsx`
- What changed:
  - Reverted over-strict filtering that hid the entire editor when variants were missing.
  - Added Add to Cart guard for templates missing variant metadata.
- Validation:
  - `npm run build` passed.

### 2026-06-09 - Require Editor Template Variants

- Commit: `c34f27d`
- Files:
  - `src/components/printify/BespokeCustomizer.tsx`
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - Template Sync fetches variants for all selected synced templates instead of only first 24.
  - Variant ID extraction is more tolerant.
- Later adjustment:
  - Full hiding of templates without variants was changed in `c4320ff` because it hid the editor.

### 2026-06-09 - Persist Shipping And Sync Template Variants

- Commit: `e02447d`
- Files:
  - `src/context/ShopContext.tsx`
  - `src/lib/printifyApi.ts`
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - Structured shipping address persists through legacy JSON fallback.
  - Added `fetchPrintifyBlueprintVariants`.
  - Template Sync attempts to store variant metadata.
- Validation:
  - `npm run build` passed.

### 2026-06-09 - Show Printify Retry Errors

- Commit: `74df113`
- Files:
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - `Push / Retry` now alerts the full missing-fields message.
  - Failed row has full error text in tooltip.

### 2026-06-09 - Persist Legacy Printify Order Status

- Commit: `02ecb7e`
- Files:
  - `src/context/ShopContext.tsx`
- What changed:
  - If Printify order columns are missing in Supabase, sync status/error persists inside `items` JSON.
  - Prevents `FAILED` from reverting to inferred `PENDING`.

### 2026-06-09 - Infer Printify Order Queue Status

- Commit: `f6bea10`
- Files:
  - `src/context/ShopContext.tsx`
- What changed:
  - Orders with customized/Printify items appear in Printify Orders even if DB sync columns are missing.

### 2026-06-08/09 - Add To Cart And Fulfillment Metadata

- Commits:
  - `5698e58` - capture Printify fulfillment metadata
  - `007f68b` - prevent editor cart preview failures
- Files:
  - `src/components/printify/BespokeCustomizer.tsx`
  - `src/context/ShopContext.tsx`
  - `src/pages/storefront/CheckoutPage.tsx`
  - `src/types.ts`
  - `api/printify/orders.ts`
- What changed:
  - Editor cart flow works after preview/CORS failure fix.
  - Structured checkout fields added.
  - Printify metadata is stored on cart/order items.

### 2026-06-08 - Printify Order Bridge

- Commit: `6c9a591`
- Files:
  - `api/printify/orders.ts`
  - `src/lib/printifyApi.ts`
  - `src/context/ShopContext.tsx`
  - `src/pages/dashboard/PrintifySettings.tsx`
- What changed:
  - Added backend order bridge.
  - Added safe validation before Printify submission.
  - Dashboard retry now calls real backend route.
- Validation:
  - `npm run lint` passed at that time.
  - `npm run build` passed.

## Current Known Issue

Template Sync for `hoodie` previously failed due to browser localStorage quota. This was fixed in commit `8d51e6f`, but still needs user retesting after Vercel rebuild.

Expected next check:

1. Go to `Dashboard -> Printify`.
2. Search `hoodie` in Template Sync.
3. Run Template Sync.
4. Look for:
   - `[SUCCESS] X templates have variant metadata ready for checkout.`
5. Report the value of `X`.

If `X > 0`, test:

1. Open storefront editor.
2. Select a hoodie template.
3. Add text.
4. Click `Add Customized to Cart`.
5. Checkout.
6. Go to `Dashboard -> Printify -> Orders`.
7. Click `Push / Retry`.

If it still fails, copy the full alert text.

## Likely Next Implementation Work

If variant metadata starts working, the next expected blocker is likely Printify print-area/artwork payload:

- Upload or persist final artwork/preview in a Printify-compatible way.
- Build valid `print_areas` payload for Printify order submission.
- Map customer design/text/image positions into Printify placement format.
- Possibly integrate Printify Uploads API or a storage-backed image URL flow.
- Improve variant/provider selection UI instead of using first provider/first variant automatically.

## Important Files For Next Agent

- `src/pages/dashboard/PrintifySettings.tsx`
  - Printify PAT validation, shop/product/template sync, retry button, logs.
- `src/components/printify/BespokeCustomizer.tsx`
  - Storefront editor, template selection, Add to Cart, metadata capture.
- `src/context/ShopContext.tsx`
  - Store settings, Printify catalog storage, product/order/cart persistence, Supabase fallbacks.
- `src/lib/printifyApi.ts`
  - Client helpers for Printify gateway calls.
- `api/printify/catalog.ts`
  - Server-side Printify catalog gateway.
- `api/printify/orders.ts`
  - Server-side Printify order bridge and missing metadata validation.
- `src/types.ts`
  - Printify, product, order, customization type definitions.

## Validation Commands

Preferred validation:

```bash
npm run build
```

TypeScript/lint command:

```bash
npm run lint
```

Note: `npm run lint`/`npx tsc` has occasionally hung or hit sandbox/user-profile permission issues in this environment. `npm run build` has been the reliable validation signal during the recent work.

## Future Update Template

Use this format when adding a new completed task:

```md
### YYYY-MM-DD - Short Task Name

- Commit: `abc1234`
- Files:
  - `path/to/file.ts`
- What changed:
  - Concise bullet.
- Validation:
  - `npm run build` passed.
- Current issue / next step:
  - What the next agent or user should test next.
```
