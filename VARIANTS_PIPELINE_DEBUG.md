# Variants Array Empty - Pipeline Debug Investigation

## Console Evidence
```
[Price Calc Debug] Size pricing extracted from variants: Array(0)
[Price Calc Debug] Selected size: XS
[Price Calc] ✓ Using fallback base cost: 0.2
```

**Confirms**: `template.variants` is an empty array `[]` on storefront, even though admin set prices and published.

---

## Code Investigation Results

### Step 1: What Admin Saves ✓
**File**: `src/components/printify/TemplateEditor.tsx` line 356-362

```typescript
variants: formData.sizes.map((s, idx) => ({
  id: idx + 1,
  title: s.size,
  cost: Math.round(s.baseCost * 100),
  price: Math.round(s.sellingPrice * 100),
  is_available: true,
  is_enabled: true,
}))
```

✓ Admin code DOES build variants array from formData.sizes  
✓ Converts dollars to cents correctly

### Step 2: Save to Supabase ✓
**File**: `src/context/ShopContext.tsx` line 1532

```typescript
const { error } = await supabase.from('printify_catalog').upsert(updated.map(toPrintifyCatalogRow));
```

**Function**: `toPrintifyCatalogRow` line 684
```typescript
variants: template.variants,
```

✓ Save function DOES include variants field  
✓ Maps directly from template.variants to row.variants

### Step 3: Fetch from Supabase ✓
**File**: `src/context/ShopContext.tsx` line 831

```typescript
supabase.from('printify_catalog').select('*').order('title', { ascending: true })
```

✓ Fetch uses `select('*')` - gets all columns including variants

**Function**: `mapPrintifyCatalogRow` line 525
```typescript
variants: row.variants || [],
```

✓ Mapping function DOES read variants field  
✓ Falls back to empty array if null

---

## Debugging Added

### 1. Save-Time Logging (TemplateEditor.tsx)
**Before upsertPrintifyCatalogTemplates:**
```typescript
console.log('=== TEMPLATE DATA BEING SAVED ===');
console.log('formData.sizes:', formData.sizes);
console.log('templateData.variants:', templateData.variants);
console.log('Full templateData:', JSON.stringify(templateData, null, 2));
```

**Expected Output When Publishing**:
```
formData.sizes: [
  { size: "XS", baseCost: 10, sellingPrice: 19.99 },
  { size: "S", baseCost: 12, sellingPrice: 24.99 },
  ...
]
templateData.variants: [
  { id: 1, title: "XS", cost: 1000, price: 1999, is_available: true, is_enabled: true },
  { id: 2, title: "S", cost: 1200, price: 2499, is_available: true, is_enabled: true },
  ...
]
```

### 2. Supabase Write Logging (ShopContext.tsx)
**Before .upsert() call:**
```typescript
console.log('=== SAVING TO SUPABASE ===');
console.log('Number of templates:', rowsToSave.length);
console.log('Sample row (first template):', JSON.stringify(rowsToSave[0], null, 2));
console.log('Variants field in first row:', rowsToSave[0]?.variants);
```

**Expected Output**:
```
Sample row: {
  "id": "bp_123",
  "title": "Custom T-Shirt",
  "variants": [
    { "id": 1, "title": "XS", "cost": 1000, "price": 1999 },
    ...
  ]
}
Variants field: [Array with data]
```

**If variants is NULL/UNDEFINED here → mapping bug before Supabase**

### 3. Supabase Read Logging (ShopContext.tsx)
**After fetch, before mapping:**
```typescript
console.log('=== FETCHED FROM SUPABASE ===');
console.log('First raw row:', JSON.stringify(printifyCatalogResult.data[0], null, 2));
console.log('variants field in first row:', printifyCatalogResult.data[0]?.variants);
```

**After mapping:**
```typescript
console.log('=== AFTER MAPPING ===');
console.log('First mapped template:', remoteCatalog[0]);
console.log('variants field after mapping:', remoteCatalog[0]?.variants);
```

**Expected If Working**:
- Raw row: `variants: [...]` (array with data)
- After mapping: `variants: [...]` (same data)

**If Raw Row Has NULL/Empty**:
- Supabase column is not storing the data
- Either:
  1. Column doesn't exist in schema
  2. Upsert is failing silently
  3. Supabase RLS policy blocking write

---

## Testing Instructions

### Step 1: Clear Everything and Start Fresh

1. Open Supabase → printify_catalog table → Delete all rows
2. Clear browser localStorage (Application tab → Clear Site Data)
3. Refresh page

### Step 2: Create and Publish Template with Logging

1. Open Template Management
2. Create new template
3. Go to Prices Tab
4. Set different prices for each size:
   - XS: base $10, selling $19.99
   - S: base $12, selling $24.99
   - M: base $14, selling $29.99
5. Open browser console (F12)
6. Click "Publish Template"

**Watch console for**:
```
=== TEMPLATE DATA BEING SAVED ===
formData.sizes: [...]  ← Should show your sizes with prices
templateData.variants: [...]  ← Should show converted variants

=== SAVING TO SUPABASE ===
Variants field in first row: [...]  ← Should show variants array
```

**Critical Check Points**:
- ❌ If `formData.sizes` is empty → Admin form not saving sizes
- ❌ If `templateData.variants` is empty → Mapping from sizes to variants failed
- ❌ If `Variants field in first row` is null → toPrintifyCatalogRow stripping it out

### Step 3: Verify Supabase Directly

1. Go to Supabase → printify_catalog table
2. Find your template row
3. Look at `variants` column
4. **Click the cell to expand JSON**

**Expected**:
```json
[
  {"id": 1, "title": "XS", "cost": 1000, "price": 1999, "is_available": true, "is_enabled": true},
  {"id": 2, "title": "S", "cost": 1200, "price": 2499, "is_available": true, "is_enabled": true}
]
```

**If it shows `null` or `[]`**:
- Data is NOT reaching Supabase
- Check Supabase logs for errors
- Check if `variants` column exists (type should be `jsonb`)

### Step 4: Test Fetch on Storefront

1. Refresh page (to trigger fetch)
2. Watch console for:

```
=== FETCHED FROM SUPABASE ===
variants field in first row: [...]  ← Should show array from Supabase

=== AFTER MAPPING ===
variants field after mapping: [...]  ← Should be same array
```

**Critical Check Points**:
- ❌ If raw row has null → Supabase column issue
- ❌ If raw row has data but after mapping is empty → mapPrintifyCatalogRow bug
- ❌ If after mapping has data but storefront shows empty → local state issue

### Step 5: Open Storefront Editor

1. Navigate to product
2. Console should show:
```
=== FULL TEMPLATE OBJECT ===
Has variants field? true
variants: [...]  ← Should have data here

[Price Calc Debug] Size pricing extracted from variants: [...]  ← Should NOT be Array(0)
```

---

## Likely Root Causes

### Possibility 1: Supabase Column Missing/Wrong Type
**Symptom**: Variants is null in Supabase table  
**Check**: Run this SQL in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'printify_catalog' 
AND column_name = 'variants';
```

**Expected**: Should return `variants | jsonb`  
**If empty**: Column doesn't exist → need migration

### Possibility 2: RLS Policy Blocking Write
**Symptom**: No error but data not saved  
**Check**: Supabase → Authentication → Policies → printify_catalog  
**Expected**: INSERT/UPDATE policy allows writes for authenticated users

### Possibility 3: formData.sizes Empty on Publish
**Symptom**: templateData.variants logs as `[]`  
**Cause**: Admin form not populating formData.sizes  
**Fix**: Check PricesTab component - sizes might be in different state

---

## Next Steps

1. **RUN THE TEST** with console open
2. **CAPTURE ALL CONSOLE OUTPUT** from publish flow
3. **CHECK SUPABASE TABLE** directly - show me screenshot of variants column
4. **REPORT FINDINGS**:
   - Does `formData.sizes` have data at publish time?
   - Does `templateData.variants` have data at publish time?
   - Does Supabase row have variants data?
   - Does fetch retrieve variants data?

Once we see exactly where variants data disappears, we can fix the actual issue.

---

## Status

✓ Debug logging added to entire pipeline  
✓ Save, upsert, fetch, and load all instrumented  
✓ Ready for real testing with console output
