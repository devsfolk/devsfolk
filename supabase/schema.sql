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
  status text not null check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
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

commit;
