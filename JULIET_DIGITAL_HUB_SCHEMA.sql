-- ============================================================================
-- JULIET'S DIGITAL HUB - Complete Database Schema
-- ============================================================================
-- This is the EXACT schema that AuraBloom uses and works perfectly.
-- Run this in Juliet's Digital Hub Supabase SQL Editor.
-- ============================================================================

begin;

-- Core Tables
-- ============================================================================

create table if not exists public.store_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text not null default '',
  display_order integer not null default 0,
  created_at bigint not null
);

create table if not exists public.products (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12, 2) not null,
  discount_price numeric(12, 2),
  images jsonb not null default '[]'::jsonb,
  stock integer not null default 0,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  is_printify boolean not null default false,
  printify_product_id text,
  printify_catalog_id text
);

create table if not exists public.reviews (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  user_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at bigint not null
);

create table if not exists public.orders (
  id text primary key,
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null,
  customer_address text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null,
  status text not null check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'ABANDONED')),
  payment_method text,
  created_at bigint not null,
  printify_order_id text,
  printify_sync_status text,
  printify_error_log text
);

-- Printify Tables
-- ============================================================================

create table if not exists public.printify_catalog (
  id text primary key,
  product_id text,
  blueprint_id integer,
  title text not null,
  category text,
  brand text,
  model text,
  tags jsonb not null default '[]'::jsonb,
  product_status text,
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  mockups jsonb not null default '[]'::jsonb,
  variant_images jsonb not null default '{}'::jsonb,
  providers jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  print_areas jsonb not null default '[]'::jsonb,
  shipping jsonb not null default '[]'::jsonb,
  sync_details jsonb not null default '{}'::jsonb,
  base_cost numeric(12, 2),
  retail_price numeric(12, 2),
  profit_margin numeric(12, 2),
  selling_price numeric(12, 2),
  variant_selling_prices jsonb not null default '{}'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  sync_status text not null default 'raw',
  print_provider_id integer,
  is_enabled boolean not null default true,
  last_synced timestamptz not null default now()
);

create table if not exists public.printify_designs (
  id text primary key,
  image_url text not null,
  name text not null,
  created_at bigint not null
);

create table if not exists public.printify_credentials (
  id text primary key,
  api_key text not null default '',
  ai_api_key text not null default '',
  updated_at timestamptz not null default now()
);

-- Row Level Security (RLS)
-- ============================================================================

alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.printify_catalog enable row level security;
alter table public.printify_designs enable row level security;
alter table public.printify_credentials enable row level security;

-- RLS Policies
-- ============================================================================

-- Store Settings
drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
on public.store_settings for select to anon, authenticated using (true);

drop policy if exists "Authenticated can manage store settings" on public.store_settings;
create policy "Authenticated can manage store settings"
on public.store_settings for all to authenticated using (true) with check (true);

-- Categories
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories for select to anon, authenticated using (true);

drop policy if exists "Authenticated can manage categories" on public.categories;
create policy "Authenticated can manage categories"
on public.categories for all to authenticated using (true) with check (true);

-- Products
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products for select to anon, authenticated using (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products"
on public.products for all to authenticated using (true) with check (true);

-- Reviews
drop policy if exists "Public can read reviews" on public.reviews;
create policy "Public can read reviews"
on public.reviews for select to anon, authenticated using (true);

drop policy if exists "Public can create reviews" on public.reviews;
create policy "Public can create reviews"
on public.reviews for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated can manage reviews" on public.reviews;
create policy "Authenticated can manage reviews"
on public.reviews for all to authenticated using (true) with check (true);

-- Orders
drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated can read and manage orders" on public.orders;
create policy "Authenticated can read and manage orders"
on public.orders for all to authenticated using (true) with check (true);

-- Printify Catalog
drop policy if exists "Public can read printify catalog" on public.printify_catalog;
create policy "Public can read printify catalog"
on public.printify_catalog for select to anon, authenticated using (true);

drop policy if exists "Authenticated can manage printify catalog" on public.printify_catalog;
create policy "Authenticated can manage printify catalog"
on public.printify_catalog for all to authenticated using (true) with check (true);

-- Printify Designs
drop policy if exists "Public can read printify designs" on public.printify_designs;
create policy "Public can read printify designs"
on public.printify_designs for select to anon, authenticated using (true);

drop policy if exists "Authenticated can manage printify designs" on public.printify_designs;
create policy "Authenticated can manage printify designs"
on public.printify_designs for all to authenticated using (true) with check (true);

-- Printify Credentials
drop policy if exists "Authenticated can manage printify credentials" on public.printify_credentials;
create policy "Authenticated can manage printify credentials"
on public.printify_credentials for all to authenticated using (true) with check (true);

-- Functions
-- ============================================================================

create or replace function public.track_order(order_lookup text, phone_lookup text)
returns table (
  id text,
  status text,
  total numeric,
  created_at bigint,
  items jsonb
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.status, o.total, o.created_at, o.items
  from public.orders o
  where o.id = order_lookup
    and o.customer_phone = phone_lookup
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- Initial Data
-- ============================================================================

insert into public.store_settings (id, value)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

commit;

-- ============================================================================
-- IMPORTANT: After running this schema, you need to:
-- ============================================================================
-- 1. Go to https://legacywear.store/admin/printify
-- 2. Configure your Printify API key and Shop ID
-- 3. Sync templates from Printify OR create manual templates
-- 4. Edit each template and add size-specific pricing in the "Prices" tab
-- 5. Save/Publish the template
--
-- The size pricing will be stored in printify_catalog.variants as:
-- [
--   {"id": 1, "title": "S", "cost": 1000, "price": 2000},
--   {"id": 2, "title": "M", "cost": 1100, "price": 2200},
--   {"id": 3, "title": "L", "cost": 1200, "price": 2400},
--   ...
-- ]
--
-- NOTE: Prices are stored in CENTS (1000 = $10.00, 2000 = $20.00)
-- ============================================================================
