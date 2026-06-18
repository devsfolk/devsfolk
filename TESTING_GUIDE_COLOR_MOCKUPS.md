# 🧪 Testing Guide: Color-Specific Multi-View Mockups

**Branch**: `feat/printify-enhancements`  
**Commit**: `beb6cbd`  
**Date**: June 18, 2026

---

## 🎯 What to Test

This feature allows admins to upload or specify separate mockup images for each color variant, with support for multiple views (Front/Back/Side).

---

## 🚀 Quick Start

### 1. Deploy to Vercel Preview
The code has been pushed to `feat/printify-enhancements` branch. Vercel should auto-deploy a preview environment.

**Wait for**: Vercel deployment notification (check GitHub PR or Vercel dashboard)

---

## 📋 Pre-Testing Setup

### Step 1: Verify Database Schema
Go to Supabase Dashboard → SQL Editor and run:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'printify_catalog' 
AND column_name = 'color_mockups';
```

**Expected Output**:
```
column_name    | data_type | column_default
color_mockups  | jsonb     | '{}'::jsonb
```

If column doesn't exist, run:
```sql
ALTER TABLE printify_catalog 
ADD COLUMN color_mockups JSONB DEFAULT '{}'::jsonb;
```

---

### Step 2: Create Storage Bucket (Important!)
Go to Supabase Dashboard → Storage → Create Bucket

**Settings**:
- Bucket Name: `product-images`
- Public: **YES** (important for storefront access)
- File Size Limit: 5MB (recommended)
- Allowed MIME types: `image/*`

**Why**: File upload feature requires this bucket. Without it, uploads will fail with error message.

---

## 🎨 Testing Flow: Admin Dashboard

### Test 1: Create New Template with Color Mockups

#### Steps:
1. Go to your deployed URL → Login as admin
2. Navigate to: **Dashboard → Printify → Editor**
3. Click **"Create New Template"**
4. Fill basic info:
   - Blueprint ID: `6` (or any valid Printify blueprint)
   - Title: "Test Color Mockups Template"
   - Description: "Testing color-specific mockup system"
5. Click **"Sync from Printify"** (loads colors/sizes)
6. Go to **"Display"** tab
7. You should see the new UI with color cards

#### Expected UI:
- List of colors (e.g., Black, White, Navy, Army) in expandable cards
- Each card shows:
  - Color preview dot (colored circle)
  - Color name
  - Mockup count badge (initially "0 mockups")
  - **[Add Images]** button
  - **[Delete]** button

---

### Test 2: Add Mockup via URL Paste

#### Steps:
1. Click **[Add Images]** on "Black" color card
2. Card should expand showing 3 sections: Front View, Back View, Side View
3. In **Front View**, paste a Printify mockup URL in the text input
   - Example URL: `https://images-api.printify.com/mockup/6/1/front.jpg`
4. Click outside the input (blur) or press Enter
5. Preview thumbnail should appear below the input

#### Expected Result:
- ✅ Thumbnail shows the mockup image (24x24 size)
- ✅ Remove button (X icon) appears next to thumbnail
- ✅ Mockup count badge updates to "1 mockup"
- ✅ State persists when collapsing/expanding card

#### Try:
- Add Back View and Side View mockups
- Verify mockup count increases to "2 mockups", "3 mockups"
- Click Remove (X) button on a thumbnail
- Verify mockup disappears and count decreases

---

### Test 3: Add Mockup via File Upload

#### Steps:
1. Expand "White" color card
2. In **Front View**, click the **Upload** button (📤 icon)
3. Select an image file from your computer (PNG/JPG)
4. Wait for upload to complete

#### Expected Result:
- ✅ Upload button shows loading spinner during upload
- ✅ Success: Preview thumbnail appears
- ✅ Mockup count badge updates
- ✅ Image is uploaded to Supabase Storage bucket `product-images`
- ✅ Public URL is saved in form state

#### If Error:
- Error message: "Upload failed: Bucket not found"
- **Fix**: Go to Supabase Dashboard → Storage → Create `product-images` bucket
- Retry upload

---

### Test 4: Delete Color

#### Steps:
1. Expand any color card (e.g., "Navy")
2. Add at least one mockup to the color
3. Click **[Delete]** button
4. Confirmation dialog should appear: "Delete 'Navy' and all its mockup images?"
5. Click **OK**

#### Expected Result:
- ✅ Confirmation dialog appears before deletion
- ✅ Color card disappears from list
- ✅ All associated mockups are removed
- ✅ State updates immediately

#### Try:
- Cancel the deletion (click Cancel) - color should remain
- Delete a color without mockups - should work without issues

---

### Test 5: Save Template and Verify Persistence

#### Steps:
1. Add mockups to at least 2 colors (e.g., Black and White)
2. Click **"Publish Template"** button at bottom
3. Wait for success message: "✓ Template published successfully!"
4. Close the dialog
5. **Re-open the same template** for editing (click Edit icon in template list)

#### Expected Result:
- ✅ Template opens with all colors intact
- ✅ Mockup images appear in preview thumbnails
- ✅ Mockup count badges show correct numbers
- ✅ Expand color cards - all mockup URLs are preserved

#### Verify in Supabase:
Go to Supabase Dashboard → Table Editor → `printify_catalog` table

Find your template row and click to view `color_mockups` JSONB column:
```json
{
  "Black": {
    "front": "https://images-api.printify.com/.../black-front.jpg",
    "back": "https://images-api.printify.com/.../black-back.jpg"
  },
  "White": {
    "front": "https://.../supabase.co/storage/.../white-front.png"
  }
}
```

---

### Test 6: Edit Existing Template

#### Steps:
1. Open template created in Test 5
2. Add a new mockup to "Black" (e.g., Side View)
3. Add a new color "Army" with Front View mockup
4. Remove Back View mockup from "Black"
5. Click **"Update Template"**
6. Re-open template

#### Expected Result:
- ✅ Side View added to Black
- ✅ Back View removed from Black
- ✅ Army color added with mockup
- ✅ All changes persist after save/reload

---

### Test 7: Add New Color

#### Steps:
1. At top of Display tab, find "Add Color" input field
2. Type a new color name: "Forest Green"
3. Click **[Add Color]** button (or press Enter)

#### Expected Result:
- ✅ New color card appears at bottom of list
- ✅ Card is auto-expanded
- ✅ Mockup count badge shows "0 mockups"
- ✅ Color preview dot shows calculated hex color (or fallback gray)

#### Try:
- Add duplicate color (e.g., type "Black" again) - should be ignored
- Add empty color name - should be ignored
- Add color with spaces: "Light Blue" - should work

---

## 🐛 Common Issues & Fixes

### Issue 1: "Upload failed: Bucket not found"
**Cause**: Supabase Storage bucket `product-images` doesn't exist

**Fix**:
1. Go to Supabase Dashboard → Storage
2. Click "Create Bucket"
3. Name: `product-images`
4. Public: YES
5. Create bucket
6. Retry upload in admin dashboard

---

### Issue 2: Preview thumbnail shows broken image icon
**Cause**: Invalid URL or CORS issue

**Fix**:
1. Check URL is correct (paste in browser to verify)
2. Ensure Printify URLs are accessible
3. Check browser console for CORS errors
4. For uploaded files: Verify Supabase bucket is Public

---

### Issue 3: Colors not loading when editing template
**Cause**: Old template data doesn't have `colorMockups` field

**Expected Behavior**: Should show empty state ("0 mockups" for all colors)

**Verify**:
- Open browser DevTools → Console
- Check for error messages
- Verify `formData.colorMockups` is an empty object `{}`

---

### Issue 4: Mockup count doesn't update
**Cause**: State update bug

**Fix**:
1. Refresh page (should fix)
2. Check browser console for React warnings
3. If persists: Report with reproduction steps

---

## ✅ Success Checklist

Before approving Phase 1 & 2:

### Database & Types
- [ ] Supabase column `color_mockups` exists
- [ ] Storage bucket `product-images` created
- [ ] Template saves successfully
- [ ] Data persists after reload

### UI/UX
- [ ] Color cards expand/collapse smoothly
- [ ] Mockup count badges update correctly
- [ ] Preview thumbnails appear
- [ ] Remove buttons work
- [ ] Delete color confirmation works
- [ ] Add new color works

### File Upload
- [ ] Upload button shows loading state
- [ ] File uploads to Supabase Storage
- [ ] Public URL generated correctly
- [ ] Error messages appear if upload fails

### Data Flow
- [ ] URL paste saves to state
- [ ] File upload saves to state
- [ ] Publish saves to database
- [ ] Edit loads from database
- [ ] Update saves changes

---

## 📸 Screenshot Guide

### Take screenshots of:
1. **Empty State**: Display tab with no colors
2. **Collapsed Cards**: List of colors with mockup counts
3. **Expanded Card**: Front/Back/Side input fields visible
4. **With Thumbnails**: Mockups visible in preview
5. **Delete Confirmation**: Confirmation dialog
6. **Supabase Data**: JSONB column in table editor

Send screenshots to verify visual design matches requirements.

---

## 🚀 Next: Phase 3 (Storefront Integration)

After Phase 1 & 2 are verified, next step is:

**Connect `colorMockups` data to storefront customizer**

**Location**: `src/components/printify/BespokeCustomizer.tsx`

**Goal**: When user selects a color on storefront, display the correct mockup image

**Implementation**:
```typescript
// Get mockup for selected color + view
const activeMockupUrl = useMemo(() => {
  const colorData = activeTemplate?.colorMockups?.[selectedColor];
  if (!colorData) return defaultMockupUrl;
  
  const view = selectedView.toLowerCase(); // 'front', 'back', 'side'
  return colorData[view] || colorData.front || defaultMockupUrl;
}, [selectedColor, selectedView, activeTemplate]);

// Use in JSX
<img src={activeMockupUrl} alt="Product mockup" />
```

**Testing Flow**:
1. Admin creates template with color mockups
2. Publish template
3. Go to storefront product page
4. Open customizer
5. Select "Black" color → Front mockup shows
6. Select "White" color → White mockup shows
7. Switch to "Back" view → Back mockup shows (if available)

---

## 📞 Support

If any test fails or unexpected behavior occurs:

1. Check browser console for errors
2. Check Supabase logs
3. Verify database schema matches
4. Share screenshots and error messages

---

**Happy Testing! 🎉**

---

**Document Version**: 1.0  
**Last Updated**: June 18, 2026  
**Status**: Ready for UAT
