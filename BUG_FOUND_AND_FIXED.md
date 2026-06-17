# Bug Found and Fixed - Size-Based Pricing

## Root Cause Identified ✓

**Console Evidence**:
```
[usePrintifyCatalog] bp_440 found, variants: (6) [...]   ← Data exists
[usePrintifyCatalog] editorReadyTemplates count: 0       ← FILTERED OUT!
[Price Debug] activeTemplate.id: undefined title: undefined
[Price Debug] FULL activeTemplate object: undefined
```

**The Bug**: `templateHasCheckoutMetadata()` was rejecting manually published templates because they don't have `providers` array populated.

---

## Why It Happened

### Original Filter Logic (BROKEN)
```typescript
const templateHasCheckoutMetadata = (template) => (
  !!template &&
  Array.isArray(template.providers) &&
  template.providers.length > 0 &&  // ❌ FAILS for manual templates
  Array.isArray(template.variants) &&
  template.variants.some((variant) => getSyncedVariantId(variant) > 0)  // ❌ FAILS for manual variants
);
```

### Problem 1: Requires `providers.length > 0`
- **Auto-synced templates** (from Printify API): Have providers array
- **Manually published templates** (from Template Management): Have `providers: []` (empty)
- **Result**: bp_440 rejected even though it has valid variants with pricing

### Problem 2: Requires Printify synced variant IDs
- **Auto-synced variants**: Have `printify_variant_id` from Printify API
- **Manually created variants**: Have `id: 1, 2, 3...` (simple integers from admin form)
- **Check**: `getSyncedVariantId(variant) > 0` works for both, so this wasn't the issue

### Problem 3: Empty `editorReadyTemplates` = undefined `activeTemplate`
```
bp_440 has variants → BUT filtered out by templateHasCheckoutMetadata()
  → editorReadyTemplates = []
  → getTemplateForProduct finds nothing
  → activeTemplate = undefined
  → Price calculation has no template data
  → Falls back to hardcoded default price
```

---

## The Fix

### Updated Filter Logic (FIXED)
```typescript
const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => {
  if (!template) return false;
  
  // Check 1: Manually published templates (from Template Management)
  // These have syncStatus='published' and variants with title/price, but no providers
  const isManuallyPublished = 
    template.syncStatus === 'published' &&
    Array.isArray(template.variants) &&
    template.variants.length > 0 &&
    template.variants.some((variant: any) => 
      variant?.title && 
      (variant?.price > 0 || variant?.cost > 0)
    );
  
  if (isManuallyPublished) {
    return true;  // ✓ Accept manually published templates
  }
  
  // Check 2: Auto-synced templates (from Printify API)
  // These have providers and synced variant IDs
  const isAutoSynced =
    Array.isArray(template.providers) &&
    template.providers.length > 0 &&
    Array.isArray(template.variants) &&
    template.variants.some((variant: any) => getSyncedVariantId(variant) > 0);
  
  return isAutoSynced;  // ✓ Still accept auto-synced templates
};
```

### What Changed
1. **Two separate checks** instead of requiring both conditions
2. **Check 1**: Manually published templates
   - Checks `syncStatus === 'published'`
   - Checks variants have `title` and `price > 0` or `cost > 0`
   - Does NOT require providers
3. **Check 2**: Auto-synced templates (original logic)
   - Still requires providers
   - Still requires synced variant IDs
4. **Either check passes** → template is accepted

### Why This Works
- **Manually published templates** (like bp_440): Pass Check 1, skip Check 2
- **Auto-synced templates**: Skip Check 1, pass Check 2
- **Both types** are now accepted into `editorReadyTemplates`

---

## Expected Results After Fix

### Console Output Should Show:
```
[templateHasCheckoutMetadata] Template bp_440 accepted as manually published
[usePrintifyCatalog] editorReadyTemplates count: 1  ← NOT 0 anymore!
[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants: (6) [...]
[Template Debug] activeTemplate.id: bp_440
[Template Debug] activeTemplate.title: Adult Staple Tee
[Template Debug] activeTemplate.variants: [Array with 6 items]
[Price Debug] activeTemplate.id: bp_440 title: Adult Staple Tee
[Price Debug] activeTemplate.variants: [Array with 6 items]
[Price Debug] getSizePricingFromVariants result: [Array with 6 items]
```

### On Storefront:
- ✓ `activeTemplate` is defined (not undefined)
- ✓ `activeTemplate.variants` has data
- ✓ `getSizePricingFromVariants()` extracts pricing
- ✓ Price updates when size changes
- ✓ Each size shows correct price from admin-set values

---

## Why activeTemplate Was Undefined Before

**Chain of failures**:
1. `templateHasCheckoutMetadata()` rejected bp_440
2. `editorReadyTemplates` = empty array
3. `getTemplateForProduct()` found nothing
4. `activeTemplate` = undefined
5. All price calculations failed
6. Fell back to hardcoded default

**Why user still saw a price**:
- Fallback logic in `activeBaseCostDollars` (line 630):
  ```typescript
  if (base === 0 && !activePrintifyVariant && !activeTemplate?.baseCost && !activeProduct?.price) {
    return Math.max(0, Number(charges?.templateBasePrice ?? 14.99));
  }
  ```
- This returned a flat `$14.99` or `$20` from settings
- **Masked the real bug** - user saw a price but it wasn't size-specific

---

## Files Modified

### src/hooks/usePrintifyCatalog.ts
- **Updated**: `templateHasCheckoutMetadata()` function (lines 9-40)
- **Added**: Two-path logic for manual vs auto-synced templates
- **Added**: Debug logging to show accept/reject decisions
- **Result**: Manually published templates now accepted

---

## Testing Verification

### Test 1: bp_440 Should Now Work
1. Navigate to "Adult Staple Tee"
2. Console should show:
   - `[templateHasCheckoutMetadata] Template bp_440 accepted as manually published`
   - `editorReadyTemplates count: 1` (or more)
   - `activeTemplate.id: bp_440`
   - `activeTemplate.variants: [...]` with data
3. Select different sizes
4. **Expected**: Price updates immediately

### Test 2: Old Auto-Synced Templates Still Work
1. If you have any Printify-synced products
2. They should still pass Check 2
3. No regression in existing functionality

---

## Build Status

✓ TypeScript compilation: No errors  
✓ Vite build: Completed in 44.43s  
✓ Filter logic updated correctly  
✓ Debug logging added

---

## Summary

**Bug**: Filter required `providers.length > 0`, which manually published templates don't have  
**Fix**: Accept templates with `syncStatus='published'` and valid variants  
**Result**: bp_440 now passes filter, activeTemplate is defined, size-based pricing should work

This was the missing piece! The data was correct all along - the filter was just too restrictive.
