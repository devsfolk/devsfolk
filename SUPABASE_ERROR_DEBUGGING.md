# 🔍 Supabase 400 Error - Debugging Guide

**Date**: June 18, 2026  
**Status**: Comprehensive error logging added  
**Commit**: `f45e864`  
**Issue**: 400 Bad Request when saving color_mockups to Supabase

---

## 🚨 Current Error

```
POST https://ugjfraeycxfpmsxvrfgo.supabase.co/rest/v1/printify_catalog?... 400 (Bad Request)
```

**When**: Attempting to save/update template with color mockups  
**Where**: `ShopContext.tsx` → `upsertPrintifyCatalogTemplates()` → `supabase.from('printify_catalog').upsert()`

---

## ✅ Fixes Applied

### 1. Comprehensive Error Logging
**Location**: `src/context/ShopContext.tsx` - Line ~1540

**Added Logs**:
```typescript
console.log('[Supabase Upsert] Sending payload:', catalogRows.length, 'templates');
console.log('[Supabase Upsert] Sample payload:', catalogRows[0]);

const { error } = await supabase.from('printify_catalog').upsert(catalogRows);
if (error) {
  console.error('[Supabase Upsert Error] Full error object:', error);
  console.error('[Supabase Upsert Error] Message:', error.message);
  console.error('[Supabase Upsert Error] Details:', error.details);
  console.error('[Supabase Upsert Error] Hint:', error.hint);
  console.error('[Supabase Upsert Error] Code:', error.code);
  
  alert(`❌ Database Save Failed!\n\nError: ${error.message}\n\nDetails: ${error.details}\n\nHint: ${error.hint}`);
  return;
}

console.log('[Supabase Upsert] SUCCESS - Templates saved to database');
```

### 2. Data Transform Logging
**Location**: `src/context/ShopContext.tsx` - Line ~695

**Added**:
```typescript
if (Object.keys(template.colorMockups || {}).length > 0) {
  console.log('[toPrintifyCatalogRow] Template with colorMockups:', template.id, template.colorMockups);
}
```

### 3. Schema Constraint Fix
**Location**: `supabase/schema.sql` - Line ~235

**Changed**:
```sql
-- BEFORE (might cause issues):
alter table public.printify_catalog add column if not exists color_mockups jsonb not null default '{}'::jsonb;

-- AFTER (more permissive):
alter table public.printify_catalog add column if not exists color_mockups jsonb default '{}'::jsonb;
```

---

## 🧪 Testing Steps

### Step 1: Deploy to Vercel Preview
Wait for Vercel to deploy the latest commit (`f45e864`)

### Step 2: Test Save Operation
1. Login to admin dashboard
2. Navigate to Dashboard → Printify → Editor
3. Create or edit a template
4. Add color mockups (e.g., Black with front/back URLs)
5. Click "Publish" or "Update"

### Step 3: Check Console Logs

#### If Save SUCCEEDS ✅:
```
[Supabase Upsert] Sending payload: 1 templates
[Supabase Upsert] Sample payload: { id: "bp_440", color_mockups: {...}, ... }
[toPrintifyCatalogRow] Template with colorMockups: bp_440 { Black: { front: "url", back: "url" } }
[Supabase Upsert] SUCCESS - Templates saved to database
```

#### If Save FAILS ❌:
```
[Supabase Upsert] Sending payload: 1 templates
[Supabase Upsert] Sample payload: { id: "bp_440", color_mockups: {...}, ... }
[Supabase Upsert Error] Full error object: { message: "...", details: "...", hint: "...", code: "..." }
[Supabase Upsert Error] Message: Column 'color_mockups' does not exist
[Supabase Upsert Error] Details: ...
[Supabase Upsert Error] Hint: ...
[Supabase Upsert Error] Code: 42703
```

**Alert will also appear** with full error details.

---

## 🔧 Possible Causes & Solutions

### Cause 1: Column Does Not Exist in Database ❌
**Error Code**: `42703`  
**Error Message**: "column 'color_mockups' of relation 'printify_catalog' does not exist"

**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run this command:
```sql
ALTER TABLE printify_catalog 
ADD COLUMN IF NOT EXISTS color_mockups JSONB DEFAULT '{}'::jsonb;
```
3. Verify column exists:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'printify_catalog' 
AND column_name = 'color_mockups';
```

**Expected Result**:
```
column_name    | data_type | column_default
color_mockups  | jsonb     | '{}'::jsonb
```

---

### Cause 2: Stale Schema Cache 🔄
**Error**: Supabase API doesn't recognize newly added column

**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Click "Reload Schema" or restart PostgREST service
3. Wait 10-30 seconds for cache refresh
4. Retry save operation

**Alternative**: Wait 5 minutes - Supabase auto-refreshes schema periodically

---

### Cause 3: NOT NULL Constraint Violation ⚠️
**Error Message**: "null value in column 'color_mockups' violates not-null constraint"

**Solution**:
The schema fix already handles this by removing `NOT NULL`. If still occurring:

```sql
ALTER TABLE printify_catalog 
ALTER COLUMN color_mockups DROP NOT NULL;
```

---

### Cause 4: JSONB Format Issue 📝
**Error**: Invalid JSONB format

**Check Console Log**:
```javascript
[Supabase Upsert] Sample payload: { 
  color_mockups: { Black: { front: "url" } }  // Should look like this
}
```

**If it looks different** (e.g., stringified), there's a serialization issue.

**Solution**: Verify `toPrintifyCatalogRow()` returns plain object:
```typescript
color_mockups: template.colorMockups || {}  // NOT JSON.stringify()
```

---

### Cause 5: RLS Policy Blocking Insert/Update 🔒
**Error Code**: `42501`  
**Error Message**: "permission denied for relation printify_catalog"

**Solution**:
Check Row Level Security policies allow authenticated users to update:

```sql
-- Verify policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'printify_catalog';

-- If missing, create:
DROP POLICY IF EXISTS "Authenticated can manage printify catalog" ON public.printify_catalog;
CREATE POLICY "Authenticated can manage printify catalog"
ON public.printify_catalog
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## 📊 Sample Console Output (Success)

```javascript
[Template Publish] Preparing to publish template: bp_440
[toPrintifyCatalogRow] Template with colorMockups: bp_440 {
  Black: {
    front: "https://images.printify.com/.../black-front.jpg",
    back: "https://images.printify.com/.../black-back.jpg"
  },
  White: {
    front: "https://storage.supabase.co/.../white-front.png"
  }
}
[Supabase Upsert] Sending payload: 1 templates
[Supabase Upsert] Sample payload: {
  id: "bp_440",
  title: "Test Template",
  color_mockups: {
    Black: { front: "...", back: "..." },
    White: { front: "..." }
  },
  colors: ["Black", "White"],
  images: ["https://..."],
  // ... other fields
}
[Supabase Upsert] SUCCESS - Templates saved to database
```

---

## 🛠️ Manual Database Verification

### Check if Column Exists:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'printify_catalog'
  AND column_name = 'color_mockups';
```

**Expected**:
```
column_name   | data_type | is_nullable | column_default
color_mockups | jsonb     | YES         | '{}'::jsonb
```

### Check Existing Data:
```sql
SELECT id, title, color_mockups
FROM printify_catalog
LIMIT 5;
```

**Expected**:
- Existing rows: `color_mockups` should be `{}` (empty object)
- New rows: `color_mockups` should have data like `{"Black": {"front": "url"}}`

### Manually Insert Test Row:
```sql
INSERT INTO printify_catalog (
  id, title, description, color_mockups, is_enabled
) VALUES (
  'test_123',
  'Manual Test Template',
  'Testing color_mockups column',
  '{"Black": {"front": "https://example.com/black.jpg"}}'::jsonb,
  false
);

-- Verify insert worked:
SELECT id, title, color_mockups FROM printify_catalog WHERE id = 'test_123';

-- Clean up:
DELETE FROM printify_catalog WHERE id = 'test_123';
```

**If manual insert fails**: Column doesn't exist or has constraint issues.

---

## 🔄 Schema Migration Checklist

If you need to manually apply the schema migration:

### Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Paste and run:
```sql
ALTER TABLE printify_catalog 
ADD COLUMN IF NOT EXISTS color_mockups JSONB DEFAULT '{}'::jsonb;
```
4. Verify:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'printify_catalog' AND column_name = 'color_mockups';
```

### Option 2: Via schema.sql File
1. Ensure `supabase/schema.sql` contains:
```sql
alter table public.printify_catalog add column if not exists color_mockups jsonb default '{}'::jsonb;
```
2. Apply entire schema:
```bash
supabase db reset --db-url <your-db-url>
```

**⚠️ WARNING**: `db reset` drops all data! Only use in development.

---

## 📞 Next Steps Based on Error

### If Error Contains "column does not exist":
→ Apply schema migration (see above)

### If Error Contains "violates not-null constraint":
→ Remove NOT NULL constraint from column

### If Error Contains "permission denied":
→ Check RLS policies allow authenticated users

### If Error Contains "invalid input syntax for type json":
→ Check JSONB format in console logs

### If No Error But Data Not Saving:
→ Check `color_mockups` column in Supabase table directly
→ Verify frontend is sending data (check console logs)
→ Check load function `mapPrintifyCatalogRow()` includes `colorMockups`

---

## ✅ Success Indicators

### 1. Console Logs Show:
```
✅ [Supabase Upsert] SUCCESS - Templates saved to database
```

### 2. Supabase Dashboard Shows:
- Go to Table Editor → `printify_catalog`
- Find template row
- Click `color_mockups` column
- See: `{"Black": {"front": "url", "back": "url"}}`

### 3. Edit Template Shows:
- Open template for editing
- Expand color card
- See mockup URLs populated

### 4. Storefront Shows:
- Select color
- Mockup image changes
- Console log: `[BespokeCustomizer] Using color-specific mockup: Black / front → url`

---

## 🐛 If Still Not Working

**Send this info**:
1. Full console log output (all lines starting with `[Supabase Upsert]` or `[toPrintifyCatalogRow]`)
2. Alert message text
3. Network tab screenshot of the failing POST request
4. Result of manual INSERT test (see above)
5. Result of column existence query (see above)

---

## 📝 Code Changes Summary

### Files Modified:
1. **src/context/ShopContext.tsx** - Added comprehensive error logging
2. **supabase/schema.sql** - Removed NOT NULL constraint from color_mockups

### Key Functions:
- `upsertPrintifyCatalogTemplates()` - Added error logging and alert
- `toPrintifyCatalogRow()` - Added debug logging for colorMockups

### No Breaking Changes:
- All changes are backwards compatible
- Existing templates continue to work
- Empty `colorMockups` defaults to `{}`

---

**Status**: 🟡 **WAITING FOR ERROR LOGS**  
**Action Required**: Deploy to Vercel, test, and check console logs  
**Expected Outcome**: Either success logs OR detailed error message for diagnosis

---

**Prepared by**: Kiro AI Assistant  
**Date**: June 18, 2026  
**Build**: f45e864
