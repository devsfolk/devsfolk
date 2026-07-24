-- Migration 007: Neutral Etsy category branding cleanup
-- Purpose: replace customer-visible backend branding on the mirrored Etsy category
-- with neutral storefront copy without changing the category id used by products.

begin;

update public.categories
set
  name = 'Imported Listings',
  slug = 'imported-listings',
  description = 'Products imported from the connected shop.',
  image_url = '/custom-tee-mockup.png',
  display_order = 11
where id = 'cat_etsy';

commit;
