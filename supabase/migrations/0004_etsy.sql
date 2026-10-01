-- Terra Collective — Etsy integration (orders imported from Etsy receipts)
-- Run after 0003_backoffice.sql. Safe to re-run.

-- Where an order came from, and its id in that system.
alter table orders add column if not exists source text not null default 'web';  -- web | manual | etsy
alter table orders add column if not exists external_id text;                    -- Etsy receipt_id
alter table orders add column if not exists external_status text;                -- raw status from the source
alter table orders add column if not exists external_url text;
create unique index if not exists orders_source_external_idx on orders (source, external_id) where external_id is not null;
create index if not exists orders_source_idx on orders (source);

-- Secrets for connected services (OAuth tokens). RLS on and NO policies:
-- only the server (service role) can read or write this table.
create table if not exists integrations (
  provider text primary key,         -- 'etsy'
  data jsonb not null default '{}',  -- tokens, shop id, options, last sync
  updated_at timestamptz not null default now()
);
alter table integrations enable row level security;

-- Atomic stock decrement that never goes below zero (used for Etsy orders).
create or replace function decrement_stock(p_variant text, p_qty int) returns void
language sql security definer set search_path = public as $$
  update variants set stock = greatest(0, stock - p_qty) where id = p_variant;
$$;
revoke all on function decrement_stock(text, int) from public, anon, authenticated;
grant execute on function decrement_stock(text, int) to service_role;
