-- Migration 003: Add Editor Design Charges Configuration
-- This migration adds design charges configuration for the storefront editor
-- Charges are stored in the store_settings JSONB value under printifySettings.editorCharges

-- The structure will be:
-- {
--   "printifySettings": {
--     "editorCharges": {
--       "textOnly": 5.00,           -- Fee for text-only customization
--       "designOnly": 10.00,        -- Fee for design upload only
--       "textAndDesign": 12.00,     -- Fee for text + design combined
--       "areaMultiplier": {
--         "enabled": false,         -- Enable area-based surcharge
--         "threshold": 50,          -- Percentage of print area
--         "surcharge": 3.00         -- Additional fee if above threshold
--       }
--     }
--   }
-- }

-- No table changes needed - store_settings already uses JSONB
-- Admin UI will read/write to this path in the store_settings value

-- Default values will be set via application code when first accessed
-- This migration serves as documentation of the schema structure

COMMENT ON TABLE public.store_settings IS 'Store configuration including editor design charges at path: printifySettings.editorCharges';
