-- Migration 006: Etsy Category Seed
-- Purpose: provide a real neutral category for mirrored Etsy products so
-- products.category_id continues to satisfy its foreign key without borrowing
-- the Printify category name.

insert into public.categories (id, name, slug, description, image_url, display_order, created_at)
values (
  'cat_etsy',
  'Etsy Listings',
  'etsy',
  'Imported Etsy marketplace listings.',
  '/custom-tee-mockup.png',
  11,
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do nothing;
