# 🎨 Premium Print Area Editor - UX Blueprint

**Date**: June 19, 2026  
**Design System**: Split-Screen Professional Tool

---

## 🖼️ Full Layout Blueprint

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Templates          PRINT AREA VISUAL EDITOR          [Save Template] │
│  Product: Premium Cotton T-Shirt • Blueprint ID: 123                           │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  VISUAL CANVAS AREA (65%)            │  CONTROL SIDEBAR (35%)                  │
│                                      │                                         │
│  ┌────────────────────────────────┐  │  ╔═══════════════════════════════════╗ │
│  │                                │  │  ║  VIEW SELECTOR                    ║ │
│  │                                │  │  ╠═══════════════════════════════════╣ │
│  │         MOCKUP IMAGE           │  │  ║  [■ FRONT] [BACK] [LEFT] [RIGHT] ║ │
│  │       (Full Container)         │  │  ╚═══════════════════════════════════╝ │
│  │                                │  │                                         │
│  │    ┏━━━━━━━━━━━━━━━━━━━┓       │  │  ┌───────────────────────────────────┐ │
│  │    ┃  PRINT AREA BOX   ┃ [🗑️]  │  │  │ COLOR PREVIEW (Auto-Apply)        │ │
│  │    ┃                   ┃       │  │  │ ┌──┐┌──┐┌──┐┌──┐┌──┐             │ │
│  │ [◉]┃  Front Design     ┃[◉]    │  │  │ │⬛││⬜││🟦││🟥││🟩│ +7 more       │ │
│  │    ┃  Area 1           ┃       │  │  │ └──┘└──┘└──┘└──┘└──┘             │ │
│  │    ┃                   ┃       │  │  │ Selected: Black (applies to all)  │ │
│  │    ┗━━━━━━━━━━━━━━━━━━━┛       │  │  └───────────────────────────────────┘ │
│  │           [⌖ SE]               │  │                                         │
│  │                                │  │  ┌───────────────────────────────────┐ │
│  │  50.0% × 60.0%                 │  │  │ ACTIVE PRINT AREA                 │ │
│  │  Position: 25%, 20%            │  │  ├───────────────────────────────────┤ │
│  │                                │  │  │ Name:                             │ │
│  │                                │  │  │ [Front Design Area 1_________]    │ │
│  │                                │  │  │                                   │ │
│  │                                │  │  │ COORDINATES                       │ │
│  │                                │  │  │ ┌─────────────┬─────────────┐     │ │
│  │                                │  │  │ │ Percentage  │  Pixel       │     │ │
│  │                                │  │  │ ├─────────────┼─────────────┤     │ │
│  └────────────────────────────────┘  │  │ │ X: 25.0%    │  250px      │     │ │
│                                      │  │  │ Y: 20.0%    │  240px      │     │ │
│  ┌──────────────────────────────┐   │  │  │ W: 50.0%    │  500px      │     │ │
│  │ [+ Add Print Area] [Delete]  │   │  │  │ H: 60.0%    │  720px      │     │ │
│  └──────────────────────────────┘   │  │  │ └─────────────┴─────────────┘     │ │
│                                      │  │  │ at 1000×1200 mockup               │ │
│                                      │  │  └───────────────────────────────────┘ │
│                                      │  │                                         │
│                                      │  │  ┌───────────────────────────────────┐ │
│                                      │  │  │ FINE-TUNE ADJUSTMENTS             │ │
│                                      │  │  ├───────────────────────────────────┤ │
│                                      │  │  │ Position                          │ │
│                                      │  │  │ X: [25.0%▼] Y: [20.0%▼]          │ │
│                                      │  │  │                                   │ │
│                                      │  │  │ Size                              │ │
│                                      │  │  │ W: [50.0%▼] H: [60.0%▼]          │ │
│                                      │  │  │                                   │ │
│                                      │  │  │ [🔒 Lock Aspect Ratio]            │ │
│                                      │  │  └───────────────────────────────────┘ │
│                                      │  │                                         │
│                                      │  │  ┌───────────────────────────────────┐ │
│                                      │  │  │ ALL PRINT AREAS (1)               │ │
│                                      │  │  ├───────────────────────────────────┤ │
│                                      │  │  │ ■ Front Design Area 1             │ │
│                                      │  │  │   Front • 50×60% • Active         │ │
│                                      │  │  └───────────────────────────────────┘ │
│                                      │  │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 🎯 Key Visual Elements Breakdown

### Left Side: Visual Canvas (65% Width)

#### Canvas Container
```
Properties:
- Width: 65% of viewport width
- Height: calc(100vh - 200px) [full viewport minus header/padding]
- Background: Linear gradient from gray-50 to gray-100
- Border: 2px solid with subtle shadow
- Border Radius: 16px (rounded-2xl)
- Overflow: Hidden (no scrollbars)
```

#### Mockup Image
```
Properties:
- Position: Absolute, inset-0
- Width: 100%
- Height: 100%
- Object-Fit: Contain (maintains aspect ratio)
- Pointer Events: None (doesn't block drag events)
- Filter: Drop shadow for depth
```

#### Print Area Bounding Box (Active)
```
Properties:
- Position: Absolute (percentage-based)
- Border: 4px solid blue-500 (active) or gray-400 (inactive)
- Background: blue-500/10 (active) or transparent (inactive)
- Cursor: Move
- Box Shadow: 0 4px 12px rgba(59, 130, 246, 0.3)
- Transition: All 200ms ease

Child Elements:
- Corner Handles: 8 total (4 corners + 4 midpoints)
  - Size: 12px × 12px
  - Shape: Circle
  - Color: White background, blue border
  - Position: Absolute, centered on edge
  - Cursor: Directional resize cursors (nw-resize, ne-resize, etc.)
  - Hover Effect: Scale(1.3)

- Floating Trash Icon:
  - Position: Absolute, top -32px, right 0
  - Size: 32px × 32px
  - Background: Red-500
  - Icon: Trash2 (Lucide)
  - Hover: Red-600 + scale(1.1)
  - Visible: Only when box is active

- Center Move Icon:
  - Position: Absolute, centered
  - Size: 40px × 40px
  - Background: Blue-500 (active) or gray-500 (inactive)
  - Icon: Move (Lucide)
  - Opacity: 0.9
  - Pointer Events: None

- Top Label (Name):
  - Position: Absolute, top -36px, left 0
  - Background: Blue-500 (active) or gray-500 (inactive)
  - Text: White, 10px, bold uppercase
  - Padding: 6px 12px
  - Border Radius: 6px
  - Max Width: 180px (truncate with ellipsis)

- Bottom Label (Dimensions):
  - Position: Absolute, bottom -36px, left 0
  - Background: Blue-500 (active) or gray-500 (inactive)
  - Text: White, 9px, bold
  - Content: "50.0% × 60.0%"
  - Padding: 4px 10px
  - Border Radius: 6px
```

#### Bottom Toolbar
```
Layout:
- Position: Below canvas
- Margin Top: 12px
- Display: Flex, gap 8px

Buttons:
- [+ Add Print Area]: Primary button (green-600)
- [Delete]: Destructive button (red-600)
- Height: 44px
- Font: 10px, bold uppercase
- Border Radius: 12px
```

---

### Right Side: Control Sidebar (35% Width)

#### Container
```
Properties:
- Width: 35% of viewport width
- Height: calc(100vh - 200px)
- Overflow Y: Auto (scrollable if needed)
- Padding: 0
- Gap: 16px between sections
- Position: Sticky (stays in view)
```

#### Section 1: View Selector
```
Component: Tabs (shadcn/ui)
Layout:
- Grid: 4 columns (equal width)
- Height: 44px
- Gap: 0 (connected buttons)

Tab Button:
- Text: "FRONT", "BACK", "LEFT", "RIGHT"
- Font: 10px, bold uppercase
- Active State: Blue-500 background, white text
- Inactive State: Gray-200 background, gray-700 text
- Border Radius: Top left/right for outer tabs
- Transition: Background 200ms
```

#### Section 2: Color Preview Selector
```
Layout:
- Border: 1px solid gray-200
- Border Radius: 12px
- Padding: 12px
- Background: White

Header:
- Text: "COLOR PREVIEW (Auto-Apply)"
- Font: 8px, bold uppercase
- Color: Gray-500

Color Swatches:
- Display: Grid, 5 columns
- Gap: 8px
- Each Swatch:
  - Size: 48px × 48px
  - Border: 2px solid (gray-300 inactive, blue-500 active)
  - Border Radius: 8px
  - Background: Actual color or mockup thumbnail
  - Cursor: Pointer
  - Hover: Scale(1.05) + shadow
  - Active: Border blue-500 + checkmark overlay

Overflow Text:
- Text: "+ 7 more"
- Font: 9px
- Color: Gray-600
- Cursor: Pointer (opens modal with all colors)

Selected Display:
- Text: "Selected: Black (applies to all)"
- Font: 9px
- Color: Gray-600
- Margin Top: 8px
```

#### Section 3: Active Print Area Card
```
Layout:
- Border: 2px solid blue-200
- Border Radius: 12px
- Padding: 16px
- Background: Blue-50

Name Input:
- Label: Hidden (placeholder only)
- Input: Text field, full width
- Height: 36px
- Font: 11px, bold
- Border: 1px solid blue-300
- Border Radius: 8px
- Placeholder: "Print area name"

Coordinates Table:
- Border: 1px solid blue-200
- Border Radius: 8px
- Margin Top: 12px

Table Layout:
┌──────────────┬──────────────┐
│ Percentage   │ Pixel        │
├──────────────┼──────────────┤
│ X: 25.0%     │ 250px        │
│ Y: 20.0%     │ 240px        │
│ W: 50.0%     │ 500px        │
│ H: 60.0%     │ 720px        │
└──────────────┴──────────────┘

- Font: 9px
- Percentage Column: Blue text (primary)
- Pixel Column: Green text (calculated)
- Row Height: 28px
- Padding: 8px

Reference Text:
- Text: "at 1000×1200 mockup"
- Font: 8px
- Color: Blue-600
- Margin Top: 4px
```

#### Section 4: Fine-Tune Adjustments
```
Layout:
- Border: 1px solid gray-200
- Border Radius: 12px
- Padding: 12px
- Background: White

Position Row:
- Label: "Position" (8px, uppercase, gray-500)
- Inputs: X and Y side-by-side
- Width: 50% each with 8px gap
- Height: 36px
- Type: Number input with stepper
- Suffix: "%" visible inside input
- Step: 0.1
- Min: 0, Max: 100

Size Row:
- Label: "Size" (8px, uppercase, gray-500)
- Inputs: W and H side-by-side
- Width: 50% each with 8px gap
- Height: 36px
- Type: Number input with stepper
- Suffix: "%" visible inside input
- Step: 0.1
- Min: 10, Max: 100

Lock Aspect Ratio:
- Component: Checkbox with label
- Icon: Lock (Lucide)
- Text: "Lock Aspect Ratio"
- Font: 9px
- Margin Top: 8px
```

#### Section 5: All Print Areas List
```
Layout:
- Border: 1px solid gray-200
- Border Radius: 12px
- Padding: 12px
- Background: White
- Max Height: 200px
- Overflow Y: Auto

Header:
- Text: "ALL PRINT AREAS (1)"
- Font: 8px, bold uppercase
- Color: Gray-500
- Margin Bottom: 8px

List Item (Active):
- Border: 2px solid blue-500
- Background: Blue-50
- Border Radius: 8px
- Padding: 12px
- Margin Bottom: 8px
- Cursor: Pointer

List Item (Inactive):
- Border: 1px solid gray-200
- Background: Gray-50
- Border Radius: 8px
- Padding: 12px
- Margin Bottom: 8px
- Cursor: Pointer
- Hover: Border blue-300

Item Content:
- Primary Text: Area name (11px, bold, black)
- Secondary Text: "Front • 50×60% • Active" (9px, gray-600)
- Active Badge: "ACTIVE" label (8px, blue-500 bg, white text)
```

---

## 🎨 Color Palette

### Primary Colors
- **Blue-500**: #3B82F6 (Active elements)
- **Blue-50**: #EFF6FF (Active backgrounds)
- **Blue-200**: #BFDBFE (Borders)
- **Gray-500**: #6B7280 (Inactive elements)
- **Gray-50**: #F9FAFB (Inactive backgrounds)
- **Gray-200**: #E5E7EB (Borders)

### Accent Colors
- **Green-600**: #16A34A (Success, add button)
- **Red-600**: #DC2626 (Delete, destructive)
- **Green-700**: #15803D (Pixel coordinates)
- **Blue-600**: #2563EB (Percentage coordinates)

### Background Gradients
- **Canvas**: `linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)`
- **Sidebar**: `#FFFFFF` (solid white)

---

## 🔤 Typography

### Font Family
- **Primary**: Inter (system font fallback)
- **Monospace**: Consolas, Monaco (for coordinates)

### Font Sizes
- **8px**: Labels, secondary text, badges
- **9px**: Coordinate values, metadata
- **10px**: Buttons, tabs, primary labels
- **11px**: Input fields, area names
- **12px**: Section headers

### Font Weights
- **400**: Regular text
- **600**: Bold text
- **800**: Black (uppercase labels only)

---

## ⚡ Interactions & Animations

### Drag Print Area
```
Trigger: mousedown on print area box (not on handles)
State: Cursor changes to "grabbing"
Visual: Box opacity 0.9, shadow increases
Update: Position updates in real-time (no lag)
Constraint: Cannot drag outside canvas bounds
Feedback: Coordinates update in sidebar live
```

### Resize Print Area
```
Trigger: mousedown on corner/edge handle
State: Cursor changes to directional resize (nw-resize, etc.)
Visual: Handle scales to 1.3x, active border thickens
Update: Size updates in real-time (smooth, no jumping)
Constraint: Min size 10%, max size 100% minus position
Feedback: Dimensions update in sidebar live
```

### Hover States
```
Inactive Print Area Box:
- Hover: Border changes from gray-400 to blue-400
- Transition: 200ms ease

Corner Handles:
- Hover: Scale from 1.0 to 1.3, shadow appears
- Transition: 150ms ease

Buttons:
- Hover: Background darkens 10%, scale 1.02
- Transition: 150ms ease

Color Swatches:
- Hover: Scale 1.05, shadow appears
- Transition: 150ms ease
```

### Click Feedback
```
Print Area Box:
- Click: Becomes active (blue border)
- Animation: Border color transition 200ms
- Sidebar: Active area section highlights

Buttons:
- Click: Scale 0.98 for 100ms (press effect)
- Sound: Optional subtle click sound

Tab Switch:
- Click: Active state moves to new tab
- Animation: Background slide transition 200ms
```

---

## 📐 Responsive Behavior

### Desktop (1920px+)
- Canvas: 1248px wide (65%)
- Sidebar: 672px wide (35%)
- Canvas Height: 800-1000px (depends on viewport)

### Laptop (1366px - 1920px)
- Canvas: ~888px wide (65%)
- Sidebar: ~478px wide (35%)
- Canvas Height: 600-800px

### Tablet (768px - 1366px)
- **Layout Changes**: Stack vertically
- Canvas: 100% width, 500px height
- Sidebar: 100% width, below canvas
- Sidebar: No longer sticky

### Mobile (<768px)
- **Not Supported**: Display message
- Text: "Please use a desktop or tablet to configure print areas"
- Alternative: Show read-only view of configured areas

---

## ✅ Accessibility

### Keyboard Navigation
- **Tab**: Move between inputs and buttons
- **Arrow Keys**: Nudge selected print area (1% increments)
- **Shift + Arrow**: Resize selected print area (1% increments)
- **Delete**: Remove active print area
- **Escape**: Deselect active print area
- **Ctrl/Cmd + Z**: Undo (future feature)

### Screen Readers
- All buttons have aria-labels
- Print area boxes have role="region" with descriptive labels
- Coordinate values have proper labels (not just visual)
- Tab navigation follows logical order

### Color Contrast
- All text meets WCAG AA standard (4.5:1 minimum)
- Active states have sufficient contrast
- Focus indicators visible (blue ring)

---

## 🚀 Performance Targets

### Interaction Speed
- **Drag Update**: 60fps (16ms frame time)
- **Resize Update**: 60fps (16ms frame time)
- **Tab Switch**: < 100ms
- **Image Load**: < 500ms (with lazy loading)

### Memory Usage
- **Idle**: < 50MB
- **Active Editing**: < 100MB
- **No Memory Leaks**: Properly cleanup event listeners

---

## 🎯 Implementation Priority

### Phase 1: Critical Layout Fix
1. ✅ Split-screen layout (65/35)
2. ✅ Full-height canvas
3. ✅ Sticky sidebar
4. ✅ Fixed scaling math

### Phase 2: Visual Polish
1. ✅ Premium bounding box design
2. ✅ Corner handles with hover effects
3. ✅ Floating contextual controls
4. ✅ Color preview selector
5. ✅ Smooth animations

### Phase 3: Functional Enhancement
1. ✅ Global 4-view system
2. ✅ Auto-apply to all colors
3. ✅ Fine-tune adjustment inputs
4. ✅ Lock aspect ratio

### Phase 4: Advanced Features
1. ⏳ Undo/redo
2. ⏳ Keyboard shortcuts
3. ⏳ Grid/snap-to-grid
4. ⏳ Templates/presets

---

**This blueprint provides exact specifications for a premium, production-ready print area editor.**

