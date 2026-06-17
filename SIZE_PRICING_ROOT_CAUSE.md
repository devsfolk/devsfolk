# Size-Based Pricing Root Cause Analysis

## Current Problem
When customer selects different sizes (S, M, L, XL, etc.), the displayed price does NOT change. All sizes show the same price regardless of which size is selected.

---

## Root Cause Confirmed

### 1. Size Pricing Data Structure (PricesTab.tsx - lines 113-118)
Admin saves size-specific pricing in this structure:
```typescript
interface SizePrice {
  size: string;          // e.g., "S", "M", "L", "XL"
  baseCost: number;      // Admin's cost for this size
  sellingPrice: number;  // Price shown to customer for this size
}
```

Stored in `formData.sizes` array (lines 159-162):
```typescript
{
  size: 'M',
  baseCost: 12.50,
  sellingPrice: 24.99
}
```

### 2. Type Definition Missing Size Pricing (types.ts - lines 147-176)
`PrintifyCatalogTemplate` interface only has:
```typescript
sizes?: string[];  // ❌ Only size NAMES, not pricing objects
```

Does NOT have:
```typescript
sizesPricing?: SizePrice[];  // ❌ Missing entirely
```

### 3. Price Calculation Ignores Size Selection (BespokeCustomizer.tsx - lines 543-577)
Current `activeBaseCostDollars` logic:
```typescript
const activeBaseCostDollars = useMemo(() => {
  // ... tries activePrintifyVariant.cost
  // ... falls back to activeTemplate.baseCost (flat price)
  // ... falls back to activeProduct.price
  // ❌ NEVER reads template.sizesPricing array
  // ❌ NEVER uses selectedSize state
}, [activePrintifyVariant, activeProduct, activeTemplate, settings]);
```

**Missing from dependencies**: `selectedSize` state (line 330)

### 4. Size Selection Works But Doesn't Affect Price
- `selectedSize` state exists and is set correctly (line 330)
- Size buttons work and update state (line 1770)
- `selectedSize` is passed to cart (lines 1495, 1536)
- BUT price calculation completely ignores it

---

## What Needs to Happen

### Step 1: Update Type Definition
Add `sizesPricing` field to `PrintifyCatalogTemplate` interface in `src/types.ts`:
```typescript
export interface PrintifyCatalogTemplate {
  // ... existing fields
  sizes?: string[];  // Keep for backwards compatibility
  sizesPricing?: SizePrice[];  // NEW: Array of {size, baseCost, sellingPrice}
  // ... rest of fields
}
```

### Step 2: Update Price Calculation Logic
Modify `activeBaseCostDollars` and `activeDisplayBasePrice` in BespokeCustomizer.tsx:

**For activeBaseCostDollars** (line 543):
```typescript
const activeBaseCostDollars = useMemo(() => {
  // 1. First check if template has size-specific pricing
  if (selectedSize && activeTemplate?.sizesPricing) {
    const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
    if (sizePrice) {
      return sizePrice.baseCost;  // Use size-specific base cost
    }
  }
  
  // 2. Fall back to existing logic if no size pricing found
  // ... existing variant/template/product fallback logic
}, [activePrintifyVariant, activeProduct, activeTemplate, settings, selectedSize]);  // Add selectedSize dependency
```

**For activeDisplayBasePrice** (line 578):
```typescript
const activeDisplayBasePrice = useMemo(() => {
  // 1. First check if template has size-specific selling price
  if (selectedSize && activeTemplate?.sizesPricing) {
    const sizePrice = activeTemplate.sizesPricing.find(sp => sp.size === selectedSize);
    if (sizePrice) {
      return calculateTemplateRetailPrice(sizePrice.sellingPrice);  // Use size-specific selling price
    }
  }
  
  // 2. Fall back to existing logic
  const variantId = String(activePrintifyVariant?.id || ...);
  const manualVariantPrice = variantId ? activeTemplate?.variantSellingPrices?.[variantId] : undefined;
  return calculateTemplateRetailPrice(Number(manualVariantPrice ?? ...));
}, [activeBaseCostDollars, activePrintifyVariant, activeProduct, activeTemplate, settings, selectedSize]);  // Add selectedSize dependency
```

### Step 3: Verification Points
After fix, verify:
1. Price updates immediately when size changed
2. Correct size-specific price shown in product details
3. Correct price flows into final total: `sizePrice.sellingPrice + customization fee`
4. "Add to Cart" uses correct size-based price
5. Switching sizes recalculates price in real-time

---

## Files to Modify
1. `src/types.ts` - Add `sizesPricing` field to interface
2. `src/components/printify/BespokeCustomizer.tsx` - Update price calculation logic (lines 543-590)
