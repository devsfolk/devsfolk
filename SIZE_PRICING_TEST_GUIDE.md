# Size-Based Pricing - Testing Guide

## Build Status: ✓ PASSED
- TypeScript compilation: ✓ No errors
- Vite build: ✓ Completed successfully in 38.92s
- All files generated correctly

---

## What Was Fixed

### Before Fix
- Customer selects different sizes → price stays the same
- All sizes showed single flat price from `template.sellingPrice`
- Size-specific pricing in database was ignored

### After Fix
- Customer selects different sizes → price updates immediately
- Each size shows its own `sellingPrice` from `template.sizesPricing` array
- Price recalculates reactively when size changes

---

## Testing Steps

### Test 1: Basic Size Pricing
**Goal**: Verify size selection changes price

1. **Admin Setup** (Template Management):
   - Open a template that has multiple sizes (S, M, L, XL)
   - Go to Prices Tab
   - Set different selling prices for each size:
     ```
     Size S: $19.99
     Size M: $24.99
     Size L: $29.99
     Size XL: $34.99
     ```
   - Save template

2. **Customer Experience** (Storefront):
   - Navigate to the product
   - Open browser console (F12)
   - Default size should be selected (usually first size)
   - **Check**: Price displays correctly for default size
   - Click on Size M button
   - **Expected**: 
     - Price immediately updates to $24.99
     - Console shows: `[Price Calc] Using size-specific selling price: 24.99 for size: M`
   - Click on Size L button
   - **Expected**: 
     - Price immediately updates to $29.99
     - Console shows: `[Price Calc] Using size-specific selling price: 29.99 for size: L`
   - Click on Size XL button
   - **Expected**: 
     - Price immediately updates to $34.99
     - Console shows: `[Price Calc] Using size-specific selling price: 34.99 for size: XL`

3. **Verify Final Total**:
   - Select Size L ($29.99)
   - Add text customization (check customization fee, e.g., $5.00)
   - **Expected Final Price**: $29.99 + $5.00 = $34.99
   - Click "Add to Cart"
   - Open cart
   - **Expected**: Cart shows Size L with correct total

---

### Test 2: Backwards Compatibility
**Goal**: Verify old templates without size pricing still work

1. **Find old template** (one created before this fix):
   - Template that does NOT have `sizesPricing` array in database
   - Only has flat `sellingPrice` field

2. **Customer Experience**:
   - Open product in storefront
   - Select different sizes
   - **Expected**: 
     - Price stays the same (flat price behavior)
     - No console errors
     - Add to Cart still works

---

### Test 3: Edge Cases
**Goal**: Verify robust fallback logic

#### Case 3A: Size Not Found
1. Admin sets pricing for S, M, L only
2. Customer somehow selects XL (not in pricing array)
3. **Expected**: Falls back to flat `template.sellingPrice`

#### Case 3B: Base Cost $0.00
1. Admin sets size pricing with baseCost = 0
2. Customer selects that size
3. **Expected**: Shows $0.00, doesn't crash, system handles gracefully

#### Case 3C: No Sizes At All
1. Template has no sizes configured
2. Customer views product
3. **Expected**: Size selector doesn't show, price uses flat pricing

---

### Test 4: Cart Integration
**Goal**: Verify correct price flows to cart and checkout

1. **Add Multiple Items with Different Sizes**:
   - Add Size S ($19.99) to cart
   - Add Size L ($29.99) to cart (same product, different size)
   - Open cart
   - **Expected**: 
     - Two separate line items
     - Each with correct size-specific price
     - Cart total = $19.99 + $29.99 = $49.98 (+ customization fees if any)

2. **Proceed to Checkout**:
   - Go through checkout flow
   - **Expected**: 
     - Order summary shows correct per-size pricing
     - Final total matches cart total

---

## Console Logs to Look For

### Success Indicators
```
[Price Calc] Using size-specific base cost: 12.00 for size: M
[Price Calc] Using size-specific selling price: 24.99 for size: M
```

### Fallback Indicators (Not Errors)
If size pricing NOT found, no size-specific logs appear - this is normal for:
- Old templates without `sizesPricing` array
- Sizes not configured in pricing array

### Error Indicators (Should NOT See)
```
❌ TypeError: Cannot read property 'find' of undefined
❌ Uncaught Error: ...
❌ NaN price displayed
```

---

## Data Structure Reference

### Admin Saves (Supabase `templates` table):
```json
{
  "id": "template-123",
  "title": "Custom T-Shirt",
  "sizes": ["S", "M", "L", "XL"],  // Just names (legacy)
  "sizesPricing": [                // NEW: Pricing per size
    { "size": "S", "baseCost": 10.00, "sellingPrice": 19.99 },
    { "size": "M", "baseCost": 12.00, "sellingPrice": 24.99 },
    { "size": "L", "baseCost": 14.00, "sellingPrice": 29.99 },
    { "size": "XL", "baseCost": 16.00, "sellingPrice": 34.99 }
  ],
  "sellingPrice": 24.99  // Flat fallback if sizesPricing not used
}
```

### Customer Sees (Browser State):
```typescript
selectedSize = "L"
activeBaseCostDollars = 14.00      // From sizesPricing[2].baseCost
activeDisplayBasePrice = 29.99     // From sizesPricing[2].sellingPrice
customizationFee = 5.00            // From editorCharges
finalTotal = 34.99                 // 29.99 + 5.00
```

---

## Common Issues & Solutions

### Issue: Price Doesn't Change When Size Selected
**Debug Steps**:
1. Check browser console for `[Price Calc]` logs
2. If no logs → `sizesPricing` array might be missing from template
3. Verify in Admin → Template Management → Prices Tab → sizes should be listed with prices
4. Check Network tab → template data from API includes `sizesPricing` field

### Issue: Console Shows "undefined" for sizesPricing
**Cause**: Template saved before fix, doesn't have `sizesPricing` field yet
**Solution**: 
- Admin opens template in Template Management
- Go to Prices Tab
- Click "Fetch Prices from Printify" to regenerate size pricing
- Save template

### Issue: Wrong Price After Size Change
**Debug Steps**:
1. Check console for which price source is being used
2. Verify `selectedSize` state updates (use React DevTools)
3. Verify `sizesPricing` array has entry for selected size
4. Check if size name matches exactly (case-sensitive: "M" ≠ "m")

---

## Success Criteria ✓

All of these must work:

- [x] Build completes without errors
- [ ] Selecting different sizes updates price immediately (Test 1)
- [ ] Console logs show correct size-specific pricing (Test 1)
- [ ] Old templates without size pricing still work (Test 2)
- [ ] Cart stores correct size-specific price (Test 4)
- [ ] Checkout shows correct per-size pricing (Test 4)
- [ ] No console errors during any test
- [ ] Mobile layout unchanged (per AGENTS.md requirement)

---

## Mobile Testing Note

Per `AGENTS.md` rules:
> Mobile version of Dashboard and Storefront are locked. Do NOT modify mobile-specific styles.

**Verify**: Size pricing fix does NOT break mobile layout
- Test on mobile viewport (Chrome DevTools → Toggle Device Toolbar)
- Size selector buttons should still look correct
- Price should update on mobile too
- No layout shifts or overflow issues

---

## Next Steps After Testing

### If All Tests Pass ✓
1. Mark task as complete
2. Commit changes with message: "Fix: Size-based pricing in storefront editor"
3. Optional: Remove console.log statements in production (lines with `[Price Calc]`)

### If Issues Found ❌
1. Document exact reproduction steps
2. Check browser console for error messages
3. Verify data structure in Supabase matches expected format
4. Re-read SIZE_PRICING_FIX_COMPLETE.md for implementation details
