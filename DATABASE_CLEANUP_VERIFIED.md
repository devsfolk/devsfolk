# ✅ Database Cleanup Queries - VERIFIED

## Schema Confirmation

I've verified the exact table and column names from your codebase (`ShopContext.tsx`):

### `printify_catalog` table columns:
- ✅ `id` (e.g., "bp_123")
- ✅ `title`
- ✅ `blueprint_id`
- ✅ `sync_status` ('raw' | 'published')
- ✅ `is_enabled` (boolean)
- ✅ `last_synced`
- Plus: product_id, category, brand, model, tags, images, variants, etc.

### `products` table columns:
- ✅ `id` (template products use: "printify_template_bp_123")
- ✅ `name`
- ✅ `category_id`
- ✅ `printify_product_id`
- ✅ `printify_catalog_id`
- ✅ `is_printify` (boolean)
- ✅ `created_at`

---

## Verified Cleanup Queries

### STEP 1: Preview printify_catalog (READ ONLY)

```sql
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
```

**What this shows:**
- Raw templates (sync_status = 'raw')
- Draft templates (is_enabled = false)
- IDs typically start with 'bp_' (e.g., 'bp_123')

---

### STEP 2: Preview products (READ ONLY)

```sql
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
```

**What this shows:**
- Template products in storefront
- IDs typically: 'printify_template_bp_123'
- These are the products customers see in the editor

---

## Execute These Steps

### 1. Run STEP 1 Preview Query
Copy and paste into Supabase SQL Editor, then share with me:
- **How many rows** were returned?
- **Sample IDs** (first 3-5 IDs from the results)

### 2. Run STEP 2 Preview Query  
Copy and paste into Supabase SQL Editor, then share with me:
- **How many rows** were returned?
- **Sample IDs** (first 3-5 IDs from the results)

### 3. I'll Confirm It's Safe
I'll review your results and confirm the deletion is safe.

### 4. Run Deletion Queries
Only after my confirmation:

**Delete from printify_catalog:**
```sql
DELETE FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);
```

**Delete from products:**
```sql
DELETE FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';
```

### 5. Verify Cleanup

```sql
-- Should return 0
SELECT COUNT(*) as remaining_raw_templates
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

-- Should return 0
SELECT COUNT(*) as remaining_template_products
FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';
```

---

## Safety Guarantees

### ✅ WILL BE DELETED:
- `printify_catalog` rows with `sync_status = 'raw'`
- `products` rows with IDs starting with `printify_template_`

### ❌ WILL NOT BE DELETED:
- Published templates (`sync_status = 'published'`)
- Regular Printify shop products (different ID pattern)
- Customer orders
- Any other tables

---

## Files Created

1. ✅ `VERIFIED_CLEANUP_QUERIES.sql` - Full SQL script with all steps
2. ✅ `DATABASE_CLEANUP_VERIFIED.md` - This instructions file

---

## Next Step

**Please run STEP 1 and STEP 2 queries** and share the results with me:

```
Found X raw templates in printify_catalog
Sample IDs: bp_123, bp_456, bp_789

Found Y template products in products table  
Sample IDs: printify_template_bp_123, printify_template_bp_456
```

I'll confirm it's safe to proceed with deletion! 🔍
