# Database Cleanup Instructions

## Problem
Old raw templates from the automatic sync system are still appearing in the storefront editor. We need to clean them from the database.

## Solution
Execute the SQL cleanup script in your Supabase SQL Editor.

---

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Create a new query

### 2. Execute Preview Queries (READ ONLY)

**Copy and execute STEP 1:**
```sql
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
```

**Review the results:**
- These are the raw templates that will be deleted
- Check if any should be kept (unlikely, but verify)
- Note the count

**Copy and execute STEP 2:**
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

**Review the results:**
- These are the template products appearing in the storefront
- Check if any are legitimate products (they should all be raw templates)
- Note the count

### 3. Share Results With Me

**Before deletion, please share:**
```
STEP 1 Results: Found X raw templates in printify_catalog
STEP 2 Results: Found Y template products in products table
```

I'll confirm it's safe to proceed.

### 4. Execute Deletion Queries (DESTRUCTIVE)

⚠️ **ONLY proceed after my confirmation**

**Execute STEP 3:**
```sql
DELETE FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);
```

**Execute STEP 4:**
```sql
DELETE FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';
```

### 5. Verify Cleanup

**Execute STEP 5:**
```sql
SELECT COUNT(*) as remaining_raw_templates
FROM printify_catalog
WHERE sync_status = 'raw'
   OR (sync_status IS NULL AND is_enabled = false);

SELECT COUNT(*) as remaining_template_products
FROM products
WHERE id LIKE 'printify_template_%'
   OR printify_product_id LIKE 'template_%';
```

**Expected result:** Both counts should be 0

---

## What Gets Deleted

✅ **WILL BE DELETED:**
- Raw templates (sync_status = 'raw')
- Draft templates (is_enabled = false)
- Template products in storefront (id starts with 'printify_template_')

❌ **WILL NOT BE DELETED:**
- Published templates (sync_status = 'published')
- Regular Printify shop products
- Customer orders
- Any other data

---

## Safety Notes

1. ✅ The script only targets raw/draft templates
2. ✅ Published templates are preserved
3. ✅ Regular shop products are unaffected
4. ✅ You can run this multiple times safely
5. ⚠️ Always review preview queries before deletion

---

## Alternative: Use Supabase Table Editor

If you prefer a visual approach:

### For printify_catalog table:
1. Go to **Table Editor** → `printify_catalog`
2. Add filter: `sync_status` equals `raw`
3. Select all rows
4. Click **Delete** button

### For products table:
1. Go to **Table Editor** → `products`
2. Add filter: `id` starts with `printify_template_`
3. Select all rows
4. Click **Delete** button

---

## Files
- `CLEANUP_RAW_TEMPLATES.sql` - Full SQL script with all steps

## Next Steps
After cleanup is confirmed:
1. Test the storefront editor (should no longer show raw templates)
2. Verify Shop Product Sync still works
3. Proceed to Step 2 (Manual Template Management)

---

**Ready for cleanup!** Please execute the preview queries and share the counts before deletion.
