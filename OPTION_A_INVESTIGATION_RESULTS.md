# Option A Investigation Results: Per-Color Images in Printify Data

## Summary
**Option A (per-color mockup images) DOES EXIST in the Printify data**, but there's a critical implementation gap in how color changes interact with the multi-view system.

---

## What I Found

### ✅ What's Working (Partially)

1. **Variant-to-Image Mapping EXISTS**:
   - Printify API provides `images[].variant_ids` arrays that map specific images to specific variants
   - The sync pipeline in `PrintifySettings.tsx` (lines 218-255) extracts this mapping:
     ```typescript
     const variantImageMap: Record<string, string[]> = {};
     
     // PRIORITY 1: Map variant images from shop product
     if (shopProductDetail && Array.isArray(shopProductDetail.images)) {
       for (const img of shopProductDetail.images) {
         const imgSrc = normalizeTemplateImage(img);
         const imgVariantIds = Array.isArray(img?.variant_ids) ? img.variant_ids : [];
         
         if (imgSrc && imgVariantIds.length > 0) {
           for (const vid of imgVariantIds) {
             const variantId = String(vid);
             if (!variantImageMap[variantId]) {
               variantImageMap[variantId] = [];
             }
             variantImageMap[variantId].push(imgSrc);
           }
         }
       }
     }
     ```
   - Each variant gets its `image_url` field populated during sync (line 271)
   - This data is stored in Supabase as `variant_images` (ShopContext.tsx line 681)

2. **Color-Aware Image Selection EXISTS**:
   - `getSelectedColorImage` (BespokeCustomizer.tsx lines 707-772) has the logic:
     - **Priority 1**: Use `activePrintifyVariant.image_url` (the per-color image from sync)
     - **Priority 2**: Find matching variant in template variants by color
     - **Fallback**: Fuzzy filename matching
   - This means when a color is selected, it CAN find the correct variant-specific image

### ❌ What's BROKEN

**The Problem**: `activeViewImage` and `getSelectedColorImage` are **separate**, and only `activeViewImage` is used in the JSX.

**Current Flow**:
1. User selects a color → `selectedColor` state updates
2. `getSelectedColorImage` recalculates and finds the correct color-specific image
3. **BUT** the template mockup uses `activeViewImage` (line 1671), which:
   - Only maps view position to image index (front=0, back=1, side=2)
   - Completely ignores the selected color
   - Returns `activeProduct.images[imageIndex]` without any color awareness

**Result**: Color changes do nothing because the rendered image source doesn't use the color-aware logic.

---

## The Fix Required

We need to **merge** the color-aware logic (`getSelectedColorImage`) with the multi-view logic (`activeViewImage`).

### Implementation Strategy

Replace the current `activeViewImage` with a smarter version that:

1. **First**, try to get per-color, per-view images from `variantImages` mapping
2. **Fallback** to the variant's `image_url` field (which is color-specific but single view)
3. **Final fallback** to view-index-based logic (current approach)

### Code Changes Needed

**File**: `src/components/printify/BespokeCustomizer.tsx`

**Replace** the `activeViewImage` useMemo (lines 399-416) with:

```typescript
// Get the image for the currently selected view AND selected color
const activeViewImage = useMemo(() => {
  if (!activeProduct?.images || activeProduct.images.length === 0) {
    return '/custom-tee-mockup.png';
  }

  // PRIORITY 1: Use variant-specific image from sync (color-aware)
  if (selectedColor && activePrintifyVariant?.image_url) {
    // If we have multiple views and variant images mapping, try to get view-specific image
    if (activeTemplate?.variantImages && Object.keys(activeTemplate.variantImages).length > 0) {
      const variantId = String(
        activePrintifyVariant.id || 
        activePrintifyVariant.variant_id || 
        activePrintifyVariant.printify_variant_id || 
        ''
      );
      const variantImages = activeTemplate.variantImages[variantId];
      
      if (variantImages && Array.isArray(variantImages) && variantImages.length > 0) {
        // Map view to image index within this variant's images
        const viewIndex = availableViews.indexOf(selectedView.toLowerCase());
        const imageIndex = viewIndex >= 0 && viewIndex < variantImages.length 
          ? viewIndex 
          : 0;
        return variantImages[imageIndex] || variantImages[0];
      }
    }
    
    // Single-view variant image (most common case)
    return activePrintifyVariant.image_url;
  }

  // PRIORITY 2: Check catalog template variants for image_url matching the selected color
  if (selectedColor && activeTemplate?.variants) {
    const matchingVariant = activeTemplate.variants.find((v: any) => {
      if (!v?.image_url) return false;
      const vColor = getVariantColor(v);
      return vColor && vColor === selectedColor;
    });
    if (matchingVariant?.image_url) return matchingVariant.image_url;
  }

  // PRIORITY 3: Fallback - fuzzy color-to-filename matching
  if (selectedColor) {
    const colorLower = selectedColor.toLowerCase().replace(/[^a-z0-9]/g, '');
    const colorWords = selectedColor.toLowerCase().split(/[\s_-]+/);
    
    const exactMatch = activeProduct.images.find(img => {
      const imgLower = img.toLowerCase();
      return imgLower.includes(colorLower) || 
             imgLower.includes(selectedColor.toLowerCase().replace(/\s+/g, '-')) ||
             imgLower.includes(selectedColor.toLowerCase().replace(/\s+/g, '_'));
    });
    if (exactMatch) return exactMatch;
    
    const allWordsMatch = activeProduct.images.find(img => {
      const imgLower = img.toLowerCase();
      return colorWords.every(word => imgLower.includes(word));
    });
    if (allWordsMatch) return allWordsMatch;

    const primaryWord = colorWords[0];
    if (primaryWord && primaryWord.length > 2 && 
        !['light', 'dark', 'unisex'].includes(primaryWord)) {
      const firstWordMatch = activeProduct.images.find(img => 
        img.toLowerCase().includes(primaryWord)
      );
      if (firstWordMatch) return firstWordMatch;
    }
  }

  // FINAL FALLBACK: Map view position to image index (no color awareness)
  const viewIndex = availableViews.indexOf(selectedView.toLowerCase());
  const imageIndex = viewIndex >= 0 && viewIndex < activeProduct.images.length 
    ? viewIndex 
    : 0;
  
  return activeProduct.images[imageIndex] || activeProduct.images[0];
}, [activeProduct, activeTemplate, selectedView, selectedColor, activePrintifyVariant, availableViews]);
```

**Then DELETE** the now-redundant `getSelectedColorImage` (lines 707-772) since its logic is now merged into `activeViewImage`.

**Update** the preview generator (line 1479) to use `activeViewImage` instead of `getSelectedColorImage`:
```typescript
baseImg.src = activeViewImage || '/custom-tee-mockup.png';
```

---

## Why This Works

1. **Per-color images already exist** in the data (from Printify API sync)
2. **Color-aware logic already exists** (in `getSelectedColorImage`)
3. **Multi-view logic already exists** (in `activeViewImage`)
4. **We just need to combine them** into a single smart selector

This is much simpler than Option B (client-side color masking) because:
- No image processing required
- No blend modes or canvas manipulation
- Just use the right image URL that Printify already provides
- Perfect quality because Printify generates the mockups professionally

---

## Testing After Fix

1. Sync a multi-color template (e.g., T-shirt with Black, White, Navy variants)
2. Open the customizer for that template
3. Verify initial color shows correct mockup
4. Click different colors → mockup should swap to show that color
5. If template has multiple views (front/back), click view buttons → should show correct view for current color
6. Change color while on "back" view → should maintain back view but update to new color

---

## Files Modified

- ✏️ `src/components/printify/BespokeCustomizer.tsx` (merge color + view logic)

## Files Already Correct

- ✅ `src/pages/dashboard/PrintifySettings.tsx` (variant image mapping sync)
- ✅ `src/context/ShopContext.tsx` (variantImages storage)
- ✅ `src/types.ts` (PrintifyCatalogTemplate.variantImages field)

---

## Conclusion

**Option A is the correct solution and the simplest path forward.** The per-color mockup images already exist in the Printify data and are being synced correctly. We just need to fix the render logic to actually USE them when displaying the template mockup.

No client-side image manipulation needed. No blend modes. No masks. Just use the right URL.
