# 🎯 Print Area Coordinate System Reference

**Purpose**: Technical reference for responsive scaling between admin editor and customer storefront

---

## 📐 Coordinate System Architecture

### Primary: Percentage-Based (Responsive)
- **Storage**: Database stores percentages (0-100)
- **Use**: UI positioning across all screen sizes
- **Benefits**: Naturally responsive, works on mobile/tablet/desktop

### Secondary: Pixel-Based (Precision)
- **Calculation**: Runtime conversion from percentages
- **Use**: Fabric.js canvas boundary enforcement
- **Benefits**: Pixel-perfect object constraints

---

## 🔄 Conversion Formulas

### Percent → Pixels (Runtime, customer view)
```typescript
/**
 * Convert percentage coordinates to pixel coordinates
 * @param percent - Value in percentage (0-100)
 * @param containerSize - Actual mockup image dimension in pixels
 * @returns Pixel value
 */
function convertPercentToPixels(percent: number, containerSize: number): number {
  return (percent / 100) * containerSize;
}

// Example Usage (Phase 5):
const mockupWidth = 1000;  // Actual mockup width on customer screen
const printAreaXPercent = 25;  // From database

const printAreaXPixels = convertPercentToPixels(printAreaXPercent, mockupWidth);
// Result: 250 pixels
```

### Pixels → Percent (Admin editor, setup time)
```typescript
/**
 * Convert pixel coordinates to percentage coordinates
 * @param pixels - Value in pixels
 * @param containerSize - Reference mockup dimension in pixels
 * @returns Percentage value (0-100)
 */
function convertPixelToPercent(pixels: number, containerSize: number): number {
  return (pixels / containerSize) * 100;
}

// Example Usage (Phase 3):
const adminSetPixelX = 300;  // Admin drags to 300px
const referenceMockupWidth = 1000;  // Mockup used for setup

const printAreaXPercent = convertPixelToPercent(adminSetPixelX, referenceMockupWidth);
// Result: 30% (saved to database)
```

---

## 🖥️ Screen Size Independence

### Why Percentages Are Primary

**Problem**: Admin screen ≠ Customer mobile screen

```
Admin (Desktop):
  Mockup Image: 1000px × 1200px
  Print Area: 300px, 240px (30%, 20%)
  ✓ Looks good

Customer (Mobile):
  Mockup Image: 400px × 480px
  Print Area: ??? 
  
❌ If we saved pixels: 300px, 240px
   → Print area extends OUTSIDE mockup (broken)

✓ If we saved percentages: 30%, 20%
  → Print area: 120px, 96px (scales perfectly!)
```

### Reference Mockup Dimensions

**Purpose**: Track which mockup image was used during admin setup

```typescript
interface PrintArea {
  // Admin dragged box to these positions on 1000×1200 mockup
  x: 30,  // 30% from left
  y: 20,  // 20% from top
  width: 50,  // 50% width
  height: 60,  // 60% height
  
  // Store reference for conversion accuracy
  referenceMockupWidth: 1000,   // Admin's mockup width
  referenceMockupHeight: 1200,  // Admin's mockup height
  referenceMockupUrl: "https://...",  // Which mockup was used
}
```

**Benefit**: Can calculate pixel-perfect dimensions on any screen size

---

## 🎨 Fabric.js Integration (Phase 5)

### Boundary Enforcement Pattern

```typescript
// Customer opens BespokeCustomizer
const activeViewPrintArea = {
  x: 25,      // 25% from left
  y: 20,      // 20% from top
  width: 50,  // 50% width
  height: 60, // 60% height
};

// Get actual mockup image dimensions on customer's screen
const mockupElement = document.querySelector('.mockup-image');
const mockupRect = mockupElement.getBoundingClientRect();
const mockupWidth = mockupRect.width;   // e.g., 400px on mobile
const mockupHeight = mockupRect.height; // e.g., 480px on mobile

// Convert percentages to pixels for Fabric.js
const printAreaPixels = {
  left: convertPercentToPixels(activeViewPrintArea.x, mockupWidth),
  top: convertPercentToPixels(activeViewPrintArea.y, mockupHeight),
  width: convertPercentToPixels(activeViewPrintArea.width, mockupWidth),
  height: convertPercentToPixels(activeViewPrintArea.height, mockupHeight),
};
// Result: { left: 100px, top: 96px, width: 200px, height: 288px }

// Set Fabric.js canvas boundaries
const canvas = new fabric.Canvas('customizer-canvas', {
  width: printAreaPixels.width,   // 200px
  height: printAreaPixels.height, // 288px
});

// Enforce object boundaries (no dragging outside)
canvas.on('object:moving', (e) => {
  const obj = e.target;
  const objLeft = obj.left || 0;
  const objTop = obj.top || 0;
  const objWidth = (obj.width || 0) * (obj.scaleX || 1);
  const objHeight = (obj.height || 0) * (obj.scaleY || 1);
  
  // Constrain within canvas
  const maxLeft = canvas.width! - objWidth;
  const maxTop = canvas.height! - objHeight;
  
  obj.set({
    left: Math.max(0, Math.min(maxLeft, objLeft)),
    top: Math.max(0, Math.min(maxTop, objTop)),
  });
  
  obj.setCoords();
  canvas.renderAll();
});
```

---

## 🔍 Real-World Example

### Scenario: T-Shirt Front Design Area

#### Admin Setup (Desktop - 1200×1400 mockup)
```typescript
// Admin visually drags print area box
// Box positioned at: 360px, 420px (size: 600px × 840px)

// Calculate percentages for storage
const printArea = {
  id: "pa_front_main",
  name: "Front Chest Design",
  view: "front",
  
  // Percentages (saved to database)
  x: 30,   // 360px / 1200px × 100 = 30%
  y: 30,   // 420px / 1400px × 100 = 30%
  width: 50,   // 600px / 1200px × 100 = 50%
  height: 60,  // 840px / 1400px × 100 = 60%
  
  // Reference (saved to database)
  referenceMockupWidth: 1200,
  referenceMockupHeight: 1400,
  referenceMockupUrl: "https://.../white-tshirt-front.png",
  
  dpi: 300,
};

// Saved to database ✓
```

#### Customer View (Mobile - 375×667 viewport)
```typescript
// Load template from database
const printArea = {
  x: 30, y: 30,
  width: 50, height: 60,
  referenceMockupWidth: 1200,
  referenceMockupHeight: 1400,
};

// Mockup image scales to fit mobile screen
const mockupElement = document.querySelector('.mockup-image');
// Actual rendered size: 400px × 467px (maintains aspect ratio)

// Convert percentages to pixels for mobile
const printAreaBounds = {
  left: (30 / 100) * 400 = 120px,
  top: (30 / 100) * 467 = 140px,
  width: (50 / 100) * 400 = 200px,
  height: (60 / 100) * 467 = 280px,
};

// Fabric canvas uses these pixel boundaries
// Customer can only drag designs within 120-320px (x), 140-420px (y)
// Print area scales PERFECTLY to mobile screen ✓
```

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Using Pixel Coordinates Directly
```typescript
❌ BAD: Store pixels directly
{
  x: 300,  // 300 pixels from left
  y: 200,  // 200 pixels from top
}
// Breaks on different screen sizes!

✓ GOOD: Store percentages
{
  x: 30,   // 30% from left
  y: 20,   // 20% from top
  referenceMockupWidth: 1000,  // Context for conversion
}
// Works on all screen sizes!
```

### Pitfall 2: Ignoring Mockup Aspect Ratios
```typescript
❌ BAD: Assume mockup is square
const printAreaX = (30 / 100) * containerWidth;
// Mockup might be portrait/landscape!

✓ GOOD: Use actual mockup dimensions
const mockupRect = mockupElement.getBoundingClientRect();
const printAreaX = (30 / 100) * mockupRect.width;
// Accounts for actual aspect ratio!
```

### Pitfall 3: Fixed Canvas Size
```typescript
❌ BAD: Hardcoded canvas size
const canvas = new fabric.Canvas('canvas', {
  width: 500,  // Fixed!
  height: 600,
});

✓ GOOD: Dynamic canvas size from print area
const printAreaRect = printAreaElement.getBoundingClientRect();
const canvas = new fabric.Canvas('canvas', {
  width: printAreaRect.width,   // Responsive!
  height: printAreaRect.height,
});
```

---

## 📚 Phase Implementation Order

### Phase 1 (Complete) ✅
- Enhanced `PrintArea` interface with optional pixel fields
- Backwards compatibility with legacy templates

### Phase 3 (Future)
- Implement dual-unit coordinate display
- Show both percentages and pixels in admin UI
- Calculate pixels from percentages + reference mockup

### Phase 5 (Future)
- Implement `convertPercentToPixels()` utility
- Implement `convertPixelToPercent()` utility
- Strict Fabric.js boundary enforcement using pixel calculations
- Test responsive scaling on mobile/tablet/desktop

---

## 🧪 Testing Checklist

### Desktop Admin (Phase 3)
- [ ] Drag print area to 25%, 20% position
- [ ] See calculated pixels: 250px, 200px (at 1000px mockup)
- [ ] Save to database
- [ ] Reload template → coordinates match

### Mobile Customer (Phase 5)
- [ ] Load template on 375px wide screen
- [ ] Mockup scales to fit screen
- [ ] Print area boundaries scale proportionally
- [ ] Fabric canvas uses correct pixel dimensions
- [ ] Cannot drag design outside boundaries
- [ ] Design stays within bounds when resized

### Different Mockups (Phase 5)
- [ ] Test with square mockup (1000×1000)
- [ ] Test with portrait mockup (800×1200)
- [ ] Test with landscape mockup (1200×800)
- [ ] Percentages remain constant across all
- [ ] Pixel calculations adjust to aspect ratio

---

**Status**: Reference guide for Phases 3-5  
**Date**: June 19, 2026  
**Author**: Kiro AI Assistant
