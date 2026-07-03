# Product Variant Images Investigation Note

## Current status

This issue is still unresolved, but the investigation has narrowed the failure point.

## Confirmed working

- The `products.variant_images` column exists in Supabase and contains real data for shop products.
- `ShopContext.tsx` maps the database field correctly:
  - `mapProductRow` reads `row.variant_images` into `variantImages`.
  - The `toProductRow` / `toLegacyProductRow` writers also include `variant_images`.
- `ProductPage.tsx` reads from the shared `products` array in `ShopContext`:
  - `const product = products.find(p => p.slug === slug);`

## Confirmed broken

- In the storefront runtime, `product.variantImages` still arrives as `{}` on `ProductPage.tsx`, even when the database row has real `variant_images` data.

## Theories ruled out

- Snake/camel mapping in `ShopContext` is not the issue.
- `ProductPage.tsx` is not reading from a separate selector or alternate product source.
- The localStorage cache rehydration path was a real risk and was hardened, but it did not explain the already-confirmed empty runtime object on the page.

## Current working hypothesis

- The storefront product object is still being replaced or rehydrated from stale product state somewhere between the DB load and the page render.
- The next maintainer should inspect any remaining product state rebuilds or cache sources before changing the database or page logic again.

