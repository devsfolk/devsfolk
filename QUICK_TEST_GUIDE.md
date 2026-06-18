# ⚡ Quick Test Guide - Fabric.js Color Filter

**Status**: ✅ Deployed to `feat/printify-enhancements`  
**What Changed**: CSS overlay → Fabric.js BlendColor filter (premium solution)

---

## 🚀 Quick Start

1. **Get Deployment URL**:
   - Open Vercel dashboard
   - Find `feat/printify-enhancements` preview deployment
   - Copy URL

2. **Open Bespoke Customizer**:
   - Navigate to `/editor` or product customizer page
   - Select any t-shirt template

3. **Test Color Changes**:
   - Click **Navy** → Mockup should turn navy blue (preserving shadows)
   - Click **Army** → Mockup should turn olive green
   - Click **Heather Forest** → Mockup should turn muted green

---

## ✅ What to Look For (Pass Criteria)

### Visual Quality:
- ✅ Mockup color changes smoothly
- ✅ Shadows and texture folds **remain visible** (not flat)
- ✅ Garment looks realistic and professional
- ✅ Background stays clean (no color bleed)

### Technical:
- ✅ No console errors (open DevTools F12)
- ✅ No "tainted canvas" or "SecurityError"
- ✅ Color persists when switching views (Front → Back)
- ✅ Preview generation works (Add to Cart)

### Print Area:
- ✅ Text/images constrained to print area box
- ✅ Bounding box visible and aligned
- ✅ Canvas sized correctly (not full mockup)

---

## ❌ What to Avoid (Fail Indicators)

- ❌ Flat, washed-out colors (looks like CSS filter)
- ❌ Console errors: "tainted canvas", "CORS", "SecurityError"
- ❌ Mockup doesn't change color at all
- ❌ Background turns colored (should stay neutral)
- ❌ Text/images disappear behind mockup (layer order wrong)
- ❌ Print area boundaries broken

---

## 🐛 If Something Breaks

**Take Screenshot** + **Copy Console Errors** + **Report**:
1. Selected color name (e.g., "Navy")
2. Product type (e.g., "Gildan 5000 T-Shirt")
3. Browser version (e.g., "Chrome 130")
4. Full console error log (if any)

---

## 🎯 Key Improvement Over CSS Version

| Aspect | CSS Overlay (Old) | Fabric.js Filter (New) |
|--------|-------------------|------------------------|
| Visual Quality | Flat tint | Realistic with shadows |
| Texture Preservation | ❌ Flattened | ✅ Preserved |
| Professional Look | ❌ Amateur | ✅ Premium |
| Background Handling | ❌ Tints everything | ✅ Garment only |
| Export Capability | ⚠️ CORS issues | ✅ Clean export |

---

## 📞 Quick Report Template

```
Status: [PASS / FAIL]

Visual Quality: [✅ / ❌]
- Colors render correctly: [Yes/No]
- Shadows preserved: [Yes/No]

Technical: [✅ / ❌]
- Console errors: [None / See below]
- CORS issues: [Yes/No]

Print Area: [✅ / ❌]
- Boundaries intact: [Yes/No]

Console Errors:
[Paste any errors here]

Screenshot:
[Attach screenshot if issue]
```

---

**Expected Test Time**: ~5-10 minutes  
**Critical Test**: Color change visual quality + Console clean (no errors)

🎨 **Go ahead and test!**
