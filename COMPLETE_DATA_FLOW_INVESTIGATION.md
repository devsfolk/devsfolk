# Complete Data Flow Investigation - All 4 Points

## Issue
`activeTemplate.variants` is `undefined` (not empty array) on storefront for bp_440.

---

## Point 1: Full activeTemplate Object ✓

**Added logging**:
```typescript
console.log('[Template Debug] FULL activeTemplate object:', JSON.stringify(activeTemplate));
console.log('[Price Debug] FULL activeTemplate object:', JSON.stringify(activeTemplate));
```

**What this will show**:
- Complete JSON structure of activeTemplate
- All keys present in the object
- Whether variants field exists at all
- If it exists, what value it has (null, undefined, [], or data)

---

## Point 2: Confirm ID/Title Match ✓

**Added logging**:
```typescript
console.log('[Price Debug] activeTemplate.id:', activeTemplate?.id, 'title:', activeTemplate?.title);
```

**Expected**: `bp_440` / "Adult Staple Tee"  
**If different**: Wrong template being matched by `getTemplateForProduct`

---

## Point 3: templateHasCheckoutMetadata Analysis ✓

**Code** (usePrintifyCatalog.ts lines 9-15):
```typescript
const templateHasCheckoutMetadata = (template?: PrintifyCatalogTemplate) => (
  !!template &&
  Array.isArray(template.providers) &&
  template.providers.length > 0 &&
  Array.isArray(template.variants) &&
  template.variants.some((variant: any) => getSyncedVariantId(variant) > 0)
);
```

**Analysis**:
- ✓ This is a pure boolean check (returns true/false)
- ✓ Does NOT reconstruct or modify the template object
- ✓ Only used in `.filter()` - templates pass through unchanged
- ✓ **NOT the cause** of missing variants

**How it's used** (line 27):
```typescript
const editorReadyTemplates = printifyCatalog.filter((template) => templateHasCheckoutMetadata(template));
```

Only filters OUT templates that don't have metadata. Doesn't modify passed templates.

---

## Point 4: Two Data Sources Investigation ✓

### Data Flow Traced

**1. Supabase Fetch** (ShopContext.tsx line 831):
```typescript
supabase.from('printify_catalog').select('*')
```
✓ Fetches all columns including variants

**2. Mapping** (ShopContext.tsx line 868):
```typescript
const remoteCatalog = (printifyCatalogResult.data ?? []).map(mapPrintifyCatalogRow);
```
✓ Maps `row.variants` to `template.variants` (line 525)

**3. State Update** (line 869):
```typescript
setPrintifyCatalog(remoteCatalog);
```
✓ Updates React state with mapped templates

**4. localStorage Cache** (line 870):
```typescript
savePrintifyCatalogLocally(remoteCatalog);
```

**5. compactPrintifyCatalogForStorage** (line 241):
```typescript
variants: template.variants.slice(0, 25)
```
✓ PRESERVES variants (just limits to 25 items)

**6. usePrintifyCatalog Hook** (usePrintifyCatalog.ts line 19):
```typescript
const { printifyCatalog, settings } = useShop();
```
✓ Gets from ShopContext state

**7. editorReadyTemplates Filter** (line 27):
```typescript
const editorReadyTemplates = printifyCatalog.filter((template) => templateHasCheckoutMetadata(template));
```
✓ Filters only, doesn't modify

**8. BespokeCustomizer** (BespokeCustomizer.tsx line 114):
```typescript
return editorReadyTemplates.find((template) => ...)
```
✓ Finds matching template, doesn't modify

### Conclusion: NO TRANSFORMATION STEPS

The template object passes through unchanged from Supabase to BespokeCustomizer. All steps either map, filter, or find - none reconstruct or strip fields.

### Initial Load Logic

**Production Mode** (hasSupabaseConfig = true, line 1065):
```typescript
setPrintifyCatalog([]);  // Empty initially
// Then syncCatalogFromSupabase() fetches fresh data
```

**Development Mode** (hasSupabaseConfig = false, line 1071):
```typescript
setPrintifyCatalog(localPrintifyCatalog);  // Loads from localStorage
```

**NOT two separate sources** - same state variable, just different initial load strategy.

---

## Comprehensive Logging Added

### 1. ShopContext - After Supabase Fetch
```typescript
console.log('[ShopContext] Fetched printifyCatalog from Supabase, count:', remoteCatalog.length);
const bp440 = remoteCatalog.find(t => t.id === 'bp_440');
if (bp440) {
  console.log('[ShopContext] bp_440.variants:', bp440.variants);
  console.log('[ShopContext] bp_440 keys:', Object.keys(bp440));
}
```

**Shows**: Variants immediately after Supabase fetch and mapping

### 2. usePrintifyCatalog - Raw printifyCatalog
```typescript
console.log('[usePrintifyCatalog] printifyCatalog count:', printifyCatalog.length);
const bp440 = printifyCatalog.find(t => t.id === 'bp_440');
if (bp440) {
  console.log('[usePrintifyCatalog] bp_440 found, variants:', bp440.variants);
}
```

**Shows**: Variants in printifyCatalog state before filtering

### 3. usePrintifyCatalog - After Filter
```typescript
console.log('[usePrintifyCatalog] editorReadyTemplates count:', editorReadyTemplates.length);
const bp440InEditor = editorReadyTemplates.find(t => t.id === 'bp_440');
if (bp440InEditor) {
  console.log('[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants:', bp440InEditor.variants);
}
```

**Shows**: Variants after templateHasCheckoutMetadata filter

### 4. BespokeCustomizer - activeTemplate
```typescript
console.log('[Template Debug] activeTemplate.id:', activeTemplate.id);
console.log('[Template Debug] activeTemplate.variants:', activeTemplate.variants);
console.log('[Template Debug] Full activeTemplate keys:', Object.keys(activeTemplate));
console.log('[Template Debug] FULL activeTemplate object:', JSON.stringify(activeTemplate));
```

**Shows**: Final activeTemplate structure in component

### 5. Price Calculation - Complete Context
```typescript
console.log('[Price Debug] activeTemplate.id:', activeTemplate?.id, 'title:', activeTemplate?.title);
console.log('[Price Debug] activeTemplate.variants:', activeTemplate?.variants);
console.log('[Price Debug] selectedSize:', selectedSize);
console.log('[Price Debug] getSizePricingFromVariants result:', sizePricing);
console.log('[Price Debug] FULL activeTemplate object:', JSON.stringify(activeTemplate));
```

**Shows**: Everything at price calculation time

---

## Expected Console Output Sequence

### On Page Load:
```
[ShopContext] Fetched printifyCatalog from Supabase, count: 10
[ShopContext] bp_440 template found? true
[ShopContext] bp_440.variants: [Array with 7 items]
[ShopContext] bp_440 keys: ["id", "title", "variants", ...]

[usePrintifyCatalog] printifyCatalog count: 10
[usePrintifyCatalog] bp_440 found, variants: [Array with 7 items]
[usePrintifyCatalog] editorReadyTemplates count: 5
[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants: [Array with 7 items]

[Template Debug] activeTemplate.id: bp_440
[Template Debug] activeTemplate.title: Adult Staple Tee
[Template Debug] activeTemplate.variants: [Array with 7 items]
[Template Debug] Full activeTemplate keys: ["id", "title", "variants", ...]
[Template Debug] FULL activeTemplate object: {...full JSON...}

[Price Debug] activeTemplate.id: bp_440 title: Adult Staple Tee
[Price Debug] activeTemplate.variants: [Array with 7 items]
[Price Debug] selectedSize: XS
[Price Debug] getSizePricingFromVariants result: [Array with 7 items]
[Price Debug] FULL activeTemplate object: {...full JSON...}
```

### If Variants Lost at ShopContext:
```
[ShopContext] bp_440.variants: []  ← PROBLEM HERE
```
**Cause**: mapPrintifyCatalogRow bug or Supabase column issue

### If Variants Lost at usePrintifyCatalog:
```
[ShopContext] bp_440.variants: [Array]  ← Has data
[usePrintifyCatalog] bp_440 found, variants: []  ← LOST HERE
```
**Cause**: State update issue or React closure bug

### If Variants Lost at Filter:
```
[usePrintifyCatalog] bp_440 found, variants: [Array]  ← Has data
[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants: []  ← LOST HERE
```
**Cause**: Filter somehow corrupting (unlikely - just boolean check)

### If Variants Lost at BespokeCustomizer:
```
[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants: [Array]  ← Has data
[Template Debug] activeTemplate.variants: undefined  ← LOST HERE
```
**Cause**: getTemplateForProduct returning wrong template, or Product → Template ID mapping broken

### If bp_440 Not in editorReadyTemplates:
```
[usePrintifyCatalog] bp_440 in editorReadyTemplates, variants: undefined  ← NOT FOUND
```
**Cause**: Template doesn't pass templateHasCheckoutMetadata check (missing providers or invalid variant IDs)

---

## Testing Instructions

1. **Clear browser cache/localStorage** completely
2. **Refresh page** to trigger fresh Supabase fetch
3. **Open console BEFORE navigating** to product
4. **Navigate to "Adult Staple Tee"**
5. **Watch console logs in order**:
   - ShopContext logs (on initial fetch)
   - usePrintifyCatalog logs (when component mounts)
   - Template Debug logs (when activeTemplate set)
   - Price Debug logs (when price calculated)
6. **Copy ALL console output** and share

---

## What Each Log Reveals

| Log | Shows | If Missing/Wrong |
|-----|-------|------------------|
| ShopContext | Data immediately after Supabase | Supabase/mapping issue |
| usePrintifyCatalog (raw) | Data in React state | State update issue |
| usePrintifyCatalog (filtered) | Data after filter | Filter corrupting data |
| Template Debug | Data in BespokeCustomizer | ID matching issue |
| Price Debug | Data at calculation time | Same as Template Debug |

---

## Status

✓ All 4 investigation points addressed  
✓ Complete data flow traced  
✓ No transformation/reconstruction steps found  
✓ Comprehensive logging at every step  
✓ Ready for console output analysis
