-- ============================================================================
-- Migration 004: Etsy Integration Foundations
-- ============================================================================
-- Phase 0 only:
-- - Add Etsy core tables
-- - Add additive source columns to products/orders
-- - Add row-level security policies
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- Existing table additions
-- ============================================================================

alter table public.products
add column if not exists source text not null default 'printify';

alter table public.orders
add column if not exists source text not null default 'printify';

-- ============================================================================
-- New Etsy tables
-- ============================================================================

create table if not exists public.etsy_shop_tokens (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_iv text not null,
  granted_scopes text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.etsy_shops (
  id uuid primary key default gen_random_uuid(),
  shop_token_id uuid references public.etsy_shop_tokens(id) on delete cascade,
  shop_id text not null unique,
  shop_name text,
  connected_at timestamptz not null default now(),
  status text not null default 'connected',
  last_synced_at timestamptz,
  is_enabled boolean not null default false
);

create table if not exists public.etsy_listings (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references public.etsy_shops(shop_id),
  listing_id text not null,
  product_id text references public.products(id),
  title text,
  description text,
  price numeric,
  images jsonb,
  shop_section_id text,
  taxonomy_id text,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  unique (shop_id, listing_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'etsy_listings_listing_id_key'
      and conrelid = 'public.etsy_listings'::regclass
  ) then
    alter table public.etsy_listings
      add constraint etsy_listings_listing_id_key unique (listing_id);
  end if;
end $$;

create table if not exists public.etsy_listing_variations (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  sku text,
  properties jsonb not null,
  price numeric,
  quantity integer
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'etsy_listing_variations_listing_id_fkey'
      and conrelid = 'public.etsy_listing_variations'::regclass
  ) then
    alter table public.etsy_listing_variations
      add constraint etsy_listing_variations_listing_id_fkey
      foreign key (listing_id)
      references public.etsy_listings(listing_id)
      on delete cascade;
  end if;
end $$;

create table if not exists public.etsy_personalization_questions (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  question_type text not null,
  prompt text,
  is_required boolean default false,
  max_length integer,
  choices jsonb
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'etsy_personalization_questions_listing_id_fkey'
      and conrelid = 'public.etsy_personalization_questions'::regclass
  ) then
    alter table public.etsy_personalization_questions
      add constraint etsy_personalization_questions_listing_id_fkey
      foreign key (listing_id)
      references public.etsy_listings(listing_id)
      on delete cascade;
  end if;
end $$;

create table if not exists public.etsy_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references public.etsy_shops(shop_id),
  etsy_receipt_id text not null,
  order_id text references public.orders(id),
  buyer_name text,
  shipping_address jsonb,
  line_items jsonb,
  status text,
  fulfillment_status text default 'not_pushed',
  unique (shop_id, etsy_receipt_id)
);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.etsy_shop_tokens enable row level security;
alter table public.etsy_shops enable row level security;
alter table public.etsy_listings enable row level security;
alter table public.etsy_listing_variations enable row level security;
alter table public.etsy_personalization_questions enable row level security;
alter table public.etsy_orders enable row level security;

-- Server-only token vault. No anon/authenticated policies by design.

drop policy if exists "Authenticated can manage Etsy shops" on public.etsy_shops;
create policy "Authenticated can manage Etsy shops"
on public.etsy_shops
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read Etsy listings" on public.etsy_listings;
create policy "Public can read Etsy listings"
on public.etsy_listings
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage Etsy listings" on public.etsy_listings;
create policy "Authenticated can manage Etsy listings"
on public.etsy_listings
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read Etsy listing variations" on public.etsy_listing_variations;
create policy "Public can read Etsy listing variations"
on public.etsy_listing_variations
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage Etsy listing variations" on public.etsy_listing_variations;
create policy "Authenticated can manage Etsy listing variations"
on public.etsy_listing_variations
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read Etsy personalization questions" on public.etsy_personalization_questions;
create policy "Public can read Etsy personalization questions"
on public.etsy_personalization_questions
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage Etsy personalization questions" on public.etsy_personalization_questions;
create policy "Authenticated can manage Etsy personalization questions"
on public.etsy_personalization_questions
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage Etsy orders" on public.etsy_orders;
create policy "Authenticated can manage Etsy orders"
on public.etsy_orders
for all
to authenticated
using (true)
with check (true);

-- ============================================================================
-- Verification
-- ============================================================================
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE 'etsy_%'
-- ORDER BY table_name;
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('products', 'orders')
--   AND column_name = 'source';
-- ============================================================================
