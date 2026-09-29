-- Terra Collective — initial schema
-- Run once in Supabase → SQL Editor (or `supabase db push`). Safe to re-run: guarded with IF NOT EXISTS where possible.
-- Money is stored in EUR cents (integer). Localised text is jsonb {"en": "...", "pt": "..."}.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────── Enums
do $$ begin create type staff_role as enum ('owner', 'staff'); exception when duplicate_object then null; end $$;
do $$ begin create type product_status as enum ('draft', 'active', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('pending_payment', 'paid', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type review_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type post_status as enum ('draft', 'scheduled', 'published'); exception when duplicate_object then null; end $$;
do $$ begin create type discount_kind as enum ('percent', 'fixed', 'free_shipping'); exception when duplicate_object then null; end $$;
do $$ begin create type shipping_profile as enum ('small', 'standard', 'statement', 'textile', 'digital'); exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────── Staff & roles
create table if not exists staff (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  name text,
  role staff_role not null default 'staff',
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = 'owner');
$$;

-- ─────────────────────────────────────────────────────────────── Catalogue
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null,
  blurb jsonb not null default '{}',
  image text,
  accent text,
  position int not null default 0,
  featured boolean not null default true
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  collection_id uuid references collections on delete set null,
  status product_status not null default 'draft',
  name jsonb not null,
  short jsonb not null default '{}',
  description jsonb not null default '{}',
  details jsonb not null default '{}',          -- {dimensions, materials, care}
  options jsonb not null default '[]',          -- [{name,label,values:[{value,label,swatch}]}]
  colors text[] not null default '{}',
  tags text[] not null default '{}',
  shipping shipping_profile not null default 'standard',
  seo jsonb not null default '{}',              -- {title:{en,pt}, description:{en,pt}}
  pairs_with text[] not null default '{}',
  wall_piece boolean not null default false,
  food_safe boolean not null default false,
  hidden boolean not null default false,
  bestseller_rank int not null default 0,
  etsy_listing_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'video')),
  url text not null,
  alt jsonb not null default '{}',
  position int not null default 0
);

create table if not exists variants (
  id text primary key,                          -- stable id used in carts, e.g. swd-medium-coral
  product_id uuid not null references products on delete cascade,
  sku text unique not null,
  options jsonb not null default '{}',
  price int not null check (price >= 0),
  compare_at int,
  stock int not null default 0,
  image_index int,
  position int not null default 0
);

-- ─────────────────────────────────────────────────────────────── Customers & orders
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  email text unique not null,
  first_name text,
  last_name text,
  phone text,
  country text,
  nif text,
  newsletter boolean not null default false,
  tags text[] not null default '{}',            -- VIP, wholesale, …
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  customer_id uuid references customers on delete set null,
  status order_status not null default 'pending_payment',
  email text not null,
  locale text not null default 'en',
  country text not null,
  shipping_address jsonb not null,
  nif text,
  subtotal int not null,
  shipping int not null default 0,
  shipping_method text not null default 'standard',
  gift_wrap boolean not null default false,
  gift_message text,
  discount_code text,
  discount_amount int not null default 0,
  vat int not null default 0,
  total int not null,
  refunded_amount int not null default 0,
  payment_method text,
  payment_ref text,
  carrier text,
  tracking_number text,
  invoice_url text,
  utm jsonb not null default '{}',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products on delete set null,
  variant_id text references variants on delete set null,
  sku text,
  name text not null,
  variant_label text,
  unit_price int not null,
  quantity int not null check (quantity > 0)
);

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  kind text not null,                           -- status | note | email | refund
  body text,
  data jsonb not null default '{}',
  author uuid references auth.users,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────── Content & engagement
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  order_id uuid references orders on delete set null,
  author text not null,
  country text,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  photo text,
  status review_status not null default 'pending',
  featured boolean not null default false,
  reply text,
  created_at timestamptz not null default now()
);

create table if not exists journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  status post_status not null default 'draft',
  title jsonb not null,
  excerpt jsonb not null default '{}',
  cover text,
  category jsonb not null default '{}',
  tags text[] not null default '{}',
  blocks jsonb not null default '[]',
  seo jsonb not null default '{}',
  author text,
  reading_minutes int not null default 3,
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pages (
  slug text primary key,                        -- our-story, faq, terms, …
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,                         -- announcement, hero, store, shipping_zones, …
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────── Marketing
create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- null = automatic promotion
  kind discount_kind not null,
  value int not null default 0,                 -- percent (10) or cents (500)
  min_spend int,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  automatic boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  initial_value int not null,
  balance int not null,
  recipient_email text,
  recipient_name text,
  message text,
  order_id uuid references orders on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  locale text not null default 'en',
  source text,
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists back_in_stock_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  variant_id text not null references variants on delete cascade,
  locale text not null default 'en',
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, variant_id)
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  email text,
  lines jsonb not null default '[]',
  value int not null default 0,
  country text,
  reminded_1h_at timestamptz,
  reminded_24h_at timestamptz,
  recovered_order_id uuid references orders on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact',
  name text not null,
  email text not null,
  company text,
  website text,
  country text,
  quantity text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────── Analytics (first-party, consented)
create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  name text not null,
  props jsonb not null default '{}',
  path text,
  referrer text,
  utm jsonb not null default '{}',
  country text,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_time_idx on analytics_events (name, created_at desc);
create index if not exists analytics_events_slug_idx on analytics_events ((props->>'slug'));

-- ─────────────────────────────────────────────────────────────── updated_at triggers
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on products;
create trigger products_touch before update on products for each row execute function touch_updated_at();
drop trigger if exists posts_touch on journal_posts;
create trigger posts_touch before update on journal_posts for each row execute function touch_updated_at();

-- ─────────────────────────────────────────────────────────────── Row-level security
-- Storefront reads published data with the anon key; everything else is staff-only.
-- Storefront writes (orders, newsletter, events…) go through server routes using the service role.
do $$
declare t text;
begin
  foreach t in array array['staff','collections','products','product_media','variants','customers','orders','order_items',
    'order_events','reviews','journal_posts','pages','settings','discounts','gift_cards','newsletter_subscribers',
    'back_in_stock_requests','carts','enquiries','analytics_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Only owners can manage staff.
drop policy if exists staff_all on staff;
drop policy if exists staff_read on staff;
create policy staff_read on staff for select to authenticated using (is_staff());
drop policy if exists owner_write on staff;
create policy owner_write on staff for all to authenticated using (is_owner()) with check (is_owner());

-- Public read policies
drop policy if exists public_read on collections;
create policy public_read on collections for select to anon, authenticated using (true);
drop policy if exists public_read on products;
create policy public_read on products for select to anon, authenticated using (status = 'active');
drop policy if exists public_read on product_media;
create policy public_read on product_media for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));
drop policy if exists public_read on variants;
create policy public_read on variants for select to anon, authenticated
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));
drop policy if exists public_read on reviews;
create policy public_read on reviews for select to anon, authenticated using (status = 'approved');
drop policy if exists public_read on journal_posts;
create policy public_read on journal_posts for select to anon, authenticated
  using (status = 'published' or (status = 'scheduled' and publish_at <= now()));
drop policy if exists public_read on pages;
create policy public_read on pages for select to anon, authenticated using (true);
drop policy if exists public_read on settings;
create policy public_read on settings for select to anon, authenticated using (key in ('announcement', 'hero', 'featured_collections'));

-- Customers can read their own profile and orders.
drop policy if exists own_read on customers;
create policy own_read on customers for select to authenticated using (user_id = auth.uid());
drop policy if exists own_read on orders;
create policy own_read on orders for select to authenticated
  using (customer_id in (select id from customers where user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────── Storage (product images & video)
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media staff write" on storage.objects;
create policy "media staff write" on storage.objects for all to authenticated
  using (bucket_id = 'media' and is_staff()) with check (bucket_id = 'media' and is_staff());

-- ─────────────────────────────────────────────────────────────── Reporting helpers
-- Daily revenue for the dashboard (paid-or-later orders, net of refunds).
create or replace view daily_revenue with (security_invoker = true) as
select date_trunc('day', created_at)::date as day,
       count(*) as orders,
       sum(total - refunded_amount) as revenue
from orders
where status in ('paid', 'packing', 'shipped', 'delivered', 'refunded')
group by 1;
