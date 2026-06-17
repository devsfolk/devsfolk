# Juliet's Digital Hub - Size-Based Pricing Setup

## ✅ Step 1: Run Database Schema

Go to Juliet's Digital Hub Supabase Dashboard → SQL Editor

### Option A: Fresh Database (No tables exist)
Run the entire file: **`JULIET_DIGITAL_HUB_SCHEMA.sql`**

### Option B: Existing Database (Tables already exist)
Run only the migration file: **`JULIET_DIGITAL_HUB_MIGRATION_ONLY.sql`**

This will add any missing columns needed for size-based pricing.

---

## ✅ Step 2: Verify Schema

After running the SQL, verify the `variants` column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'printify_catalog' 
AND column_name IN ('variants', 'print_areas', 'colors', 'sizes');
```

**Expected result:**
```
variants    | jsonb
print_areas | jsonb
colors      | jsonb
sizes       | jsonb
```

---

## ✅ Step 3: Configure Template Size Pricing

Now you need to add size pricing data for each template:

### Method A: Via Admin UI (Recommended)

1. Go to: **https://legacywear.store/admin/printify**
2. Find the template you want to configure (e.g., "Adult Staple Tee")
3. Click **"Edit"** button
4. Go to **"Prices"** tab
5. Enter size-specific pricing:
   ```
   S:    Base Cost: $10.00  |  Selling Price: $20.00
   M:    Base Cost: $11.00  |  Selling Price: $22.00
   L:    Base Cost: $12.00  |  Selling Price: $24.00
   XL:   Base Cost: $13.00  |  Selling Price: $26.00
   2XL:  Base Cost: $14.00  |  Selling Price: $28.00
   3XL:  Base Cost: $16.00  |  Selling Price: $32.00
   ```
6. Click **"Save"** or **"Publish"**

This will save the data to the `variants` column in the database.

### Method B: Via SQL (Manual)

If you prefer to insert data directly:

```sql
-- Example: Update bp_440 (Adult Staple Tee) with size pricing
UPDATE printify_catalog
SET variants = '[
  {"id": 1, "title": "S", "cost": 1000, "price": 2000},
  {"id": 2, "title": "M", "cost": 1100, "price": 2200},
  {"id": 3, "title": "L", "cost": 1200, "price": 2400},
  {"id": 4, "title": "XL", "cost": 1300, "price": 2600},
  {"id": 5, "title": "2XL", "cost": 1400, "price": 2800},
  {"id": 6, "title": "3XL", "cost": 1600, "price": 3200}
]'::jsonb,
sync_status = 'published',
is_enabled = true
WHERE id = 'bp_440';
```

**IMPORTANT**: Prices are stored in **CENTS**:
- `1000` = $10.00
- `2000` = $20.00
- `3200` = $32.00

---

## ✅ Step 4: Test Size-Based Pricing

1. Go to: **https://legacywear.store** (storefront)
2. Navigate to the custom product (e.g., Adult Staple Tee)
3. Click "Customize" or access the editor
4. Change the **Size** selector
5. **Verify**: Price should update in real-time

**Expected behavior:**
- S → $20.00
- M → $22.00
- L → $24.00
- XL → $26.00
- 2XL → $28.00
- 3XL → $32.00

---

## 🔍 Troubleshooting

### Issue: Prices still not changing

**Check 1: Verify data exists in database**
```sql
SELECT id, title, variants 
FROM printify_catalog 
WHERE id = 'bp_440';
```

Should return a row with `variants` array containing size pricing.

**Check 2: Verify template is enabled**
```sql
SELECT id, title, sync_status, is_enabled 
FROM printify_catalog 
WHERE id = 'bp_440';
```

Should show: `sync_status = 'published'` and `is_enabled = true`

**Check 3: Check browser console for errors**
- Open browser DevTools (F12)
- Go to Console tab
- Look for any errors when changing sizes

---

## 📋 How It Works

### Data Flow:
```
1. Admin saves pricing → printify_catalog.variants column (JSONB)
   [{"id": 1, "title": "S", "cost": 1000, "price": 2000}, ...]

2. Storefront loads template → ShopContext fetches from Supabase
   printifyCatalog state gets populated with variants array

3. Customer changes size → BespokeCustomizer.tsx
   getSizePricingFromVariants() extracts price for selected size

4. Price updates → Displayed in real-time
   Product selector + Price Breakdown both update
```

### Code References:
- **Size pricing extraction**: `src/components/printify/BespokeCustomizer.tsx` (line 244-266)
- **Template filtering**: `src/hooks/usePrintifyCatalog.ts` (line 10-42)
- **Data fetching**: `src/context/ShopContext.tsx` (mapPrintifyCatalogRow function)

---

## ✅ Summary

1. ✅ Run schema SQL (JULIET_DIGITAL_HUB_SCHEMA.sql or MIGRATION_ONLY.sql)
2. ✅ Verify `variants` column exists
3. ✅ Configure size pricing via admin UI or SQL
4. ✅ Test on storefront

**After these steps, size-based pricing will work exactly like it does on AuraBloom!**
