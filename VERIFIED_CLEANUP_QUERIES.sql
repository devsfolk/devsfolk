-- ============================================================================
-- VERIFIED CLEANUP QUERIES - Exact Column Names from Your Codebase
-- ============================================================================
-- These queries use the EXACT column names from your ShopContext.tsx
-- 
-- Tables:
-- 1. printify_catalog (columns: id, sync_status, is_enabled, title, blueprint_id, etc.)
-- 2. products (columns: id, name, printify_product_id, printify_catalog_id, etc.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: PREVIEW - printify_catalog table
-- ----------------------------------------------------------------------------
-- Shows raw templates that will be deleted
-- Confirmed columns: id, title, blueprint_id, sync_status, is_enabled

SELECT 
    id,
    title,
    blueprint_id,
    sync_status,
    is_enabled,
    last_synced
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false)
ORDER BY last_synced DESC;

-- Expected: List of raw/draft templates with IDs starting with 'bp_'


-- ----------------------------------------------------------------------------
-- STEP 2: PREVIEW - products table
-- ----------------------------------------------------------------------------
-- Shows template products that will be deleted from storefront
-- Confirmed columns: id, name, printify_product_id, printify_catalog_id

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

-- Expected: List of products with IDs like 'printify_template_bp_123'


-- ----------------------------------------------------------------------------
-- STEP 3: DELETE - Remove from printify_catalog
-- ----------------------------------------------------------------------------
-- ⚠️ DESTRUCTIVE - Review STEP 1 results first

DELETE FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

-- This will delete all raw/draft templates
-- Published templates (sync_status = 'published') are safe


-- ----------------------------------------------------------------------------
-- STEP 4: DELETE - Remove from products table
-- ----------------------------------------------------------------------------
-- ⚠️ DESTRUCTIVE - Review STEP 2 results first

DELETE FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';

-- This will remove template products from storefront
-- Regular Printify shop products (different ID pattern) are safe


-- ----------------------------------------------------------------------------
-- STEP 5: VERIFICATION
-- ----------------------------------------------------------------------------
-- Both should return 0 if cleanup is successful

SELECT COUNT(*) as remaining_raw_templates
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

SELECT COUNT(*) as remaining_template_products
FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';

-- Expected: Both = 0


-- ----------------------------------------------------------------------------
-- SAFETY CHECKS
-- ----------------------------------------------------------------------------
-- Run these to confirm what will be preserved:

-- Published templates that will be KEPT:
SELECT COUNT(*) as published_templates_kept
FROM printify_catalog
WHERE sync_status = 'published' AND is_enabled = true;

-- Regular Printify shop products that will be KEPT:
SELECT COUNT(*) as shop_products_kept
FROM products
WHERE is_printify = true 
  AND id NOT LIKE 'printify_template_%'
  AND (printify_product_id IS NULL OR printify_product_id NOT LIKE 'template_%');

-- ============================================================================
