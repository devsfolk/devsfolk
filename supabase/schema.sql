begin;

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
  created_at bigint not null
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
  created_at bigint not null
);

alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
on public.store_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage store settings" on public.store_settings;
create policy "Authenticated can manage store settings"
on public.store_settings
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage categories" on public.categories;
create policy "Authenticated can manage categories"
on public.categories
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read reviews" on public.reviews;
create policy "Public can read reviews"
on public.reviews
for select
to anon, authenticated
using (true);

drop policy if exists "Public can create reviews" on public.reviews;
create policy "Public can create reviews"
on public.reviews
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can manage reviews" on public.reviews;
create policy "Authenticated can manage reviews"
on public.reviews
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read and manage orders" on public.orders;
create policy "Authenticated can read and manage orders"
on public.orders
for all
to authenticated
using (true)
with check (true);

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

insert into public.store_settings (id, value)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

-- Printify Database Extensions

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

alter table public.printify_catalog enable row level security;
alter table public.printify_designs enable row level security;
alter table public.printify_credentials enable row level security;

drop policy if exists "Public can read printify catalog" on public.printify_catalog;
create policy "Public can read printify catalog"
on public.printify_catalog
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage printify catalog" on public.printify_catalog;
create policy "Authenticated can manage printify catalog"
on public.printify_catalog
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read printify designs" on public.printify_designs;
create policy "Public can read printify designs"
on public.printify_designs
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage printify designs" on public.printify_designs;
create policy "Authenticated can manage printify designs"
on public.printify_designs
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage printify credentials" on public.printify_credentials;
create policy "Authenticated can manage printify credentials"
on public.printify_credentials
for all
to authenticated
using (true)
with check (true);

alter table public.orders add column if not exists printify_order_id text;
alter table public.orders add column if not exists printify_sync_status text;
alter table public.orders add column if not exists printify_error_log text;

alter table public.products add column if not exists is_printify boolean not null default false;
alter table public.products add column if not exists printify_product_id text;
alter table public.products add column if not exists printify_catalog_id text;

commit;
