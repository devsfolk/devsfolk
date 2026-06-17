# Image Upload Investigation - BespokeCustomizer

## Investigation Date
Current Session

---

## Code Analysis

### 1. Upload Handler Location
**File**: `src/components/printify/BespokeCustomizer.tsx`  
**Function**: `handleImageUpload` (lines 857-900)

### 2. Upload Flow
```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setIsUploading(true);
  
  try {
    // Step 1: Optimize image (resize to 800x800 max, compress to WebP/JPEG)
    const optimized = await optimizeImage(file, 800, 800);
    
    // Step 2: Get Fabric.js canvas
    const canvas = fabricCanvasRef.current;
    
    if (canvas) {
      // Step 3: Load optimized image into Fabric
      fabric.Image.fromURL(optimized, (img) => {
        // Step 4: Scale to 70% of canvas width
        const scaleFactor = (canvas.width * 0.7) / (img.width || 1);
        
        // Step 5: Position at canvas center
        img.set({
          left: canvas.width / 2,
          top: canvas.height / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scaleFactor,
          scaleY: scaleFactor,
          // ... styling properties
        });

        // Step 6: Remove old images
        const oldImages = canvas.getObjects('image');
        oldImages.forEach((obj) => canvas.remove(obj));

        // Step 7: Add new image to canvas
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        // Step 8: Update React state
        setCustomImage(optimized);
        setActiveTab('upload');
      });
    }
  } catch (err) {
    console.error('Failed to upload custom graphic:', err);
    alert('Failed to process custom design. Please try another image.');
  } finally {
    setIsUploading(false);
  }
};
```

### 3. File Input Element (lines 1544-1549)
```tsx
<Input
  type="file"
  accept="image/*"
  onChange={handleImageUpload}
  disabled={isUploading}
  className="absolute inset-0 opacity-0 cursor-pointer z-10"
/>
```

### 4. Image Optimization (src/lib/imageUtils.ts)
```typescript
export async function optimizeImage(file: File, maxWidth = 800, maxHeight = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // ... resize logic ...
        const dataUrl = canvas.toDataURL('image/webp', 0.60);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
```

---

## Potential Issues Identified

### Issue 1: No Supabase Upload
**Finding**: The code does NOT upload to Supabase storage. It only:
- Optimizes the image locally
- Stores the data URL in React state (`customImage`)
- Renders the image on Fabric.js canvas

**Impact**: None - this is intentional for client-side editing. The image is compiled into the final design later.

### Issue 2: Fabric.js Canvas Initialization Timing
**Finding**: The canvas is initialized in a `useEffect` with `ResizeObserver`. If the print area hasn't rendered with actual dimensions, the canvas might not be initialized when `handleImageUpload` is called.

**Check Required**:
```typescript
const canvas = fabricCanvasRef.current;
if (canvas) {
  // This check might fail if canvas isn't initialized
}
```

**Symptoms if this is the issue**:
- Click upload → file picker opens → select image → nothing happens
- No console error
- `fabricCanvasRef.current` is `null`

### Issue 3: Print Area Dimensions
**Finding**: The canvas size depends on `printAreaRef` having valid dimensions:
```typescript
const rect = printArea.getBoundingClientRect();
const width = Math.round(rect.width || printArea.clientWidth);
const height = Math.round(rect.height || printArea.clientHeight);
if (width < 24 || height < 24) return; // ⚠️ Exits if too small
```

**Symptoms if this is the issue**:
- Canvas never initializes
- Image upload silently fails
- No error in console

### Issue 4: Async Image Loading Race Condition
**Finding**: `fabric.Image.fromURL()` is async but doesn't have error handling:
```typescript
fabric.Image.fromURL(optimized, (img) => {
  // Callback runs async - if it fails, no error is caught
});
```

**Symptoms if this is the issue**:
- `setIsUploading(false)` runs BEFORE image is actually added to canvas
- User sees loading state disappear but no image appears
- No error visible (swallowed by Fabric.js)

### Issue 5: Data URL Size Limits
**Finding**: Large images create large data URLs. Browsers have limits (~2-10MB depending on browser).

**Symptoms if this is the issue**:
- Works for small images
- Fails silently for large images (> 5MB original size)
- No console error (or quota exceeded error in some browsers)

---

## Required Testing Steps

### Step 1: Check Canvas Initialization
**Test**: Add console.log in handleImageUpload
```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log('🔵 Upload triggered');
  const file = e.target.files?.[0];
  console.log('🔵 File selected:', file?.name, file?.size);
  if (!file) return;
  
  setIsUploading(true);
  console.log('🔵 Starting optimization...');
  
  try {
    const optimized = await optimizeImage(file, 800, 800);
    console.log('🔵 Optimization complete, dataURL length:', optimized.length);
    
    const canvas = fabricCanvasRef.current;
    console.log('🔵 Canvas ref:', canvas ? 'EXISTS' : 'NULL');
    // ...
  }
}
```

### Step 2: Check Fabric.js Callback
**Test**: Add error handling to fabric.Image.fromURL
```typescript
fabric.Image.fromURL(optimized, (img) => {
  console.log('🔵 Fabric image loaded:', img);
  if (!img) {
    console.error('❌ Fabric.js failed to create image object');
    return;
  }
  // ... rest of code
}, {
  crossOrigin: 'anonymous' // Try adding this
});
```

### Step 3: Check Console for Errors
**Look for**:
- CORS errors
- Quota exceeded errors
- Fabric.js errors
- Canvas rendering errors

### Step 4: Check Network Tab
**Look for**:
- Any failed requests (shouldn't be any for data URLs)
- Large payloads

---

## Most Likely Root Causes (Ranked)

### 1. Canvas Not Initialized (80% probability)
**Symptoms**: Nothing happens, no error
**Why**: Print area might not have dimensions when component first renders
**Fix**: Ensure canvas is initialized before allowing upload

### 2. Fabric.js async callback failing silently (15% probability)
**Symptoms**: Loading state ends but no image
**Why**: fabric.Image.fromURL callback has no error handling
**Fix**: Add error handling to callback

### 3. Data URL size issue (5% probability)
**Symptoms**: Works for small images, fails for large
**Why**: Browser limits on data URL size
**Fix**: Further reduce optimization quality or size

---

## Recommended Fix Strategy

1. **Add comprehensive logging** to identify exact failure point
2. **Add null checks** for canvas ref
3. **Add error handling** to Fabric.js callback
4. **Add user feedback** if canvas isn't ready
5. **Test with multiple image sizes** to rule out size limits

---

## Next Steps

1. User should test upload in browser with console open
2. Report exact console output
3. Report what happens visually (nothing? loading state? error?)
4. Based on findings, apply targeted fix

**DO NOT MODIFY CODE YET** - wait for actual error reproduction first.
