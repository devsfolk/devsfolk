-- ============================================================================
-- CLEANUP RAW PRINTIFY TEMPLATES FROM DATABASE
-- ============================================================================
-- This script removes obsolete raw/draft Printify templates that were synced
-- via the old automatic sync system (now removed in Step 1).
--
-- IMPORTANT: Run these queries in your Supabase SQL Editor
-- Execute them ONE BY ONE and review each output before proceeding.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: PREVIEW - Check what will be deleted from printify_catalog table
-- ----------------------------------------------------------------------------
-- This shows all raw templates that will be removed
-- Expected: Templates with sync_status = 'raw' and IDs starting with 'bp_'

SELECT 
    id,
    title,
    blueprint_id,
    sync_status,
    is_enabled,
    created_at
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false)
ORDER BY created_at DESC;

-- Expected result: List of raw/draft templates
-- Review this list carefully before proceeding to deletion


-- ----------------------------------------------------------------------------
-- STEP 2: PREVIEW - Check what will be deleted from products table
-- ----------------------------------------------------------------------------
-- This shows all template-based products that will be removed
-- Expected: Products with IDs starting with 'printify_template_'

SELECT 
    id,
    name,
    category_id,
    printify_catalog_id,
    printify_product_id,
    is_printify,
    created_at
FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%'
ORDER BY created_at DESC;

-- Expected result: List of template products in storefront
-- Review this list carefully before proceeding to deletion


-- ----------------------------------------------------------------------------
-- STEP 3: DELETE - Remove raw templates from printify_catalog
-- ----------------------------------------------------------------------------
-- ⚠️ WARNING: This will permanently delete raw template data
-- Only execute after reviewing STEP 1 results

DELETE FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

-- Expected result: DELETE X (where X = number of rows deleted)


-- ----------------------------------------------------------------------------
-- STEP 4: DELETE - Remove template products from products table
-- ----------------------------------------------------------------------------
-- ⚠️ WARNING: This will permanently delete template products from storefront
-- Only execute after reviewing STEP 2 results

DELETE FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';

-- Expected result: DELETE X (where X = number of rows deleted)


-- ----------------------------------------------------------------------------
-- STEP 5: VERIFICATION - Confirm cleanup is complete
-- ----------------------------------------------------------------------------
-- These queries should return 0 rows if cleanup was successful

-- Check printify_catalog
SELECT COUNT(*) as remaining_raw_templates
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

-- Check products
SELECT COUNT(*) as remaining_template_products
FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';

-- Expected result: Both counts should be 0


-- ----------------------------------------------------------------------------
-- NOTES
-- ----------------------------------------------------------------------------
-- 1. Published templates (sync_status = 'published') are NOT deleted
-- 2. Regular Printify shop products are NOT affected
-- 3. If you have legitimate published templates you want to keep, modify
--    the DELETE queries to exclude them
-- 4. This cleanup is safe to run multiple times (idempotent)
-- ============================================================================
