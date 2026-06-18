# 🎨 Print Area Visual Canvas Editor - Implementation Plan

**Date**: June 19, 2026  
**Status**: 📋 **PLANNING PHASE**  
**Goal**: Transform Print Areas Tab into a Visual Canvas Editor Tool

---

## 🎯 Executive Summary

**Current State**: PrintAreasTab has basic drag/resize functionality but:
- Works with percentages only (not pixel-perfect)
- One print area per image (1:1 mapping is limiting)
- No per-view customization (Front/Back/Side each need independent areas)
- BespokeCustomizer uses `activeViewPrintArea` but has fallback logic that makes it unreliable

**Target State**: Premium Visual Canvas Editor where:
- Admin defines **per-view print areas** (Front has its own, Back has its own, etc.)
- Coordinates stored in **both percentages and pixels** for precision
- BespokeCustomizer **strictly enforces** these boundaries (no object dragging outside)
- Multiple print areas per view supported (future: Front + Sleeve Left)

---

## 📊 Current Architecture Analysis

### 1. Current Data Structure (PrintArea interface)
**Location**: `src/hooks/useTemplateForm.ts`

```typescript
export interface PrintArea {
  name: string;           // "Front Design Area"
  position: string;       // "front", "back", "side"
  width: number;          // 40 (percentage)
  height: number;         // 50 (percentage)
  x: number;              // 30 (percentage)
  y: number;              // 25 (percentage)
  dpi?: number;           // 300
}
```

**Issues**:
- ❌ No `view` field - position is vague ("front" could mean front of shirt OR front print area)
- ❌ Percentages only - not pixel-accurate for Fabric.js constraints
- ❌ No reference mockup dimensions for conversion
- ❌ One print area per image index (rigid 1:1 mapping)

---

### 2. Current PrintAreasTab UI
**Location**: `src/components/printify/tabs/PrintAreasTab.tsx`

**What Works** ✅:
- Visual drag/resize bounding box UI
- Mouse event handlers (drag, resize with corners)
- Real-time coordinate updates
- Image carousel (prev/next buttons)
- Auto-prefill position names

**What's Broken** ❌:
- `currentImageIndex` assumes 1 print area per image (breaks if multiple views share one mockup)
- No concept of "views" (Front/Back/Side) - only image index
- Resizing logic sometimes glitchy (deltaX/deltaY accumulation issues)
- No save button functionality - just alerts

---

### 3. Current BespokeCustomizer Integration
**Location**: `src/components/printify/BespokeCustomizer.tsx`

#### **How Print Areas Are Used**:

**a) View Selection** (Line 363-386):
```typescript
const availableViews = useMemo(() => {
  const printAreas = activeTemplate?.printAreas || [];
  
  if (printAreas.length > 0) {
    const positions = printAreas
      .map((area: any) => area?.position || area?.name)
      .filter(Boolean);
    return [...new Set(positions.map(p => p.toLowerCase()))];
  }
  
  return ['front']; // Fallback
}, [activeTemplate]);
```

**b) Active Print Area Lookup** (Line 388-397):
```typescript
const activeViewPrintArea = useMemo(() => {
  const printAreas = activeTemplate?.printAreas || [];
  const found = printAreas.find((area: any) => {
    const position = (area?.position || area?.name || '').toLowerCase();
    return position === selectedView.toLowerCase();
  });
  
  return found || printAreas[0] || null;
}, [activeTemplate, selectedView]);
```

**c) Canvas Boundary Style** (Line 266-343):
```typescript
const getPrintAreaStyle = () => {
  let style = { width: '50%', height: '60%', top: '20%', left: '25%' }; // Fallback
  
  if (activeViewPrintArea) {
    const pWidth = Number(activeViewPrintArea?.width || 0);
    const pHeight = Number(activeViewPrintArea?.height || 0);
    
    if (pWidth > 0 && pHeight > 0) {
      style.width = `${pWidth}%`;
      style.height = `${pHeight}%`;
    }
    
    const posTop = Number(activeViewPrintArea?.top ?? activeViewPrintArea?.y ?? 0);
    const posLeft = Number(activeViewPrintArea?.left ?? activeViewPrintArea?.x ?? 0);
    
    if (posTop > 0) style.top = `${posTop}%`;
    if (posLeft > 0) style.left = `${posLeft}%`;
  }
  
  return style;
};
```

**d) Canvas Element** (Line 1682-1687):
```typescript
<div 
  ref={printAreaRef}
  className="absolute border-2 border-dashed ..."
  style={getPrintAreaStyle()}  // ← Boundaries set here
>
  <canvas ref={canvasElRef} />
</div>
```

**Issues** ❌:
- Fallback logic allows undefined boundaries (50% × 60%)
- No enforcement of object constraints (users can drag outside)
- Percentage-based positioning doesn't account for image aspect ratios
- No validation that print area exists for selected view

---

## 🏗️ Proposed New Architecture

### 1. Enhanced Data Structure

#### **New Interface** (extends existing PrintArea):
```typescript
export interface PrintArea {
  // Identification
  id: string;                    // Unique ID: "pa_front_main" 
  name: string;                  // "Front Chest Design"
  view: 'front' | 'back' | 'side' | 'sleeve_left' | 'sleeve_right' | 'label';
  position?: string;             // Legacy field (keep for backwards compat)
  
  // Percentage-based coordinates (for responsive UI)
  x: number;                     // 25 (percentage from left)
  y: number;                     // 20 (percentage from top)
  width: number;                 // 50 (percentage width)
  height: number;                // 60 (percentage height)
  
  // Pixel-based coordinates (for Fabric.js precision)
  pixelX?: number;               // 250 (pixels from left at reference size)
  pixelY?: number;               // 200 (pixels from top)
  pixelWidth?: number;           // 500 (pixel width)
  pixelHeight?: number;          // 600 (pixel height)
  
  // Reference dimensions (mockup used during setup)
  referenceMockupWidth?: number; // 1000 (mockup image width in pixels)
  referenceMockupHeight?: number;// 1000 (mockup image height in pixels)
  referenceMockupUrl?: string;   // URL of mockup used
  
  // Print specifications
  dpi?: number;                  // 300 (default)
  printProviderId?: number;      // Printify provider ID
  printAreaId?: number;          // Printify print area ID (if synced)
}
```

#### **Why Both Percentages AND Pixels?**
- **Percentages**: Responsive UI - works across different screen sizes
- **Pixels**: Fabric.js canvas uses pixel coordinates - need exact boundaries
- **Reference Mockup**: Allows conversion between percentage ↔ pixels accurately

---

### 2. Database Schema Update

**Location**: `supabase/schema.sql`

**Current**:
```sql
print_areas jsonb not null default '[]'::jsonb
```

**Future** (no schema change needed - JSONB is flexible):
```json
[
  {
    "id": "pa_front_main",
    "name": "Front Chest Design",
    "view": "front",
    "x": 25,
    "y": 20,
    "width": 50,
    "height": 60,
    "pixelX": 250,
    "pixelY": 200,
    "pixelWidth": 500,
    "pixelHeight": 600,
    "referenceMockupWidth": 1000,
    "referenceMockupHeight": 1000,
    "referenceMockupUrl": "https://...",
    "dpi": 300
  },
  {
    "id": "pa_back_main",
    "name": "Back Upper Design",
    "view": "back",
    "x": 20,
    "y": 15,
    "width": 60,
    "height": 70,
    "dpi": 300
  }
]
```

**No migration needed** - existing `print_areas` column already supports this!

---

### 3. Enhanced PrintAreasTab UI

#### **New Features**:

**a) View-Based Editor (not image-based)**
```typescript
// Instead of:
const [currentImageIndex, setCurrentImageIndex] = useState(0);

// Use:
const [selectedView, setSelectedView] = useState<'front' | 'back' | 'side'>('front');
```

**b) View Selector Tabs**
```tsx
<Tabs value={selectedView} onValueChange={setSelectedView}>
  <TabsList>
    <TabsTrigger value="front">Front</TabsTrigger>
    <TabsTrigger value="back">Back</TabsTrigger>
    <TabsTrigger value="side">Side</TabsTrigger>
  </TabsList>
</Tabs>
```

**c) Mockup Image Selector**
```tsx
<Select value={mockupUrl} onValueChange={setMockupUrl}>
  <SelectTrigger>Select Mockup for {selectedView}</SelectTrigger>
  <SelectContent>
    {formData.images.map(img => (
      <SelectItem value={img}>Image {index + 1}</SelectItem>
    ))}
    {Object.entries(formData.colorMockups).map(([color, views]) => (
      views[selectedView] && (
        <SelectItem value={views[selectedView]!}>
          {color} - {selectedView}
        </SelectItem>
      )
    ))}
  </SelectContent>
</Select>
```

**d) Multiple Print Areas Per View**
```tsx
{viewPrintAreas.map((area, idx) => (
  <div key={area.id} className="print-area-box" style={{...}}>
    {/* Draggable/resizable box */}
  </div>
))}

<Button onClick={addPrintAreaToView}>
  + Add Another Area to {selectedView}
</Button>
```

**e) Coordinate Display (Both Units)**
```tsx
<div className="coordinate-display">
  <div>
    <span>Percentage:</span>
    <span>{area.x.toFixed(1)}%, {area.y.toFixed(1)}%</span>
    <span>{area.width.toFixed(1)}% × {area.height.toFixed(1)}%</span>
  </div>
  <div>
    <span>Pixels (at {referenceMockupWidth}×{referenceMockupHeight}):</span>
    <span>{area.pixelX}px, {area.pixelY}px</span>
    <span>{area.pixelWidth}px × {area.pixelHeight}px</span>
  </div>
</div>
```

**f) Real Save Functionality**
```typescript
const savePrintArea = (area: PrintArea) => {
  setFormData(prev => {
    const existingIndex = prev.printAreas.findIndex(pa => pa.id === area.id);
    
    if (existingIndex >= 0) {
      // Update existing
      return {
        ...prev,
        printAreas: prev.printAreas.map((pa, idx) => 
          idx === existingIndex ? area : pa
        ),
      };
    } else {
      // Add new
      return {
        ...prev,
        printAreas: [...prev.printAreas, area],
      };
    }
  });
  
  alert(`✓ Print area "${area.name}" saved for ${area.view} view!`);
};
```

---

### 4. Improved Drag/Resize Logic

**Current Issues**:
- Mouse delta accumulates incorrectly
- Boundary checks don't prevent overflow
- No snap-to-grid option

**Proposed Fix**:
```typescript
const handleMouseMove = (e: React.MouseEvent) => {
  if (!activePrintArea) return;
  
  const container = e.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  
  // Calculate NEW position (not delta)
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const newXPct = (mouseX / rect.width) * 100;
  const newYPct = (mouseY / rect.height) * 100;
  
  if (dragging) {
    const offsetX = newXPct - dragStartOffset.x;
    const offsetY = newYPct - dragStartOffset.y;
    
    // Constrain within bounds
    const finalX = Math.max(0, Math.min(100 - activePrintArea.width, offsetX));
    const finalY = Math.max(0, Math.min(100 - activePrintArea.height, offsetY));
    
    updatePrintArea(activePrintArea.id, { x: finalX, y: finalY });
  } else if (resizing) {
    // Similar logic but for width/height
    // ...
  }
};
```

**Snap to Grid**:
```typescript
const snapToGrid = (value: number, gridSize: number = 5) => {
  return Math.round(value / gridSize) * gridSize;
};
```

---

### 5. Enhanced BespokeCustomizer Integration

#### **a) Strict View-Based Print Area Lookup**
```typescript
const activeViewPrintArea = useMemo(() => {
  if (!activeTemplate?.printAreas || !selectedView) return null;
  
  // Find print area for current view
  const found = activeTemplate.printAreas.find((area: PrintArea) => 
    area.view === selectedView.toLowerCase()
  );
  
  if (!found) {
    console.warn(`[BespokeCustomizer] No print area defined for view: ${selectedView}`);
    return null;
  }
  
  return found;
}, [activeTemplate, selectedView]);
```

#### **b) No Fallback - Disable Canvas If No Print Area**
```typescript
if (!activeViewPrintArea) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-2" />
        <p className="font-bold">No print area defined for {selectedView} view</p>
        <p className="text-sm text-gray-600">Contact admin to set up customization area</p>
      </div>
    </div>
  );
}
```

#### **c) Enforce Canvas Object Boundaries**
```typescript
const enforceCanvasBoundaries = (obj: fabric.Object) => {
  if (!activeViewPrintArea) return;
  
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  
  // Get object bounds
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
};

// Apply on object move
canvas.on('object:moving', (e) => {
  if (e.target) enforceCanvasBoundaries(e.target);
});

// Apply on object scale
canvas.on('object:scaling', (e) => {
  if (e.target) enforceCanvasBoundaries(e.target);
});
```

#### **d) Pixel-Perfect Canvas Sizing**
```typescript
const getPrintAreaStyle = () => {
  if (!activeViewPrintArea) return {};
  
  // Use percentages for positioning (responsive)
  return {
    left: `${activeViewPrintArea.x}%`,
    top: `${activeViewPrintArea.y}%`,
    width: `${activeViewPrintArea.width}%`,
    height: `${activeViewPrintArea.height}%`,
  };
};

// Inside Fabric canvas init:
const initCanvas = () => {
  const printArea = printAreaRef.current;
  if (!printArea) return;
  
  const rect = printArea.getBoundingClientRect();
  
  // If pixel dimensions available, scale canvas accordingly
  if (activeViewPrintArea?.pixelWidth && activeViewPrintArea?.pixelHeight) {
    const aspectRatio = activeViewPrintArea.pixelWidth / activeViewPrintArea.pixelHeight;
    const containerAspect = rect.width / rect.height;
    
    // Adjust canvas to maintain print area aspect ratio
    // ...
  }
  
  canvas.setDimensions({
    width: rect.width,
    height: rect.height,
  });
};
```

---

## 🎨 UI/UX Mockup

### Admin PrintAreasTab Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│ PRINT AREAS TAB                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Select View:  [Front] [Back] [Side] [Sleeve Left] [Sleeve Right] │
│                 ^^^                                             │
│                                                                 │
│ Mockup for Front View:                                          │
│ [Dropdown: Select mockup image or color-specific mockup]       │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │                                                           │ │
│ │    [Mockup Image - Front View]                           │ │
│ │                                                           │ │
│ │           ┌─────────────────────┐                        │ │
│ │           │  Draggable Box      │  ← Print Area          │ │
│ │           │  50% × 60%          │                        │ │
│ │           │  [Move icon]        │                        │ │
│ │           └─────────────────────┘                        │ │
│ │                                                           │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Print Area: "Front Chest Design"                               │
│ Position: X: 25.0%, Y: 20.0%                                   │
│ Size: 50.0% × 60.0%                                             │
│ Pixels (at 1000×1000): 250px, 200px | 500px × 600px            │
│                                                                 │
│ [✓ Save Print Area]  [+ Add Another Area]  [Delete]           │
│                                                                 │
│ ──────────────────────────────────────────────────────────── │
│                                                                 │
│ All Print Areas (3):                                            │
│ • Front Chest Design (front) - 50% × 60%          [Edit] [Del] │
│ • Back Upper Design (back) - 60% × 70%            [Edit] [Del] │
│ • Sleeve Left Pocket (sleeve_left) - 20% × 30%    [Edit] [Del] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation Phases

### **Phase 1: Enhanced Data Structure** (1-2 hours)
- [ ] Update `PrintArea` interface in `useTemplateForm.ts`
- [ ] Add `id`, `view`, `pixelX/Y/Width/Height`, `referenceMockup*` fields
- [ ] Keep backwards compatibility with existing data
- [ ] Update `toPrintifyCatalogRow` and `mapPrintifyCatalogRow` (no changes needed - JSONB flexible)

### **Phase 2: View-Based UI** (2-3 hours)
- [ ] Replace `currentImageIndex` with `selectedView` state
- [ ] Add View Selector tabs (Front/Back/Side/etc.)
- [ ] Add Mockup Image dropdown (selects from general images + color mockups)
- [ ] Update drag/resize logic to work with selected view
- [ ] Add "Add Another Area" button for multiple areas per view

### **Phase 3: Dual-Unit Coordinates** (1-2 hours)
- [ ] Calculate pixel coordinates from percentages + mockup dimensions
- [ ] Display both percentage and pixel coordinates in UI
- [ ] Store both in print area object
- [ ] Add reference mockup dimensions to print area

### **Phase 4: Save Functionality** (1 hour)
- [ ] Implement `savePrintArea()` function
- [ ] Update or add print area in `formData.printAreas` array
- [ ] Remove mock alert, show real success message
- [ ] Add validation (name required, coordinates in bounds)

### **Phase 5: BespokeCustomizer Integration** (2-3 hours)
- [ ] Update `activeViewPrintArea` lookup to use `view` field
- [ ] Remove fallback logic - show error if no print area
- [ ] Implement `enforceCanvasBoundaries()` function
- [ ] Add Fabric.js event listeners (object:moving, object:scaling)
- [ ] Test boundary enforcement with drag/resize

### **Phase 6: Testing & Polish** (1-2 hours)
- [ ] Test creating print areas for all views
- [ ] Test multiple print areas per view
- [ ] Test saving and reloading template
- [ ] Test storefront boundary enforcement
- [ ] Add snap-to-grid option
- [ ] Add keyboard shortcuts (arrow keys to nudge)

**Total Estimated Time**: 8-13 hours

---

## 🧪 Testing Checklist

### Admin Dashboard:
- [ ] Create print area for Front view
- [ ] Drag to reposition - coordinates update smoothly
- [ ] Resize using corner handles - dimensions update
- [ ] Save print area - success message appears
- [ ] Switch to Back view - canvas clears, ready for new area
- [ ] Add multiple print areas to same view
- [ ] Delete a print area
- [ ] Reload template - print areas load correctly

### Storefront:
- [ ] Select Front view - print area boundaries show
- [ ] Add text object - drag within bounds (works)
- [ ] Try to drag text outside bounds - snaps back (enforced)
- [ ] Upload image - resize to fill area (constrained)
- [ ] Switch to Back view - different print area loads
- [ ] Try to drag design outside Back area - snaps back

---

## 🚨 Potential Issues & Mitigations

### Issue 1: Mockup Aspect Ratios
**Problem**: Different mockup images have different aspect ratios (portrait vs landscape)

**Solution**: Store reference mockup dimensions with each print area:
```typescript
{
  referenceMockupWidth: 1000,
  referenceMockupHeight: 1200,
  referenceMockupUrl: "https://..."
}
```

When converting percentage → pixels, use the reference dimensions:
```typescript
const pixelX = (x / 100) * referenceMockupWidth;
```

---

### Issue 2: Backwards Compatibility
**Problem**: Existing templates have old print area structure

**Solution**: Migration function in `mapPrintifyCatalogRow()`:
```typescript
const migrateOldPrintArea = (oldArea: any): PrintArea => {
  return {
    id: oldArea.id || `pa_${oldArea.position || 'front'}_${Date.now()}`,
    name: oldArea.name || `${oldArea.position || 'front'} Area`,
    view: oldArea.position || 'front',
    position: oldArea.position, // Keep for compat
    x: oldArea.x || 25,
    y: oldArea.y || 20,
    width: oldArea.width || 50,
    height: oldArea.height || 60,
    dpi: oldArea.dpi || 300,
  };
};
```

---

### Issue 3: Multiple Mockups Per View
**Problem**: Front view might have multiple mockup options (color-specific)

**Solution**: Dropdown to select which mockup to use as reference:
```tsx
<Select value={activeMockupUrl}>
  <SelectOption value={generalImage}>General Image</SelectOption>
  <SelectOption value={blackFrontUrl}>Black - Front</SelectOption>
  <SelectOption value={whiteFrontUrl}>White - Front</SelectOption>
</Select>
```

Print area coordinates stay the same (percentages), but reference URL changes.

---

### Issue 4: Fabric.js Canvas Initialization
**Problem**: Fabric canvas might not initialize if no print area defined

**Solution**: Show placeholder message instead of canvas:
```tsx
{!activeViewPrintArea ? (
  <EmptyState message="Define a print area first" />
) : (
  <FabricCanvas printArea={activeViewPrintArea} />
)}
```

---

## 🎯 Success Criteria

### Admin Dashboard:
✅ Admin can visually define print areas for each view (Front/Back/Side)  
✅ Drag/resize works smoothly without glitches  
✅ Coordinates display in both percentages and pixels  
✅ Multiple print areas per view supported  
✅ Save functionality works - data persists to database  
✅ Editing existing template loads print areas correctly  

### Storefront:
✅ Canvas boundaries match admin-defined print areas exactly  
✅ Objects cannot be dragged outside boundaries  
✅ Objects snap back if user tries to exceed boundaries  
✅ Switching views loads correct print area  
✅ Error message shows if no print area defined  

---

## 📝 Summary

**This plan transforms PrintAreasTab from a basic prototype into a production-ready Visual Canvas Editor Tool.**

**Key Improvements**:
1. **View-based** (not image-index-based) architecture
2. **Dual-unit coordinates** (percentages + pixels)
3. **Multiple areas per view** support
4. **Strict boundary enforcement** in storefront
5. **Real save functionality** (not just alerts)

**No breaking changes** - fully backwards compatible with existing templates.

**Ready to implement?** Let me know and I'll proceed with Phase 1!

---

**Status**: 📋 **PLANNING COMPLETE - AWAITING APPROVAL**  
**Estimated Time**: 8-13 hours  
**Risk Level**: Medium (Fabric.js boundary logic needs testing)  
**Impact**: High (unlocks precise customization control)

---

**Prepared by**: Kiro AI Assistant  
**Date**: June 19, 2026
