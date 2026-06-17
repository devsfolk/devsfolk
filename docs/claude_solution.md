Printify Integration Bug Report — DevsFolk Platform
Project Context
This is a multi-tenant Shopify-style platform where one Git repo (hosted on Vercel) powers all client stores, with Supabase as the shared database. One client needs a Print-on-Demand storefront connected to Printify. The storefront has a custom product customizer (BespokeCustomizer.tsx) where customers pick a template, choose size/color, add their design, and order.

The Single Root Cause
The sync pipeline writes to two tables — printify_catalog and products — but the normal sync path only updates printify_catalog and skips the products table. The fallback path updates both, but the normal path doesn't.
The storefront loads product data from the products table. Since that table never gets properly updated, it holds stale records with price = 0. Everything else breaks as a chain reaction from this.

Chain of Issues
Issue 1 — All templates show $20.99

products table has price = 0 for Printify templates
BespokeCustomizer.tsx sees price = 0 and falls back to charges.templateBasePrice (hardcoded $14.99)
Applies a 40% display markup → $14.99 × 1.40 = $20.99 for every single template regardless of type
Fix: make the normal path in upsertPrintifyCatalogTemplates (ShopContext.tsx) always write the correct computed price to the products table

Issue 2 — Price doesn't change when size is selected

Printify variant payloads return options as raw integers e.g. [78, 12]
During sync, fetchPrintifyBlueprintDetail is called to resolve those integers to human-readable objects like { name: "Size", title: "XL" } — but if this call fails or is skipped, the raw integers are stored as-is
In the customizer, getVariantSize and activePrintifyVariant cannot parse raw integers, so size matching fails and it falls back to the first variant every time — static price
Fix: make blueprint detail enrichment mandatory during sync in PrintifySettings.tsx, and add a fallback parser in the customizer for resilience

Issue 3 — Color selection doesn't swap the product image

Synced blueprint images are stored as a flat array with no color-to-image mapping
The customizer preview image is hardcoded to activeProduct.images[0]
No logic exists to match the selected color name (e.g. "Forest Green") against image URLs (which typically contain color strings in their filenames)
Fix: implement a fuzzy token matcher that finds the best matching image URL when a color is selected

Issue 4 — Print areas are identical across all templates (independent issue)

Printify provides precise print area dimensions per blueprint in the print_areas object (pixel sizes, placeholder positions, aspect ratios)
This data is not parsed or stored during sync
The customizer uses a hardcoded local helper getPrintAreaStyle that maps keyword strings like "mug" or "poster" to static percentage values
This is unrelated to the stale products table — it needs to be fixed separately by parsing and storing print_areas during sync and passing it to the customizer canvas calculator
Fix: store print_areas from Printify into printify_catalog.print_areas during sync, then read it in BespokeCustomizer.tsx instead of the hardcoded helper


Files Involved
FileWhat needs to changeShopContext.tsxupsertPrintifyCatalogTemplates — normal path must write to products table with correct pricePrintifySettings.tsxSync loop — blueprint detail fetch must be mandatory, enriched variants storedBespokeCustomizer.tsxPrice fallback guard, getVariantSize parser, image color matcher, print area reader

Database Tables

printify_catalog — blueprint data, variants, providers, print areas (source of truth from Printify)
products — what the storefront actually reads; currently has stale $0 Printify records
orders — checkout orders with Printify fulfillment tracking fields


Summary for Gemini
Issues 1, 2, and 3 will all resolve once the sync pipeline correctly writes enriched data to the products table on the normal path. Issue 4 is a separate problem requiring print_areas to be parsed during sync and consumed by the customizer frontend. The codebase needs the actual files reviewed to pinpoint exact line-level changes.