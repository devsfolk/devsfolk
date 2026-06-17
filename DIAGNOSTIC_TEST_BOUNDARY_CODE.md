# 🔍 Diagnostic Test - Boundary Enforcement Code Disabled

## Purpose
Testing to isolate root cause of two critical bugs:
1. **Design disappearing when scaled larger** (above certain percentage)
2. **Black screen when clicking text** (new severe bug)

## Hypothesis
Both bugs may be caused by the boundary enforcement code corrupting the Fabric.js canvas state.

---

## What Was Done

### Step 1: Identified the Problematic Code
Found commit `77bb2ac` that added boundary enforcement:
- `constrainObjectToBounds()` function
- Event handlers on `object:moving`, `object:modified`, `object:rotating`

### Step 2: Disabled ALL Boundary Code
**File**: `src/components/printify/BespokeCustomizer.tsx`
**Lines**: 828-883

Completely commented out:
```typescript
// ===== BOUNDARY ENFORCEMENT CODE DISABLED FOR TESTING =====
/*
const constrainObjectToBounds = (obj: fabric.Object) => {
  // ... entire function commented out
};

canvas.on('object:moving', (e) => { ... });
canvas.on('object:modified', (e) => { ... });
canvas.on('object:rotating', (e) => { ... });
*/
// ===== END DISABLED CODE =====
```

### Step 3: Build Verification
✅ Build successful:
```
✓ 2463 modules transformed
✓ built in 44.24s
BespokeCustomizer: 358.42 kB │ gzip: 104.22 kB
```

### Step 4: Deployed for Testing
- **Commit**: `1107570`
- **Branch**: `fix/printify-fulfillment-POF-001`
- **Status**: Pushed to remote, triggering Vercel deployment

---

## Testing Instructions for User

### Test 1: Design Scaling
1. Go to BespokeCustomizer
2. Upload a design image
3. Scale the design larger using the scale slider or corner handles
4. Test at: 10%, 25%, 35%, 50%, 75%, 100%, 150%, 200%
5. Move the design around at each scale level

**Expected Result (if boundary code was the bug):**
- ✅ Design remains visible at ALL scales
- ✅ No disappearing or corruption
- ✅ Can move freely without black screen

**If bug still exists:**
- ❌ Design still disappears at certain scale
- Root cause is NOT boundary enforcement

### Test 2: Text Click
1. Add text using "Add Another Text" button
2. Click directly on the text to select it
3. Click multiple times
4. Try editing the text
5. Add multiple text layers and click between them

**Expected Result (if boundary code was the bug):**
- ✅ No black screen when clicking text
- ✅ Text selection works normally
- ✅ Canvas remains stable

**If bug still exists:**
- ❌ Black screen still appears
- Root cause is NOT boundary enforcement

### Test 3: General Canvas Behavior
1. Upload multiple designs
2. Add text layers
3. Scale, rotate, move objects
4. Switch between different objects
5. Use duplicate function
6. Delete objects

**Expected Result:**
- ✅ All operations work smoothly
- ✅ No visual corruption
- ✅ No performance issues

---

## Possible Outcomes & Next Steps

### Outcome A: Bugs Disappear Without Boundary Code ✅
**Conclusion**: Boundary enforcement is the root cause

**Next Steps**:
1. ✅ Confirms the hypothesis
2. Rewrite boundary enforcement from scratch using safer approach:
   - Do NOT modify object properties during event handlers that fight Fabric.js rendering
   - Use `object.setCoords()` after any manual position/scale correction
   - Clamp using simple `min/max` math based on `object.getBoundingRect()`
   - Call `canvas.requestRenderAll()` after changes, never leave canvas partially updated
   - Test extensively at all scales (10%-200%)

### Outcome B: Bugs Persist Without Boundary Code ❌
**Conclusion**: The issue is elsewhere

**Investigate**:
1. Image upload handler's object creation logic
2. Text creation logic in `handleTextChange()` and `handleAddNewText()`
3. Conflicting click handlers or event listeners
4. Fabric.js version compatibility issues
5. Object property initialization (fill, stroke, shadow settings)
6. Canvas rendering pipeline conflicts

Do NOT re-enable boundary code until root cause is found.

---

## Code That Was Disabled

### Original Boundary Enforcement Logic
```typescript
const constrainObjectToBounds = (obj: fabric.Object) => {
  if (!obj || !canvas) return;

  const objBounds = obj.getBoundingRect();
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();

  let left = obj.left || 0;
  let top = obj.top || 0;

  // Adjust position if exceeds boundaries
  if (objBounds.left < 0) {
    left -= objBounds.left;
  }
  if (objBounds.top < 0) {
    top -= objBounds.top;
  }
  if (objBounds.left + objBounds.width > canvasWidth) {
    left -= (objBounds.left + objBounds.width) - canvasWidth;
  }
  if (objBounds.top + objBounds.height > canvasHeight) {
    top -= (objBounds.top + objBounds.height) - canvasHeight;
  }

  obj.set({ left, top });
  obj.setCoords();
};
```

### Issues with This Implementation
1. **Modifies object during event** - fights with Fabric.js's own rendering
2. **Direct property manipulation** - may corrupt object state
3. **Called on every pixel of movement** - performance impact
4. **No render safeguards** - can leave canvas in intermediate state
5. **Doesn't account for object origin** - centerX/centerY vs left/top confusion

---

## Awaiting User Feedback

**Please test the deployed version and report back:**
1. Does scaling design larger work without disappearing?
2. Does clicking text avoid the black screen?
3. Are there any other issues observed?

Once we confirm the behavior, we can proceed with the appropriate fix.

---

## Build Info
- **Commit**: `1107570`
- **Build Time**: 44.24s
- **Bundle Size**: 358.42 kB (gzipped: 104.22 kB)
- **Status**: ✅ Successful, deployed to Vercel
