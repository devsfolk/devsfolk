# Template Management System - Ready for Testing

## ✅ COMPLETED TASKS

### 1. Database Migration
- **File**: `database-migrations/002_add_templates_blueprint_id.sql`
- **Status**: Ready to execute in Supabase
- **Action Required**: Run the following SQL in Supabase SQL Editor:
  ```sql
  ALTER TABLE templates ADD COLUMN IF NOT EXISTS blueprint_id INTEGER NULL;
  CREATE INDEX IF NOT EXISTS idx_templates_blueprint_id ON templates(blueprint_id);
  ```

### 2. Backend API
- **File**: `api/printify/blueprint-search.ts`
- **Status**: ✅ Complete
- **Features**: Live search Printify catalog, debounced, returns max 20 results

### 3. Frontend Components (All Complete)
- ✅ `src/hooks/useTemplateForm.ts` - Form state management
- ✅ `src/components/printify/BlueprintSearch.tsx` - Live blueprint search with dropdown
- ✅ `src/components/printify/tabs/DisplayTab.tsx` - Title, description, images, colors, blueprint search
- ✅ `src/components/printify/tabs/PricesTab.tsx` - Size-based pricing with margins
- ✅ `src/components/printify/tabs/PrintAreasTab.tsx` - Canvas coordinates configuration
- ✅ `src/components/printify/tabs/GeneratorTab.tsx` - Two-layer colorization engine
- ✅ `src/components/printify/TemplateEditor.tsx` - Main wrapper with tabs

### 4. Integration
- ✅ `src/pages/dashboard/PrintifySettings.tsx` - Fully integrated
  - Template Editor dialog added
  - State management in place
  - Template Management card in Editor tab

### 5. Build Verification
- ✅ Build completed successfully (no TypeScript errors)
- ✅ All imports resolved
- ✅ No compilation warnings

---

## 📋 TESTING CHECKLIST

### Before Testing
1. **Execute Database Migration**:
   - Go to Supabase Dashboard → SQL Editor
   - Run migration from `database-migrations/002_add_templates_blueprint_id.sql`
   - Verify column added: `SELECT blueprint_id FROM templates LIMIT 1;`

### Test Scenarios

#### A. Blueprint Search
1. Navigate to Dashboard > Printify > Editor
2. Click "Create New Template" button
3. In Display tab, type a product name (e.g., "t-shirt", "hoodie")
4. Verify dropdown shows results with Blueprint ID + Title
5. Select a blueprint → verify Blueprint ID auto-fills

#### B. Sync from Printify
1. After selecting a blueprint, click "Sync from Printify" button
2. Verify success message
3. Check that these fields auto-populate:
   - Title
   - Description (if available)
   - Images
   - Sizes (in Prices tab)
   - Print Areas (in Print Areas tab)

#### C. Manual Template Creation
1. Create template without Blueprint ID
2. Manually enter all fields:
   - Display: title, description, upload images, select colors
   - Prices: add sizes, set base costs and selling prices
   - Print Areas: add print area coordinates
   - Generator: configure colorization (optional)
3. Click "Publish Template"
4. Verify template saves successfully

#### D. Template Editing
1. Find an existing template in the catalog
2. Click Edit button
3. Modify fields in any tab
4. Click "Update Template"
5. Verify changes persist

#### E. Four Tab Functionality
1. **Display Tab**:
   - Blueprint ID search and selection
   - Title and description fields
   - Image upload/URL paste
   - Color picker (multi-select)

2. **Prices Tab**:
   - Add/remove sizes
   - Set base cost (from Printify or manual)
   - Set selling price
   - View margin calculation

3. **Print Areas Tab**:
   - Add/remove print areas
   - Name and position fields
   - X/Y coordinates
   - Width/height dimensions
   - DPI setting

4. **Generator Tab**:
   - Enable colorization toggle
   - Base image URL
   - Mask image URL (transparent overlay)
   - Preview description

#### F. Publish to Storefront
1. After publishing template, go to Storefront
2. Navigate to custom product editor
3. Verify new template appears in template selection
4. Test template in editor with customer flow

---

## 🔍 VERIFICATION POINTS

### Database
- [ ] Migration executed successfully
- [ ] `blueprint_id` column exists in `templates` table
- [ ] Index created on `blueprint_id`

### Blueprint Search
- [ ] Search input is responsive
- [ ] Dropdown shows results
- [ ] Blueprint ID auto-fills on selection
- [ ] Search handles no results gracefully

### Sync Logic
- [ ] Sync button disabled when no Blueprint ID
- [ ] Toast notification shows when sync fails
- [ ] Auto-population works for all fields
- [ ] Manual override preserves custom values

### Pricing
- [ ] Base cost displays correctly
- [ ] Selling price editable
- [ ] Margin calculation accurate
- [ ] Per-size pricing supported

### Print Areas
- [ ] Coordinate system logical
- [ ] DPI defaults to 300
- [ ] Multiple print areas supported

### Generator
- [ ] Two-layer approach documented
- [ ] Base image + mask overlay concept clear
- [ ] Colorization toggle functional

### Publishing
- [ ] Template saves to database
- [ ] Template appears in storefront editor immediately
- [ ] Published templates have correct status
- [ ] Template images render correctly

---

## 🐛 KNOWN ISSUES TO MONITOR

1. **Base Cost Display**: Previous sessions showed base cost = 0 issue. Verify that:
   - Printify API returns cost correctly (check network tab)
   - Cost stored correctly in database
   - Cost displayed correctly in admin UI
   - No hardcoded fallbacks overwrite actual cost

2. **Image Mapping**: Verify variant-specific images load correctly

3. **Mobile Responsiveness**: Template editor dialog should work on mobile (though per AGENTS.md, mobile layouts are locked)

---

## 📂 FILE LOCATIONS

### Database
- `database-migrations/002_add_templates_blueprint_id.sql`

### Backend API
- `api/printify/blueprint-search.ts`

### Frontend Components
- `src/hooks/useTemplateForm.ts`
- `src/components/printify/BlueprintSearch.tsx`
- `src/components/printify/tabs/DisplayTab.tsx`
- `src/components/printify/tabs/PricesTab.tsx`
- `src/components/printify/tabs/PrintAreasTab.tsx`
- `src/components/printify/tabs/GeneratorTab.tsx`
- `src/components/printify/TemplateEditor.tsx`

### Integration
- `src/pages/dashboard/PrintifySettings.tsx`

---

## 🚀 NEXT STEPS

1. **Execute database migration** (5 minutes)
2. **Deploy build to test environment** (if not testing locally)
3. **Run through test checklist** (30 minutes)
4. **Report any issues found** for immediate fix
5. **If all tests pass** → merge to main and deploy to production

---

## 💡 NOTES

- Template system supports **hybrid approach**: pure manual OR Printify sync
- Blueprint ID is **nullable** by design (allows local custom vendors)
- Generator tab uses **two-layer colorization**: base color div + transparent mask PNG overlay
- All pricing in **dollars** (Printify API returns cents, converted automatically)
- Print areas use **canvas coordinate system** (X/Y/Width/Height/DPI)
- Sync preserves **manual overrides** (admin can tweak any auto-filled value)

---

**Build Status**: ✅ Successful (1m 32s, no errors)
**TypeScript Errors**: None
**Branch**: `fix/printify-fulfillment-POF-001`
**Ready for Testing**: YES
