# 🎨 Color-Specific Multi-View Mockups - Implementation Plan

**Date**: June 18, 2026  
**Target**: Display Tab Transformation  
**Goal**: Per-color multi-view image management with URL + File Upload support

---

## 📋 Requirements Summary

### User Flow:
1. Admin goes to Display Tab
2. Sees list of enabled colors (Black, Army, Navy, etc.)
3. For each color: **[Add Images]** and **[Delete Color]** buttons
4. Clicking **[Add Images]** reveals multi-view section:
   - Front view: URL input + File upload button
   - Back view: URL input + File upload button
   - Side view: URL input + File upload button
5. Clicking **[Delete Color]** removes color completely

### Data Structure (Supabase JSONB):
```json
{
  "Black": {
    "front": "https://images.printify.com/.../black-front.png",
    "back": "https://images.printify.com/.../black-back.png"
  },
  "Army": {
    "front": "https://images.printify.com/.../army-front.png"
  },
  "Navy": {
    "front": "/uploads/navy-front-custom.png",
    "back": "/uploads/navy-back-custom.png",
    "side": "/uploads/navy-side-custom.png"
  }
}
```

---

## 🏗️ Data Structure Design

### 1. TypeScript Interfaces

#### Add to `src/types.ts`:
```typescript
export interface ColorMockup {
  color: string;              // "Black", "Army", "Navy"
  front?: string;             // URL or uploaded path
  back?: string;              // Optional
  side?: string;              // Optional
}

export interface PrintifyCatalogTemplate {
  // ... existing fields
  colorMockups?: Record<string, {
    front?: string;
    back?: string;
    side?: string;
  }>;  // NEW FIELD - keyed by color name
}
```

**Why `Record<string, {...}>` instead of array?**
- Faster lookups: O(1) access by color name
- Matches your JSON structure exactly
- Easier to merge/update individual colors

---

#### Update `src/hooks/useTemplateForm.ts`:
```typescript
export interface TemplateFormData {
  // ... existing fields
  colors: string[];           // ["Black", "Army", "Navy"]
  newColor: string;
  
  // NEW FIELD - replaces old generatorSettings
  colorMockups: Record<string, {
    front?: string;
    back?: string;
    side?: string;
  }>;
}

const getDefaultFormData = (): TemplateFormData => ({
  // ... existing defaults
  colorMockups: {},  // Empty object initially
});
```

---

### 2. Database Schema (Supabase)

#### Option A: Use Existing `products` Table (If templates stored there)
```sql
-- No schema change needed - products.variants is already JSONB
-- We'll store colorMockups in variants field or add new column
```

#### Option B: Use `printify_catalog` Table (Recommended)
```sql
-- Check if table exists, if not, create it
CREATE TABLE IF NOT EXISTS printify_catalog (
  id TEXT PRIMARY KEY,
  blueprint_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  color_mockups JSONB DEFAULT '{}',  -- NEW COLUMN
  variants JSONB DEFAULT '[]',
  print_areas JSONB DEFAULT '[]',
  base_cost NUMERIC(12, 2),
  selling_price NUMERIC(12, 2),
  is_enabled BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'raw',
  last_synced TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add column if it doesn't exist (migration)
ALTER TABLE printify_catalog 
ADD COLUMN IF NOT EXISTS color_mockups JSONB DEFAULT '{}';
```

**Storage Example**:
```json
{
  "id": "bp_5",
  "title": "Gildan 5000 T-Shirt",
  "colors": ["Black", "White", "Army", "Navy"],
  "color_mockups": {
    "Black": {
      "front": "https://images.printify.com/.../black-front.png",
      "back": "https://images.printify.com/.../black-back.png"
    },
    "Army": {
      "front": "https://images.printify.com/.../army-front.png"
    }
  }
}
```

---

## 🎨 UI/UX Design Plan

### Current Display Tab Structure:
```
[Blueprint Search]
[Title Input]
[Description Textarea]
[Product Images Section] ← Generic images
[Available Colors Section] ← Just add/remove colors
```

### New Display Tab Structure:
```
[Blueprint Search]
[Title Input]
[Description Textarea]

[Color Mockups Management] ← NEW SECTION (replaces both old sections)
  ├── For each color in formData.colors:
  │   ├── Color Header (name + hex preview)
  │   ├── [Delete Color] button
  │   ├── [Add Images] button (toggles expanded state)
  │   └── Expanded Section (if toggled):
  │       ├── Front View: [URL Input] [Upload Button] [Preview]
  │       ├── Back View: [URL Input] [Upload Button] [Preview]
  │       └── Side View: [URL Input] [Upload Button] [Preview]
  └── [+ Add New Color] button at bottom
```

---

### UI Component Breakdown

#### Component 1: Color Card (Collapsed State)
```tsx
<div className="border rounded-xl p-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {/* Color Preview Dot */}
      <div 
        className="w-6 h-6 rounded-full border-2"
        style={{ backgroundColor: getColorHex(color) }}
      />
      
      {/* Color Name */}
      <span className="font-bold text-sm">{color}</span>
      
      {/* Badge: Image Count */}
      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
        {mockupCount} mockup{mockupCount !== 1 ? 's' : ''}
      </span>
    </div>
    
    {/* Actions */}
    <div className="flex items-center gap-2">
      <Button onClick={() => toggleExpanded(color)}>
        Add Images
      </Button>
      <Button variant="destructive" onClick={() => deleteColor(color)}>
        Delete
      </Button>
    </div>
  </div>
</div>
```

---

#### Component 2: Color Card (Expanded State)
```tsx
<div className="border rounded-xl p-4 bg-gray-50">
  {/* Header (same as collapsed) */}
  
  {/* Expanded Content */}
  <div className="mt-4 space-y-4">
    {/* Front View */}
    <ViewInput
      label="Front View"
      viewKey="front"
      color={color}
      currentUrl={formData.colorMockups[color]?.front}
      onUrlChange={(url) => updateMockupUrl(color, 'front', url)}
      onFileUpload={(file) => handleFileUpload(color, 'front', file)}
    />
    
    {/* Back View */}
    <ViewInput
      label="Back View (Optional)"
      viewKey="back"
      color={color}
      currentUrl={formData.colorMockups[color]?.back}
      onUrlChange={(url) => updateMockupUrl(color, 'back', url)}
      onFileUpload={(file) => handleFileUpload(color, 'back', file)}
    />
    
    {/* Side View */}
    <ViewInput
      label="Side View (Optional)"
      viewKey="side"
      color={color}
      currentUrl={formData.colorMockups[color]?.side}
      onUrlChange={(url) => updateMockupUrl(color, 'side', url)}
      onFileUpload={(file) => handleFileUpload(color, 'side', file)}
    />
  </div>
</div>
```

---

#### Component 3: ViewInput (Dual Input Component)
```tsx
interface ViewInputProps {
  label: string;
  viewKey: 'front' | 'back' | 'side';
  color: string;
  currentUrl?: string;
  onUrlChange: (url: string) => void;
  onFileUpload: (file: File) => void;
}

const ViewInput: React.FC<ViewInputProps> = ({
  label,
  currentUrl,
  onUrlChange,
  onFileUpload,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl || '');
  const [uploading, setUploading] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-white">
      <Label className="text-xs font-bold mb-2">{label}</Label>
      
      <div className="flex gap-2">
        {/* URL Input */}
        <Input
          type="url"
          placeholder="Paste Printify mockup URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={() => onUrlChange(urlInput)}
          className="flex-1"
        />
        
        {/* OR Divider */}
        <div className="flex items-center text-xs text-gray-400">OR</div>
        
        {/* File Upload Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(`file-${color}-${viewKey}`)?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload
        </Button>
        
        {/* Hidden File Input */}
        <input
          id={`file-${color}-${viewKey}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file);
          }}
        />
      </div>
      
      {/* Preview Thumbnail */}
      {currentUrl && (
        <div className="mt-2">
          <img
            src={currentUrl}
            alt={`${label} preview`}
            className="w-24 h-24 object-contain border rounded"
            onError={(e) => {
              e.currentTarget.src = '/custom-tee-mockup.png';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUrlChange('')}
            className="mt-1 text-xs text-red-600"
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 State Management Plan

### 1. Component State (DisplayTab.tsx)
```typescript
const DisplayTab: React.FC<DisplayTabProps> = ({ formData, setFormData }) => {
  // Track which colors are expanded
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  
  // Toggle expand/collapse
  const toggleExpanded = (color: string) => {
    setExpandedColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) {
        next.delete(color);
      } else {
        next.add(color);
      }
      return next;
    });
  };
  
  // Update mockup URL for specific color + view
  const updateMockupUrl = (color: string, view: 'front' | 'back' | 'side', url: string) => {
    setFormData(prev => ({
      ...prev,
      colorMockups: {
        ...prev.colorMockups,
        [color]: {
          ...prev.colorMockups[color],
          [view]: url || undefined,  // Remove if empty
        },
      },
    }));
  };
  
  // Delete color completely
  const deleteColor = (color: string) => {
    const confirm = window.confirm(`Delete "${color}" and all its mockup images?`);
    if (!confirm) return;
    
    setFormData(prev => {
      const { [color]: removed, ...remainingMockups } = prev.colorMockups;
      return {
        ...prev,
        colors: prev.colors.filter(c => c !== color),
        colorMockups: remainingMockups,
      };
    });
  };
  
  // Add new color
  const addColor = () => {
    const colorName = prompt('Enter color name (e.g., "Forest Green"):');
    if (!colorName || formData.colors.includes(colorName)) return;
    
    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, colorName],
      colorMockups: {
        ...prev.colorMockups,
        [colorName]: {},  // Initialize empty mockup object
      },
    }));
    
    // Auto-expand new color
    setExpandedColors(prev => new Set(prev).add(colorName));
  };
  
  // ... rest of component
};
```

---

### 2. File Upload Handler
```typescript
const handleFileUpload = async (
  color: string, 
  view: 'front' | 'back' | 'side', 
  file: File
) => {
  try {
    setUploading(true);
    
    // Option A: Upload to Supabase Storage
    const fileName = `mockups/${color.toLowerCase()}-${view}-${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('product-images')  // Bucket name
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    // Update form data with uploaded URL
    updateMockupUrl(color, view, publicUrl);
    
    alert('✓ Image uploaded successfully!');
  } catch (err: any) {
    console.error('[File Upload Error]:', err);
    alert(`Upload failed: ${err.message}`);
  } finally {
    setUploading(false);
  }
};
```

**Alternative**: If Supabase Storage not available, use base64 or external service (Cloudinary, AWS S3).

---

## 💾 Data Persistence Flow

### Save Flow (TemplateEditor.tsx → handlePublish):
```typescript
const handlePublish = async () => {
  const templateData: PrintifyCatalogTemplate = {
    id: formData.id || `bp_${formData.blueprintId || Date.now()}`,
    // ... existing fields
    colors: formData.colors,
    colorMockups: formData.colorMockups,  // ← ADD THIS LINE
  };

  await upsertPrintifyCatalogTemplates([templateData], { replaceVisible: false });
  alert('✓ Template published with color mockups!');
};
```

---

### Load Flow (TemplateEditor.tsx → initialFormData):
```typescript
const initialFormData = editingTemplate
  ? {
      id: editingTemplate.id,
      // ... existing fields
      colors: Array.isArray(editingTemplate.colors) 
        ? editingTemplate.colors 
        : [],
      colorMockups: editingTemplate.colorMockups || {},  // ← ADD THIS LINE
    }
  : undefined;
```

---

## 🎯 Storefront Integration (Later Phase)

### BespokeCustomizer.tsx - Lookup Logic:
```typescript
// Get mockup URL for selected color + view
const getColorMockupUrl = useMemo(() => {
  if (!selectedColor || !activeTemplate?.colorMockups) {
    return activeViewImage;  // Fallback to default
  }
  
  const colorData = activeTemplate.colorMockups[selectedColor];
  if (!colorData) {
    console.warn(`No mockup data for color: ${selectedColor}`);
    return activeViewImage;
  }
  
  // Get URL for current view (front/back/side)
  const viewKey = selectedView.toLowerCase() as 'front' | 'back' | 'side';
  const mockupUrl = colorData[viewKey];
  
  if (!mockupUrl) {
    // Fallback to front view if current view not available
    return colorData.front || activeViewImage;
  }
  
  return mockupUrl;
}, [selectedColor, selectedView, activeTemplate]);

// Use in JSX
<img src={getColorMockupUrl} alt="Product mockup" />
```

---

## 📦 Implementation Phases

### Phase 1: Data Structure Setup ✅ (Plan Complete)
- [x] Design TypeScript interfaces
- [x] Plan database schema
- [x] Design state management logic
- [ ] **NEXT**: Write code

### Phase 2: UI Implementation
- [ ] Create `ViewInput` component
- [ ] Redesign DisplayTab with color cards
- [ ] Add expand/collapse logic
- [ ] Implement delete color confirmation
- [ ] Add "Add New Color" button

### Phase 3: File Upload Integration
- [ ] Set up Supabase Storage bucket
- [ ] Implement file upload handler
- [ ] Add upload progress indicators
- [ ] Handle upload errors gracefully

### Phase 4: Save/Load Logic
- [ ] Update `handlePublish()` to save colorMockups
- [ ] Update `initialFormData` to load colorMockups
- [ ] Test edit existing template flow
- [ ] Verify data persists correctly

### Phase 5: Storefront Integration
- [ ] Add `getColorMockupUrl()` helper
- [ ] Update mockup rendering in BespokeCustomizer
- [ ] Test color selection → mockup change
- [ ] Test view switching → mockup change
- [ ] Handle missing mockup gracefully

### Phase 6: Polish & Validation
- [ ] Add validation (at least front view required)
- [ ] Add bulk upload feature (optional)
- [ ] Add mockup preview modal (optional)
- [ ] Add copy mockup URLs between colors (optional)
- [ ] Mobile responsive testing

---

## 🎨 Visual Mockup (UI Flow)

### Collapsed State:
```
┌─────────────────────────────────────────────────────┐
│ 🔴 Black                          [2 mockups]       │
│                          [Add Images]  [Delete]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🟢 Army                           [1 mockup]        │
│                          [Add Images]  [Delete]     │
└─────────────────────────────────────────────────────┘
```

### Expanded State (Black):
```
┌─────────────────────────────────────────────────────┐
│ 🔴 Black                          [2 mockups]       │
│                          [Collapse]    [Delete]     │
├─────────────────────────────────────────────────────┤
│ Front View                                          │
│ [URL Input────────────────] OR [Upload] [Preview]  │
│                                                     │
│ Back View (Optional)                                │
│ [URL Input────────────────] OR [Upload] [Preview]  │
│                                                     │
│ Side View (Optional)                                │
│ [URL Input────────────────] OR [Upload] [    ]     │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ Edge Cases & Validation

### Validation Rules:
1. **At least one view required**: Warn if no front/back/side URL provided
2. **Color name uniqueness**: Prevent duplicate color names
3. **URL format**: Validate URL format (starts with http/https or /)
4. **File size limit**: Max 5MB per image (configurable)
5. **File type**: Only allow image/* (jpg, png, webp)

### Error Handling:
```typescript
const validateColorMockups = (formData: TemplateFormData): string[] => {
  const errors: string[] = [];
  
  formData.colors.forEach(color => {
    const mockups = formData.colorMockups[color];
    
    if (!mockups || (!mockups.front && !mockups.back && !mockups.side)) {
      errors.push(`Color "${color}" has no mockup images`);
    }
  });
  
  return errors;
};

// In handlePublish:
const errors = validateColorMockups(formData);
if (errors.length > 0) {
  alert('Validation errors:\n' + errors.join('\n'));
  return;
}
```

---

## 🚀 Migration Strategy

### Existing Templates:
```typescript
// When loading old templates without colorMockups field
const initialFormData = editingTemplate
  ? {
      // ... existing fields
      colorMockups: editingTemplate.colorMockups || 
        // Auto-migrate: Use first image for all colors
        (editingTemplate.colors || []).reduce((acc, color) => ({
          ...acc,
          [color]: {
            front: editingTemplate.images?.[0] || undefined,
          },
        }), {}),
    }
  : undefined;
```

This allows old templates to work without breaking, using their first image as default front mockup.

---

## 📊 Summary Comparison

| Aspect | Old Approach (Generator Tab) | New Approach (Display Tab) |
|--------|------------------------------|----------------------------|
| **Concept** | Two-layer CSS tinting | Per-color real mockup URLs |
| **Data Storage** | Not saved (lost on publish) | Saved to `colorMockups` field |
| **Color Management** | Separate section | Integrated in same tab |
| **Image Input** | Only URL | URL + File Upload |
| **Multi-View** | Not supported | Front/Back/Side per color |
| **Storefront** | Not connected | Direct lookup by color+view |
| **Quality** | Fake CSS filter | Real product photography |

---

## ✅ Ready to Proceed?

**This plan includes**:
- ✅ Complete data structure design
- ✅ TypeScript interfaces
- ✅ Database schema
- ✅ UI component breakdown
- ✅ State management logic
- ✅ File upload strategy
- ✅ Save/load flow
- ✅ Storefront integration
- ✅ Validation rules
- ✅ Migration strategy

**Next step**: Shall I proceed with implementing this plan in code?
