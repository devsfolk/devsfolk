-- ============================================================================
-- JULIET'S DIGITAL HUB - Migration Only (if tables already exist)
-- ============================================================================
-- Run this if your database already has tables but missing some columns
-- This will add any missing columns needed for size-based pricing
-- ============================================================================

begin;

-- Add missing columns to products table (if not exist)
alter table public.products add column if not exists is_printify boolean not null default false;
alter table public.products add column if not exists printify_product_id text;
alter table public.products add column if not exists printify_catalog_id text;

-- Add missing columns to orders table (if not exist)
alter table public.orders add column if not exists printify_order_id text;
alter table public.orders add column if not exists printify_sync_status text;
alter table public.orders add column if not exists printify_error_log text;

-- Ensure printify_catalog table has all required columns
alter table public.printify_catalog add column if not exists product_id text;
alter table public.printify_catalog add column if not exists blueprint_id integer;
alter table public.printify_catalog add column if not exists category text;
alter table public.printify_catalog add column if not exists brand text;
alter table public.printify_catalog add column if not exists model text;
alter table public.printify_catalog add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists product_status text;
alter table public.printify_catalog add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists mockups jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists variant_images jsonb not null default '{}'::jsonb;
alter table public.printify_catalog add column if not exists providers jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists shipping jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists sync_details jsonb not null default '{}'::jsonb;
alter table public.printify_catalog add column if not exists base_cost numeric(12, 2);
alter table public.printify_catalog add column if not exists retail_price numeric(12, 2);
alter table public.printify_catalog add column if not exists profit_margin numeric(12, 2);
alter table public.printify_catalog add column if not exists selling_price numeric(12, 2);
alter table public.printify_catalog add column if not exists variant_selling_prices jsonb not null default '{}'::jsonb;
alter table public.printify_catalog add column if not exists colors jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists sizes jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists sync_status text not null default 'raw';
alter table public.printify_catalog add column if not exists print_provider_id integer;
alter table public.printify_catalog add column if not exists is_enabled boolean not null default true;

-- Most importantly: Ensure variants column exists (this stores size pricing!)
alter table public.printify_catalog add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.printify_catalog add column if not exists print_areas jsonb not null default '[]'::jsonb;

commit;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the variants column exists:
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'printify_catalog' 
-- AND column_name IN ('variants', 'print_areas', 'colors', 'sizes');
--
-- Should return:
-- variants    | jsonb
-- print_areas | jsonb
-- colors      | jsonb
-- sizes       | jsonb
-- ============================================================================
