# Base Cost Debugging Instructions

## Issue
Synced templates are showing a base cost of $0.00 instead of the actual cost from Printify.

## Changes Made
I've added comprehensive debug logging to trace the complete data flow from Printify API → Database → Admin UI.

## Testing Steps

### 1. Open your Vercel deployment
**URL:** https://aurabloom-999q5lrzp-devsfolks-projects.vercel.app/dashboard/printify

### 2. Open Browser Console
- Press `F12` or Right-click → Inspect
- Go to the **Console** tab
- Clear any existing logs

### 3. Run Template Sync
- Navigate to Dashboard → Printify → Raw Synced Templates tab
- Search for any template (e.g., "hoodie" or "t-shirt")
- Click "Sync Templates"
- **Watch the console logs carefully**

### 4. What to Look For

The debug logs will show you exactly where the data is coming from and where it's being lost:

#### Log 1: Raw Variant from Printify API
```
[SYNC DEBUG] Raw variant sample: {
  id: 12345,
  title: "Black / M",
  cost: 1499,          ← LOOK HERE: Is this present? What value?
  price: 1499,         ← LOOK HERE: Or is price field used instead?
  allKeys: [...all fields returned by Printify]
}
```

#### Log 2: After Enrichment (Color/Size Labels Added)
```
[SYNC DEBUG] Enriched variant sample: {
  id: 12345,
  title: "Black / M",
  cost: 1499,          ← LOOK HERE: Is cost still present after enrichment?
  price: 1499
}
```

#### Log 3: After Merging with Shop Product Data
```
[SYNC DEBUG] Merged variant sample: {
  id: 12345,
  title: "Black / M",
  cost: 1499,          ← LOOK HERE: Is cost still present after merge?
  retail_price: 1499,
  costDollars: 14.99   ← LOOK HERE: Is the dollar conversion correct?
}
```

#### Log 4: Base Cost Calculation
```
[SYNC DEBUG] Base cost calculation: {
  template: "Unisex Heavy Cotton Tee",
  variantCount: 24,
  baseCostsArray: [14.99, 14.99, 15.99, ...],  ← LOOK HERE: Are these all zero?
  minBaseCost: 14.99,                          ← LOOK HERE: Is this zero or a real value?
  fallbackToTemplate: undefined
}
```

## What the Logs Will Reveal

### Scenario A: Raw variant has NO cost field
```
cost: undefined
allKeys: ["id", "title", "options", "sku", ...]  ← NO "cost" or "price" field
```
**Root Cause:** Printify variants API endpoint doesn't return cost for this blueprint
**Fix Needed:** Fetch cost from a different endpoint (shop products or pricing API)

### Scenario B: Raw variant has cost but enrichment loses it
```
Raw: cost: 1499
Enriched: cost: undefined  ← LOST HERE
```
**Root Cause:** Bug in enrichVariants function
**Fix Needed:** Ensure enrichVariants preserves all original fields

### Scenario C: Enriched variant has cost but merge loses it
```
Enriched: cost: 1499
Merged: cost: undefined  ← LOST HERE
```
**Root Cause:** Merge logic prioritizes wrong source
**Fix Needed:** Change priority in merge logic (line 242 of PrintifySettings.tsx)

### Scenario D: Merged variant has cost but conversion fails
```
Merged: cost: 1499
costDollars: 0  ← CONVERSION FAILED
```
**Root Cause:** Bug in toDollars function
**Fix Needed:** Fix cent-to-dollar conversion logic

### Scenario E: All variants have cost but filter removes them
```
baseCostsArray: []  ← EMPTY despite variants having cost
variantCount: 24    ← But variants exist
```
**Root Cause:** Filter logic (enabled/available) is too strict
**Fix Needed:** Relax filter conditions or check why all variants are marked unavailable

## Next Steps

1. **Copy ALL the console logs** from your browser
2. **Paste them in your response** to me
3. I'll identify the exact point where the cost is being lost
4. I'll implement the proper fix (not a workaround)

## Expected Result

After the fix, you should see:
- Raw variants with `cost: 1499` (or similar value in cents)
- Enriched variants still have `cost: 1499`
- Merged variants still have `cost: 1499`
- `costDollars: 14.99` (proper conversion)
- `baseCostsArray: [14.99, 14.99, ...]` (real values, not empty)
- `minBaseCost: 14.99` (real value, not zero)
- Template editor shows `Base Cost: $14.99` (not $0.00)

---

**Current Status:** Debug logging deployed and ready for testing
**Branch:** fix/printify-fulfillment-POF-001
**Commit:** 0881185
