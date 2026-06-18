# Debug Color Overlay - Testing Instructions

**Commit**: `577e52e`  
**Branch**: `feat/printify-enhancements`  
**Status**: Debug version deployed with extensive logging

---

## What's New in This Debug Build

### 1. **Comprehensive Console Logging**
Every step of the color lookup and overlay rendering is now logged:

```javascript
[getColorHex] Called with: Navy
[getColorHex] Explicit hex from template: undefined
[getColorHex] Looking up fallback for: navy
[getColorHex] Direct match found: #000080
[Color Overlay] RENDER CHECK: {
  selectedColor: 'Navy',
  colorHex: '#000080',
  hasColorHex: true,
  baseImage: 'https://...',
  timestamp: '2026-06-18T...'
}
[Color Overlay] RENDERING OVERLAY with hex: #000080
```

### 2. **Visual Confirmation**
The overlay div now has a **red border** (`border: '2px solid red'`) so you can visually confirm it exists in the DOM.

### 3. **Simplified Overlay**
- **Removed CSS mask** temporarily (was potentially causing rendering issues)
- **Simple multiply blend** on full image
- This tests if the basic overlay works before adding complexity

---

## Testing Steps (CRITICAL)

### Step 1: Open Browser Console
1. Navigate to the customizer page
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. **Keep it visible** during testing

### Step 2: Select a Color
1. Click on any color in the color picker
2. **Watch the console** - you should see logs like:
   ```
   [getColorHex] Called with: [ColorName]
   [getColorHex] Direct match found: #XXXXXX
   [Color Overlay] RENDERING OVERLAY with hex: #XXXXXX
   ```

### Step 3: Visual Inspection
1. Look at the mockup preview
2. **Check for red border** around the product area
3. **Check if color tints** the image
4. **Check if entire image** gets tinted (including background)

### Step 4: Inspect DOM
1. Right-click on the mockup preview → **Inspect Element**
2. Look for a `<div>` with `data-testid="color-overlay"`
3. Check its computed styles:
   - `background-color`: should be the selected color hex
   - `mix-blend-mode`: should be `multiply`
   - `opacity`: should be `0.85`
   - `z-index`: should be `10`
   - `border`: should show `2px solid red`

---

## What to Report Back

### If Overlay DOES Render (Red Border Visible):

**✅ SUCCESS** - The overlay is working! Report:
1. "Red border is visible" ✅
2. "Color tint is applied to image" ✅ or ❌
3. "Entire image gets tinted (including background)" ✅ or ❌
4. Screenshot of the mockup
5. Screenshot of console logs

**Issue 2** then becomes the focus: We need to clip the overlay to only the product, not the background.

---

### If Overlay DOES NOT Render (No Red Border):

**❌ PROBLEM** - Debug needed. Report:
1. "No red border visible" ❌
2. Console logs (copy all `[getColorHex]` and `[Color Overlay]` messages)
3. Inspect element screenshot showing the DOM structure
4. What color names are available in the picker?
5. Does console show "NO HEX FOUND" error?

**Possible causes**:
- Color name not in mapping
- `selectedColor` state not updating
- Conditional rendering failing
- React reconciliation issue

---

## Specific Console Log Patterns to Watch For

### Pattern 1: Hex Not Found
```
[getColorHex] Called with: Some Weird Color Name
[getColorHex] Explicit hex from template: undefined
[getColorHex] Looking up fallback for: some weird color name
[getColorHex] NO MATCH FOUND for: Some Weird Color Name - returning undefined
[Color Overlay] NO HEX FOUND - overlay will NOT render!
```
**Meaning**: Color name isn't in the mapping. Tell me the exact color name so I can add it.

---

### Pattern 2: Successful Lookup
```
[getColorHex] Called with: Navy
[getColorHex] Direct match found: #000080
[Color Overlay] RENDERING OVERLAY with hex: #000080
```
**Meaning**: Color lookup succeeded. Overlay **should** render with red border visible.

---

### Pattern 3: No Logs At All
```
(nothing in console)
```
**Meaning**: `selectedColor` isn't being set, or the component isn't re-rendering. Check:
- Are you clicking on color buttons?
- Do color buttons have visual "active" state?
- Inspect `selectedColor` state in React DevTools

---

## Image Background Investigation (Issue 2)

Once the overlay is rendering, we need to check the **actual image backgrounds**:

### What to Check:
1. Open the mockup image URL directly in a new tab
2. Look at the image carefully:
   - **Plain white/transparent background** = Good, simple overlay is acceptable
   - **Photo background** (room, model, scene) = Bad, needs masking
   - **Alpha transparency** around product = Good, can use CSS mask

### How to Check:
1. Inspect the `<img>` element in DevTools
2. Copy the `src` URL
3. Open it in a new tab
4. **Right-click → "Save Image As"** and check file type:
   - PNG = likely has alpha transparency
   - JPG = no transparency, solid background

### Report:
- **Image URL**: `https://...`
- **File type**: PNG / JPG
- **Background**: Plain white / Transparent / Photo scene
- **Has alpha channel**: Yes (product isolated) / No (solid background)

---

## Expected Outcomes

### Best Case Scenario:
- ✅ Red border visible
- ✅ Color tint applied
- ✅ Image has plain white background
- ✅ Full-image tint looks acceptable
→ **Solution**: Remove red border, done!

### Likely Case:
- ✅ Red border visible
- ✅ Color tint applied
- ❌ Image has photo background
- ❌ Background gets tinted (looks bad)
→ **Solution**: Add CSS mask-image with alpha clipping

### Worst Case:
- ❌ No red border
- ❌ No tint
- ❌ Console shows hex found but no render
→ **Solution**: Debug React rendering, check z-index/positioning

---

## Next Steps Based on Results

### If Working But Background Tints:
I'll add back the CSS mask-image approach:
```css
mask-image: url(sameImageUrl);
mask-mode: alpha;
```
This clips the overlay to only non-transparent pixels.

### If Not Rendering At All:
I'll need the console logs to diagnose:
- Color name → hex lookup failing?
- Overlay div not in DOM?
- Z-index / positioning issue?
- React reconciliation problem?

### If Working AND Looks Good:
Remove red border debug line, deploy to production!

---

## Quick Test Script

**Copy and paste in browser console after selecting a color**:

```javascript
// Check if overlay exists
const overlay = document.querySelector('[data-testid="color-overlay"]');
console.log('Overlay exists:', !!overlay);
if (overlay) {
  const styles = window.getComputedStyle(overlay);
  console.log('Overlay styles:', {
    backgroundColor: styles.backgroundColor,
    mixBlendMode: styles.mixBlendMode,
    opacity: styles.opacity,
    zIndex: styles.zIndex,
    border: styles.border,
    position: styles.position,
    inset: styles.inset
  });
}
```

This will show if the overlay div exists and what its actual computed styles are.

---

**Test now and report back with console logs + screenshots!**
