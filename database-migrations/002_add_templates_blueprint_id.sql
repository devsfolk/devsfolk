-- ============================================================================
-- Migration: Add blueprint_id to templates for Printify integration
-- ============================================================================
-- This allows templates to be linked to Printify blueprints for auto-sync
-- while also supporting pure manual templates (blueprint_id = NULL)
-- ============================================================================

-- Add blueprint_id column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS blueprint_id INTEGER NULL;

-- Add index for efficient blueprint_id lookups
CREATE INDEX IF NOT EXISTS idx_templates_blueprint_id 
ON templates(blueprint_id);

-- Add comment for documentation
COMMENT ON COLUMN templates.blueprint_id IS 
'Printify blueprint ID for auto-sync. NULL for pure manual templates.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to confirm the migration succeeded:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'templates' AND column_name = 'blueprint_id';
-- ============================================================================
