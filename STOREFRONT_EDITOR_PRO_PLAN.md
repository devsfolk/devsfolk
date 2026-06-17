# Storefront Editor Pro - Implementation Plan

## Overview

Complete transformation of the basic storefront editor into a professional-grade customization system with 4-step customer flow and dynamic pricing.

---

## ✅ STEP 1: Database & Admin Configuration (COMPLETE)

**Status**: ✅ Pushed to `fix/printify-fulfillment-POF-001`

**Commit**: `a5512e8`

### What Was Built:

1. **Database Migration** (`003_add_editor_design_charges.sql`)
   - Schema documentation for `editorCharges` in store_settings
   - Structure: textOnly, designOnly, textAndDesign, areaMultiplier

2. **Admin UI** (Dashboard → Printify → Editor)
   - Design Charges configuration card
   - 3 base fee inputs (Text Only, Design Upload, Text + Design)
   - Optional Area-Based Surcharge with threshold % and surcharge amount
   - Live pricing example calculator
   - Professional UI matching dashboard aesthetic

3. **TypeScript Types** (`types.ts`)
   - Added `editorCharges` to `PrintifyCharges` interface
   - Full type safety for all charge fields

4. **Default Values** (`ShopContext.tsx`)
   - textOnly: $5.00
   - designOnly: $10.00
   - textAndDesign: $12.00
   - areaMultiplier: disabled by default

### Files Modified:
- `database-migrations/003_add_editor_design_charges.sql` (new)
- `src/pages/dashboard/PrintifySettings.tsx` (292 lines added)
- `src/types.ts` (editorCharges interface)
- `src/context/ShopContext.tsx` (default values)

---

## 📋 STEP 2: Enhanced Template Selection (NEXT)

**Goal**: Improve template browsing and add "Next" button flow

### Tasks:
1. Update `BespokeCustomizer.tsx`:
   - Redesign template card layout
   - Add clear "Select Template" primary action
   - Show "Next" button after template selected (NOT "Add to Cart")
   - Template search and filtering improvements

2. Add state management:
   - `selectedTemplate` state
   - `currentStep` state (1-4)
   - Step progress indicator

3. UI/UX:
   - Professional card design with hover effects
   - Clear template information (name, base price, sizes, colors)
   - Grid layout responsive on mobile

### Expected Outcome:
Customer sees templates → Clicks one → "Next" button appears

---

## STEP 3: Professional Color & Size Selection

**Goal**: Visual color swatches + size selector with "Next" flow

### Tasks:
1. Color Selector Component:
   - Circular color swatches (NOT text labels)
   - Only selected color shows name label
   - Support for 5+ colors with "+ More Colors" expand
   - Hex color to circle rendering
   - Active state highlighting

2. Size Selector Component:
   - Clear size buttons (S, M, L, XL, etc.)
   - Active state highlighting
   - Sold out / unavailable states

3. Flow Logic:
   - Both color AND size must be selected
   - "Next" button enabled only after both selected
   - Selected values passed to next step

### Expected Outcome:
Customer selects color → Selects size → Clicks "Next" to Design Studio

---

## STEP 4: Design Studio - Core Feature

**Goal**: Canvas-based design editor with print area boundaries

### Major Components:

#### 4.1: Two-Layer Color Masking System
- **Bottom Layer**: Solid color div (selected color applied)
- **Top Layer**: Transparent alpha-shadow overlay PNG
- **Result**: Color shows through while preserving shadows/folds/highlights

#### 4.2: Design Upload
- File input for PNG/JPG/SVG
- Image optimization (max 800x800px)
- Fabric.js Image object creation
- Drag, resize, rotate within print area boundaries

#### 4.3: Text Tool
- Text input field
- Font selector (Inter, Playfair, Pacifico, Montserrat, Oswald)
- Font size slider
- Color picker
- Bold, Italic, Underline toggles
- Text alignment (left, center, right)
- Fabric.js IText object
- Drag, resize, rotate within print area boundaries

#### 4.4: Print Area Boundaries
- Read admin-defined print areas from template
- Convert percentage coordinates to canvas pixels
- Enforce boundaries: designs cannot exceed area
- Visual boundary indicator (optional)

#### 4.5: Canvas Management
- Fabric.js Canvas initialization
- Object selection/deselection
- Layer management (bring to front/send to back)
- Delete selected object
- Clear all objects

### Expected Outcome:
Customer can upload design, add text, customize both, all within defined print area

---

## STEP 5: Premium Preview Generation

**Goal**: Merged preview showing design on colored template

### Tasks:
1. Canvas Export:
   - Export Fabric.js canvas as base64 PNG
   - Maintain aspect ratio and quality

2. Preview Compositor:
   - Layer 1: Colored template base
   - Layer 2: Alpha shadow overlay
   - Layer 3: Customer design (from canvas export)
   - Composite all layers into final preview

3. Preview Display:
   - Large preview image
   - Zoom/pan controls (optional)
   - Multiple angle views if template has multiple images

### Expected Outcome:
Customer sees realistic preview of exactly what they'll receive

---

## STEP 6: Dynamic Pricing Calculation

**Goal**: Calculate total price based on customization

### Pricing Logic:

```typescript
const basePrice = template.sellingPrice || template.price;

let customizationFee = 0;
const hasText = canvas.getObjects('i-text').length > 0;
const hasDesign = canvas.getObjects('image').length > 0;

if (hasText && hasDesign) {
  customizationFee = editorCharges.textAndDesign;
} else if (hasDesign) {
  customizationFee = editorCharges.designOnly;
} else if (hasText) {
  customizationFee = editorCharges.textOnly;
}

// Area-based surcharge
if (editorCharges.areaMultiplier.enabled) {
  const coverage = calculateDesignCoverage(canvas, printArea);
  if (coverage > editorCharges.areaMultiplier.threshold) {
    customizationFee += editorCharges.areaMultiplier.surcharge;
  }
}

const total = basePrice + customizationFee;
```

### UI Display:
```
Template Base Price    $24.99
+ Text Customization   $ 5.00
+ Design Upload        $10.00
─────────────────────────────
Total                  $39.99

[Add Customized to Cart]
```

### Expected Outcome:
Customer sees itemized breakdown before adding to cart

---

## STEP 7: Cart Integration

**Goal**: Add customized product to cart with all metadata

### Data to Store:
```typescript
{
  productId: template.id,
  color: selectedColor,
  size: selectedSize,
  customization: {
    hasText: boolean,
    hasDesign: boolean,
    designData: string, // base64 canvas export
    previewUrl: string, // final merged preview
    coverage: number,   // % of print area covered
  },
  basePrice: number,
  customizationFee: number,
  total: number,
}
```

### Tasks:
1. Update `CartItem` interface in types.ts
2. Update `addToCart` function in ShopContext
3. Cart display shows customized preview thumbnail
4. Order submission includes customization data

### Expected Outcome:
Customized product added to cart with all design data preserved

---

## STEP 8: Mobile Responsive

**Goal**: Full functionality on mobile devices

### Tasks:
1. Touch-enabled canvas controls
2. Responsive step navigation
3. Mobile-optimized color/size selectors
4. Touch drag/resize/rotate
5. Mobile-friendly text input
6. Preview zoom for small screens

### Expected Outcome:
Seamless experience on mobile matching desktop functionality

---

## STEP 9: Testing & Polish

### Testing Checklist:
- [ ] Template selection flow
- [ ] Color/size selection with all combinations
- [ ] Design upload (PNG, JPG, SVG)
- [ ] Text customization (all fonts, colors, styles)
- [ ] Drag/resize/rotate within boundaries
- [ ] Boundary enforcement
- [ ] Color masking renders correctly
- [ ] Preview generation quality
- [ ] Pricing calculation accuracy
- [ ] Cart integration
- [ ] Checkout with customized products
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Polish Tasks:
- Loading states for all async operations
- Error handling and user feedback
- Smooth animations and transitions
- Accessibility (keyboard navigation, screen readers)
- Performance optimization

---

## Technical Architecture

### File Structure:
```
src/
├── components/
│   └── printify/
│       ├── editor/
│       │   ├── EditorStepIndicator.tsx       (Step 1-4 progress)
│       │   ├── TemplateSelector.tsx          (Step 1)
│       │   ├── ColorSizeSelector.tsx         (Step 2)
│       │   ├── DesignStudio.tsx              (Step 3 - main canvas)
│       │   ├── ColorMaskLayer.tsx            (Two-layer system)
│       │   ├── DesignUploader.tsx            (Image upload)
│       │   ├── TextEditor.tsx                (Text tool)
│       │   ├── CanvasControls.tsx            (Toolbar)
│       │   ├── PreviewGenerator.tsx          (Step 4)
│       │   └── PricingBreakdown.tsx          (Dynamic pricing)
│       └── BespokeCustomizer.tsx (main wrapper - refactored)
├── hooks/
│   ├── useCanvasEditor.ts                    (Canvas logic)
│   ├── useColorMasking.ts                    (Color layer logic)
│   ├── usePrintAreaBounds.ts                 (Boundary enforcement)
│   └── useCustomizationPricing.ts            (Pricing calculator)
└── lib/
    ├── canvasUtils.ts                        (Canvas helpers)
    ├── colorMaskingUtils.ts                  (Masking helpers)
    └── previewCompositor.ts                  (Preview merger)
```

### State Management:
```typescript
interface EditorState {
  currentStep: 1 | 2 | 3 | 4;
  selectedTemplate: PrintifyCatalogTemplate | null;
  selectedColor: string | null;
  selectedSize: string | null;
  canvasObjects: fabric.Object[];
  customizationFee: number;
  totalPrice: number;
  previewUrl: string | null;
}
```

---

## Dependencies

### Existing:
- ✅ Fabric.js (already in use)
- ✅ React state management
- ✅ Supabase for data
- ✅ Template print areas (admin-defined)

### New (if needed):
- Canvas-to-image library (e.g., `html2canvas` for preview composition)
- Color manipulation library (e.g., `tinycolor2` for color masking)

---

## Success Criteria

1. ✅ Admin can configure design charges
2. ⏳ Customer completes 4-step flow smoothly
3. ⏳ Color masking preserves template shadows/highlights
4. ⏳ Designs stay within print area boundaries
5. ⏳ Pricing calculates correctly for all scenarios
6. ⏳ Preview matches final product accurately
7. ⏳ Works perfectly on mobile
8. ⏳ No performance issues with canvas operations

---

## Current Status

**Completed**: Step 1 - Database & Admin Configuration ✅

**Next**: Step 2 - Template Selection Enhancement

**Branch**: `fix/printify-fulfillment-POF-001`

**Ready to continue**: Yes! Confirm Step 2 and I'll proceed.
