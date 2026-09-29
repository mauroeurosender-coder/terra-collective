-- Terra Collective — back-office extras (marketing, content, settings, analytics)
-- Run after 0002_orders.sql. Safe to re-run.

-- Test orders are shown with a TEST badge and can be filtered out of reports.
alter table orders add column if not exists test boolean not null default false;

-- Abandoned carts: link a cart to its checkout email and dedupe per browser.
alter table carts add column if not exists token text unique;
alter table carts add column if not exists locale text not null default 'en';

-- Review requests / submissions from the storefront.
alter table reviews add column if not exists email text;

-- Settings the storefront needs to read (shipping rates, VAT, payment methods, store details).
drop policy if exists public_read on settings;
create policy public_read on settings for select to anon, authenticated
  using (key in ('announcement', 'hero', 'featured_collections', 'shipping', 'vat', 'payments', 'store'));

-- Customer search by lifetime value etc. (re-created so new order columns are picked up).
create or replace view customer_stats with (security_invoker = true) as
select c.*,
       count(o.id) filter (where o.status in ('paid','packing','shipped','delivered','refunded')) as order_count,
       coalesce(sum(o.total - o.refunded_amount) filter (where o.status in ('paid','packing','shipped','delivered','refunded')), 0) as lifetime_value,
       max(o.created_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id
group by c.id;

-- Gift card redemption at checkout (called by place_order's caller after success).
create or replace function redeem_gift_card(p_code text, p_amount int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update gift_cards set balance = greatest(0, balance - p_amount) where code = p_code;
end $$;
revoke all on function redeem_gift_card(text, int) from public, anon, authenticated;
grant execute on function redeem_gift_card(text, int) to service_role;

-- Analytics helpers
create index if not exists analytics_events_time_idx on analytics_events (created_at desc);
