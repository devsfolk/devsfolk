# activeTemplate Investigation - Minimal Debug Logging

## Issue
Size-based pricing still not working on "Adult Staple Tee (bp_440)" even though Supabase has correct variants data.

## Hypothesis
`activeTemplate` in BespokeCustomizer might not have the same structure as what we saw in Supabase. There could be:
1. A transformation step stripping variants
2. A filtering/mapping issue in `editorReadyTemplates`
3. The wrong template being selected

## Code Investigation Results

### Data Flow Traced ✓
```
Supabase → ShopContext (mapPrintifyCatalogRow) 
  → printifyCatalog state 
  → usePrintifyCatalog hook 
  → editorReadyTemplates (filtered by templateHasCheckoutMetadata)
  → BespokeCustomizer (getTemplateForProduct finds matching template)
  → activeTemplate
```

**Key Finding**: No transformation steps - only filtering. Template object should be intact.

### Functions Verified
1. **mapPrintifyCatalogRow** (ShopContext.tsx line 525): 
   - Maps `row.variants` to `template.variants`
   - No transformation, direct mapping

2. **usePrintifyCatalog** (line 27):
   - `editorReadyTemplates = printifyCatalog.filter(...)`
   - Only filters, doesn't transform

3. **getTemplateForProduct** (BespokeCustomizer.tsx line 114):
   - `editorReadyTemplates.find(...)`
   - Just finds, doesn't modify

**Conclusion**: activeTemplate should have variants field intact.

---

## Debug Logging Added

### 1. Template Structure on Load
**Location**: BespokeCustomizer.tsx after `activeTemplate` definition

**Logs**:
```typescript
console.log('[Template Debug] activeTemplate.id:', activeTemplate.id);
console.log('[Template Debug] activeTemplate.title:', activeTemplate.title);
console.log('[Template Debug] activeTemplate.variants:', activeTemplate.variants);
console.log('[Template Debug] Full activeTemplate keys:', Object.keys(activeTemplate));
```

**What to look for**:
- ✓ id should be "bp_440"
- ✓ title should be "Adult Staple Tee"
- ❓ variants should be array with data
- ❓ Object.keys should include 'variants'

**If variants is undefined or empty**:
- Template wasn't saved correctly (unlikely - we saw it in Supabase)
- Mapping is broken (unlikely - code looks correct)
- **Wrong template being loaded** (most likely - getTemplateForProduct might be matching wrong ID)

### 2. Price Calculation Debug
**Location**: Inside `activeBaseCostDollars` useMemo

**Logs**:
```typescript
console.log('[Price Debug] activeTemplate.variants:', activeTemplate?.variants);
console.log('[Price Debug] selectedSize:', selectedSize);
console.log('[Price Debug] getSizePricingFromVariants result:', sizePricing);
```

**What to look for**:
- **First log runs once on load**
- **All three logs run when size changes**
- `activeTemplate.variants` should match Template Debug log
- `selectedSize` should change when buttons clicked
- `getSizePricingFromVariants result` should be array of `{size, baseCost, sellingPrice}` objects

**Expected Output for Adult Staple Tee**:
```
[Template Debug] activeTemplate.id: bp_440
[Template Debug] activeTemplate.title: Adult Staple Tee
[Template Debug] activeTemplate.variants: [
  {id: 1, title: "XS", cost: 1000, price: 1999, is_available: true, is_enabled: true},
  {id: 2, title: "S", cost: 1200, price: 2499, ...},
  ...
]
[Template Debug] Full activeTemplate keys: ["id", "title", "variants", "printAreas", ...]

[Price Debug] activeTemplate.variants: [same array as above]
[Price Debug] selectedSize: "XS"
[Price Debug] getSizePricingFromVariants result: [
  {size: "XS", baseCost: 10, sellingPrice: 19.99},
  {size: "S", baseCost: 12, sellingPrice: 24.99},
  ...
]
```

**When size button clicked (e.g., Size M)**:
```
[Price Debug] activeTemplate.variants: [same array]
[Price Debug] selectedSize: "M"
[Price Debug] getSizePricingFromVariants result: [same array]
```

---

## Possible Issues and What Console Will Show

### Issue 1: Wrong Template Loaded
**Symptom**:
```
[Template Debug] activeTemplate.id: bp_145  ← OLD template, not bp_440!
[Template Debug] activeTemplate.variants: []  ← Empty because old template
```

**Cause**: `getTemplateForProduct` matching logic finding wrong template
**Fix**: Check product.printifyCatalogId and product.id to ensure they reference bp_440

### Issue 2: Variants Field Missing
**Symptom**:
```
[Template Debug] activeTemplate.variants: undefined
[Template Debug] Full activeTemplate keys: [...] ← 'variants' not in list
```

**Cause**: Mapping bug or field name mismatch
**Fix**: Check mapPrintifyCatalogRow in ShopContext

### Issue 3: Variants Empty Array
**Symptom**:
```
[Template Debug] activeTemplate.variants: []  ← Empty array
[Price Debug] getSizePricingFromVariants result: []  ← Also empty
```

**Cause**: Template doesn't have variants data (shouldn't happen for bp_440)
**Fix**: Re-publish template from admin

### Issue 4: selectedSize Not Updating
**Symptom**:
```
[Price Debug] selectedSize: "XS"  ← Never changes when clicking different sizes
```

**Cause**: Size button onClick not calling setSelectedSize
**Fix**: Check size button handlers (around line 1770)

### Issue 5: Correct Data, Wrong Mapping
**Symptom**:
```
[Template Debug] activeTemplate.variants: [{id: 1, title: "XS", cost: 1000, ...}]  ← Has data
[Price Debug] getSizePricingFromVariants result: []  ← Empty!
```

**Cause**: getSizePricingFromVariants logic bug (field name mismatch)
**Fix**: Check if variant has `title` field or if it's named something else

---

## Testing Instructions

1. **Clear browser cache/localStorage** to ensure fresh template data
2. **Navigate to "Adult Staple Tee"** product page
3. **Open browser console** (F12)
4. **Immediately look for** `[Template Debug]` logs
5. **Click different size buttons** (XS, S, M, L, XL)
6. **Watch for** `[Price Debug]` logs on each click
7. **Copy all console output** and share

---

## Expected vs Actual

### If Everything Works ✓
```
[Template Debug] activeTemplate.id: bp_440
[Template Debug] activeTemplate.variants: [Array with 7 items]
[Price Debug] selectedSize: "XS"
[Price Debug] getSizePricingFromVariants result: [Array with 7 items]

(Click Size M)
[Price Debug] selectedSize: "M"
[Price Debug] getSizePricingFromVariants result: [Array with 7 items]

→ Price updates on screen
```

### If Data Missing ❌
```
[Template Debug] activeTemplate.id: bp_440
[Template Debug] activeTemplate.variants: []  ← PROBLEM: Empty
[Price Debug] getSizePricingFromVariants result: []
```

### If Wrong Template ❌
```
[Template Debug] activeTemplate.id: bp_145  ← PROBLEM: Wrong ID
[Template Debug] activeTemplate.variants: []
```

### If Size Not Updating ❌
```
[Price Debug] selectedSize: "XS"
(Click Size M)
[Price Debug] selectedSize: "XS"  ← PROBLEM: Didn't change
```

---

## What to Share

Please capture and share:
1. **All `[Template Debug]` logs** (appears once on page load)
2. **All `[Price Debug]` logs** (appears on page load + each size click)
3. **What size buttons you clicked**
4. **Whether price changed on screen** (yes/no)

This will reveal exactly where the data is being lost or mismatched.
