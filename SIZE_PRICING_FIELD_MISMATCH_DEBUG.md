# Size Pricing Field Mismatch - Deep Debug Investigation

## Issue
Admin sets different prices per size in Prices Tab → saves template → storefront still shows same price for all sizes.

---

## Investigation Results

### Step 1: What Admin Saves (TemplateEditor.tsx - handlePublish)

**Source**: Lines 331-382 in `src/components/printify/TemplateEditor.tsx`

**Admin form data structure** (useTemplateForm.ts):
```typescript
formData.sizes = [
  { size: 'S', baseCost: 10.00, sellingPrice: 19.99 },
  { size: 'M', baseCost: 12.00, sellingPrice: 24.99 },
  { size: 'L', baseCost: 14.00, sellingPrice: 29.99 }
]
```

**What gets saved to Supabase** (handlePublish lines 353-376):
```typescript
const templateData: PrintifyCatalogTemplate = {
  // ...
  sizes: formData.sizes.map(s => s.size),  // ["S", "M", "L"] - ONLY NAMES!
  
  variants: formData.sizes.map((s, idx) => ({
    id: idx + 1,
    title: s.size,
    cost: Math.round(s.baseCost * 100),      // 1000 cents = $10.00
    price: Math.round(s.sellingPrice * 100),  // 1999 cents = $19.99
    is_available: true,
    is_enabled: true,
  })),
  
  baseCost: Math.min(...formData.sizes.map(s => s.baseCost)),  // Minimum base cost
  sellingPrice: Math.min(...formData.sizes.map(s => s.sellingPrice)),  // Minimum selling price
  
  variantSellingPrices: formData.sizes.reduce((acc, s, idx) => ({
    ...acc,
    [idx + 1]: s.sellingPrice,  // { 1: 19.99, 2: 24.99, 3: 29.99 }
  }), {}),
  
  // ❌ NO sizesPricing field is saved!
};
```

**Actual Supabase structure saved**:
```json
{
  "id": "bp_123",
  "title": "Custom T-Shirt",
  "sizes": ["S", "M", "L"],
  "variants": [
    { "id": 1, "title": "S", "cost": 1000, "price": 1999 },
    { "id": 2, "title": "M", "cost": 1200, "price": 2499 },
    { "id": 3, "title": "L", "cost": 1400, "price": 2999 }
  ],
  "variantSellingPrices": {
    "1": 19.99,
    "2": 24.99,
    "3": 29.99
  },
  "baseCost": 10.00,
  "sellingPrice": 19.99
}
```

**KEY FINDING**: 
- ❌ No `sizesPricing` field is saved
- ✓ Size pricing data IS saved in `variants` array
- ✓ Selling prices also mapped by variant ID in `variantSellingPrices`

---

### Step 2: What Storefront Reads (BespokeCustomizer.tsx)

**Source**: Lines 545-599 in `src/components/printify/BespokeCustomizer.tsx`

**Current code tries to read**:
```typescript
if (selectedSize && activeTemplate?.sizesPricing) {
  const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
  // This will NEVER execute because sizesPricing doesn't exist!
}
```

**What ACTUALLY exists in activeTemplate**:
```typescript
activeTemplate = {
  sizes: ["S", "M", "L"],           // ✓ Exists (string array)
  variants: [...],                   // ✓ Exists (with cost/price per size)
  variantSellingPrices: {...},      // ✓ Exists (selling price by variant ID)
  sizesPricing: undefined            // ❌ Does NOT exist
}
```

---

## Root Cause Confirmed

### The Mismatch
1. **Admin saves**: Size pricing data into `variants` array (with `cost` and `price` in cents)
2. **Storefront reads**: Looking for non-existent `sizesPricing` field
3. **Result**: Price calculation never finds size-specific pricing, falls back to flat price

### Why This Happened
I added `sizesPricing` to the TypeScript interface but didn't check:
- Whether admin actually saves to this field (it doesn't)
- What field admin actually uses (it uses `variants` array)

---

## Solution Options

### Option A: Make Admin Save to sizesPricing ❌
**Changes required**:
- Modify `handlePublish` in TemplateEditor.tsx to add `sizesPricing` field
- Keep existing `variants` for backwards compatibility
- Duplicate data in database

**Pros**: Matches the interface I already created
**Cons**: 
- More code changes
- Data duplication
- Larger database rows
- Need to maintain consistency between `variants` and `sizesPricing`

### Option B: Make Storefront Read from variants ✓ (RECOMMENDED)
**Changes required**:
- Modify price calculation in BespokeCustomizer.tsx
- Map `variants` array to extract size-specific pricing
- Use existing data structure

**Pros**: 
- Minimal changes (only storefront)
- No database changes needed
- Works with existing saved templates immediately
- No data duplication
- Consistent with how admin already saves data

**Cons**: Slightly more complex mapping logic

---

## Recommended Fix: Option B

### Implementation Plan

1. **Create mapping function** to convert `variants` array to size pricing:
```typescript
const getSizePricingFromVariants = (template: PrintifyCatalogTemplate) => {
  if (!template?.variants || !Array.isArray(template.variants)) return [];
  
  return template.variants.map(variant => ({
    size: variant.title || String(variant.id),
    baseCost: variant.cost 
      ? (variant.cost < 100 && !Number.isInteger(variant.cost) 
          ? variant.cost 
          : variant.cost / 100)
      : 0,
    sellingPrice: variant.price
      ? (variant.price < 100 && !Number.isInteger(variant.price)
          ? variant.price
          : variant.price / 100)
      : 0,
  }));
};
```

2. **Update activeBaseCostDollars** to use this mapping:
```typescript
const activeBaseCostDollars = useMemo(() => {
  // Try to get size pricing from variants array
  const sizePricing = getSizePricingFromVariants(activeTemplate);
  
  if (selectedSize && sizePricing.length > 0) {
    const sizePrice = sizePricing.find(sp => sp.size === selectedSize);
    if (sizePrice && sizePrice.baseCost > 0) {
      console.log('[Price Calc] Using size-specific base cost:', sizePrice.baseCost, 'for size:', selectedSize);
      return sizePrice.baseCost;
    }
  }
  
  // ... existing fallback logic
}, [activeTemplate, selectedSize, ...]);
```

3. **Update activeDisplayBasePrice** similarly

---

## Next Steps

1. Add debug logging (already done in previous commit)
2. User tests in browser and confirms template structure
3. Implement Option B fix
4. Test with existing templates (should work immediately)
5. Remove debug logging

---

## Files to Modify

### Only Need to Change:
- `src/components/printify/BespokeCustomizer.tsx` - Add mapping function and update price calculations

### No Changes Needed:
- ✓ TemplateEditor.tsx - Already saves correctly to `variants`
- ✓ types.ts - Can keep `sizesPricing` for future use or remove it
- ✓ Supabase schema - No migration needed
