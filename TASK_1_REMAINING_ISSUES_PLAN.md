# TASK 1 - Remaining Issues Fix Plan

## Issues to Fix

### Issue 1: Print Area Not Using Admin-Defined Boundaries
**Current**: Hardcoded to "front" position only  
**Required**: Use actual print area from `activeTemplate.printAreas` based on selected view

### Issue 2: Abnormal Scaling Behavior
**Current**: Scaling may glitch or not respect boundaries properly  
**Required**: Smooth resize with proper boundary clamping

### Issue 3: Only One Image Visible
**Current**: Shows only one image, no way to switch views  
**Required**: Show all images with view switcher (Front/Back/Side/etc.)

---

## Implementation Plan

### Step 1: Add View/Position State
```typescript
const [selectedView, setSelectedView] = useState<string>('front');
```

### Step 2: Extract Available Views from Template
```typescript
const availableViews = useMemo(() => {
  // Get all unique positions from printAreas
  const printAreas = activeTemplate?.printAreas || [];
  const positions = printAreas.map(area => area.position || 'front');
  return Array.from(new Set(positions));
}, [activeTemplate]);
```

### Step 3: Get Current View's Print Area
```typescript
const activeViewPrintArea = useMemo(() => {
  const printAreas = activeTemplate?.printAreas || [];
  return printAreas.find(area => 
    area.position?.toLowerCase() === selectedView.toLowerCase()
  ) || printAreas[0];
}, [activeTemplate, selectedView]);
```

### Step 4: Get Current View's Image
```typescript
const activeViewImage = useMemo(() => {
  // Map view position to image
  // Front → first image
  // Back → second image
  // etc.
  const viewIndex = availableViews.indexOf(selectedView);
  return activeProduct?.images?.[viewIndex] || activeProduct?.images?.[0];
}, [activeProduct, selectedView, availableViews]);
```

### Step 5: Update getPrintAreaStyle
Use `activeViewPrintArea` instead of hardcoded "front"

### Step 6: Add View Switcher UI
Tabs or buttons to switch between Front/Back/Side/etc.

### Step 7: Per-View Canvas State
Each view needs its own independent design layers:
```typescript
const [canvasStateByView, setCanvasStateByView] = useState<Record<string, any>>({});
```

### Step 8: Fix Boundary Constraint
Update `constrainObjectToBounds` to use actual print area dimensions from `activeViewPrintArea`

---

## Data Structure Expected

### Template Print Areas (from Supabase)
```typescript
template.printAreas = [
  {
    position: 'front',
    width: 1800,  // pixels
    height: 2400,
    top: 10,      // percentage
    left: 25,     // percentage
  },
  {
    position: 'back',
    width: 1800,
    height: 2400,
    top: 10,
    left: 25,
  }
]
```

### Template Images (from Supabase)
```typescript
template.images = [
  'https://.../front.png',
  'https://.../back.png',
  'https://.../side.png'
]
```

---

## Changes Required

### Files to Modify
1. `src/components/printify/BespokeCustomizer.tsx`
   - Add `selectedView` state
   - Add view switcher UI
   - Update `getPrintAreaStyle()` to use selected view
   - Update `getSelectedColorImage` to use selected view
   - Update boundary constraints
   - Add per-view canvas state management

---

## Testing Checklist

After implementation:
- [ ] View switcher shows all available positions (Front/Back/etc.)
- [ ] Clicking view switcher changes the displayed image
- [ ] Each view shows its own independent canvas
- [ ] Print area boundary matches admin settings for that view
- [ ] Design on front doesn't appear on back (independent layers)
- [ ] Resizing feels smooth without glitches
- [ ] Design cannot cross print area boundary
- [ ] Scaling up/down respects boundaries without jumping
