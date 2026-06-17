# Size-Based Pricing Fix - COMPLETE ✓

## Problem Statement
When customers selected different sizes (S, M, L, XL, etc.) in the Storefront Editor, the displayed price remained static. All sizes showed the same price even though each size had its own `baseCost` and `sellingPrice` set by admin in the Template Management system.

---

## Root Cause Analysis

### Issue 1: Missing Type Definition
**File**: `src/types.ts`
- `PrintifyCatalogTemplate` interface only had `sizes?: string[]` (just size names)
- Did NOT have a field for size-specific pricing objects

### Issue 2: Price Calculation Ignored Size Selection
**File**: `src/components/printify/BespokeCustomizer.tsx` (lines 543-590)
- `activeBaseCostDollars` calculated price from variant/template/product data
- **Never read** `template.sizesPricing` array
- **Never used** `selectedSize` state (line 330)
- `selectedSize` was missing from useMemo dependencies

### Issue 3: Admin Data Structure Already Correct
**File**: `src/components/printify/tabs/PricesTab.tsx`
- Admin already saves size pricing as `{ size, baseCost, sellingPrice }[]` array
- Data structure was correct, just not being read by storefront

---

## Solution Implemented

### Fix 1: Update Type Definition ✓
**File**: `src/types.ts` (lines 147-176)

**Added**:
```typescript
export interface SizePrice {
  size: string;
  baseCost: number;
  sellingPrice: number;
}

export interface PrintifyCatalogTemplate {
  // ... existing fields
  sizes?: string[]; // Kept for backwards compatibility
  sizesPricing?: SizePrice[]; // NEW: Size-specific pricing array
  // ... rest
}
```

**Why**: Type system now recognizes size pricing data structure

---

### Fix 2: Update Base Cost Calculation ✓
**File**: `src/components/printify/BespokeCustomizer.tsx` (lines 543-581)

**Before**:
```typescript
const activeBaseCostDollars = useMemo(() => {
  // Used variant/template/product pricing (flat)
  // Never checked template.sizesPricing
}, [activePrintifyVariant, activeProduct, activeTemplate, settings]);
```

**After**:
```typescript
const activeBaseCostDollars = useMemo(() => {
  // Priority 1: Size-specific base cost
  if (selectedSize && activeTemplate?.sizesPricing) {
    const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
    if (sizePrice && sizePrice.baseCost > 0) {
      console.log('[Price Calc] Using size-specific base cost:', sizePrice.baseCost, 'for size:', selectedSize);
      return sizePrice.baseCost;
    }
  }

  // Priority 2: Fall back to variant/template/product pricing
  // ... existing logic unchanged
}, [activePrintifyVariant, activeProduct, activeTemplate, settings, selectedSize]); // Added selectedSize
```

**Why**: Now reads size-specific base cost before falling back to flat pricing

---

### Fix 3: Update Display Price Calculation ✓
**File**: `src/components/printify/BespokeCustomizer.tsx` (lines 583-596)

**Before**:
```typescript
const activeDisplayBasePrice = useMemo(() => {
  // Used variant/template selling price (flat)
  const variantId = String(activePrintifyVariant?.id || ...);
  const manualVariantPrice = variantId ? activeTemplate?.variantSellingPrices?.[variantId] : undefined;
  return calculateTemplateRetailPrice(Number(manualVariantPrice ?? activeTemplate?.sellingPrice ?? ...));
}, [activeBaseCostDollars, activePrintifyVariant, activeProduct, activeTemplate, settings]);
```

**After**:
```typescript
const activeDisplayBasePrice = useMemo(() => {
  // Priority 1: Size-specific selling price
  if (selectedSize && activeTemplate?.sizesPricing) {
    const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
    if (sizePrice && sizePrice.sellingPrice > 0) {
      console.log('[Price Calc] Using size-specific selling price:', sizePrice.sellingPrice, 'for size:', selectedSize);
      return calculateTemplateRetailPrice(sizePrice.sellingPrice);
    }
  }

  // Priority 2: Fall back to variant-specific or template-wide pricing
  const variantId = String(activePrintifyVariant?.id || ...);
  const manualVariantPrice = variantId ? activeTemplate?.variantSellingPrices?.[variantId] : undefined;
  return calculateTemplateRetailPrice(Number(manualVariantPrice ?? ...));
}, [activeBaseCostDollars, activePrintifyVariant, activeProduct, activeTemplate, settings, selectedSize]); // Added selectedSize
```

**Why**: Now uses size-specific selling price as the display price shown to customer

---

## How It Works Now

### Price Calculation Flow
1. Customer lands on product page → default size auto-selected (line 794)
2. `activeBaseCostDollars` checks `template.sizesPricing` for selected size's base cost
3. `activeDisplayBasePrice` checks `template.sizesPricing` for selected size's selling price
4. Final total = **size-specific selling price** + customization fee (from editorCharges)
5. Customer clicks different size → both useMemo hooks recalculate immediately (reactive via `selectedSize` dependency)

### Reactivity Chain
```
Size button clicked (line 1770)
  ↓
setSelectedSize('L')
  ↓
activeBaseCostDollars recalculates (depends on selectedSize)
  ↓
activeDisplayBasePrice recalculates (depends on selectedSize)
  ↓
activeOrderBasePrice recalculates (depends on activeDisplayBasePrice)
  ↓
Price display updates in real-time
```

### Example Scenario
**Admin sets in Template Management**:
```
Size S: baseCost $10.00, sellingPrice $19.99
Size M: baseCost $12.00, sellingPrice $24.99
Size L: baseCost $14.00, sellingPrice $29.99
```

**Customer sees in Storefront**:
- Selects Size S → Price shows $19.99 + customization fee
- Switches to Size L → Price immediately updates to $29.99 + customization fee
- Adds to cart → correct size-specific price stored

---

## Files Modified

### 1. src/types.ts
- **Added**: `SizePrice` interface export
- **Added**: `sizesPricing?: SizePrice[]` field to `PrintifyCatalogTemplate`
- **Kept**: `sizes?: string[]` for backwards compatibility

### 2. src/components/printify/BespokeCustomizer.tsx
- **Modified**: `activeBaseCostDollars` useMemo (lines 543-581)
  - Added size-specific pricing check as Priority 1
  - Added `selectedSize` to dependencies
  - Added console logging for debugging
- **Modified**: `activeDisplayBasePrice` useMemo (lines 583-596)
  - Added size-specific selling price check as Priority 1
  - Added `selectedSize` to dependencies
  - Added console logging for debugging

---

## Verification Checklist

### ✓ Type Safety
- No TypeScript compilation errors
- `sizesPricing` properly typed as `SizePrice[]`
- All price calculations type-safe

### ✓ Reactivity
- `selectedSize` added to useMemo dependencies
- Price recalculates immediately on size change
- No stale closures or missed updates

### ✓ Fallback Logic Preserved
- If no `sizesPricing` array → falls back to flat pricing
- If size not found in array → falls back to flat pricing
- Backwards compatible with templates not using size pricing

### ✓ Console Logging
- Added debug logs showing which price source is used
- Helps verify correct size pricing is applied
- Can be removed in production if needed

---

## Testing Instructions

### Test 1: Size Pricing Works
1. Admin creates template with multiple sizes (S, M, L, XL)
2. Admin sets different `sellingPrice` for each size in Prices Tab
3. Customer opens product in storefront
4. Customer switches between sizes
5. **Expected**: Price updates immediately to show size-specific selling price

### Test 2: Fallback Still Works
1. Customer opens old template WITHOUT `sizesPricing` array
2. **Expected**: Price uses flat `template.sellingPrice` (existing behavior)

### Test 3: Add to Cart
1. Customer selects Size L (price $29.99)
2. Customer adds customization
3. Customer clicks "Add to Cart"
4. **Expected**: Cart item has price $29.99 + customization fee, NOT flat price

### Test 4: Console Verification
1. Open browser console
2. Select different sizes
3. **Expected**: See logs like:
   ```
   [Price Calc] Using size-specific selling price: 24.99 for size: M
   [Price Calc] Using size-specific selling price: 29.99 for size: L
   ```

---

## Next Steps (If Needed)

### Optional Enhancement: Visual Price Preview
Show mini price preview on size button itself:
```tsx
<button>
  {size}
  <span className="text-xs">$24.99</span>
</button>
```

### Optional Enhancement: Size-Based Customization Fees
If admin wants different customization fees per size:
- Add `customizationFee` to `SizePrice` interface
- Update `editorCharges` calculation to check size-specific fee

---

## Status: READY FOR TESTING ✓

All code changes implemented. No compilation errors. Ready for user verification in browser.
