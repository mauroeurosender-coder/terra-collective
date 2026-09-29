-- Terra Collective — order placement, stock and customer stats
-- Run in Supabase → SQL Editor after 0001_init.sql. Safe to re-run.

-- Human-friendly order numbers: TC-1001, TC-1002, …
create sequence if not exists order_number_seq start 1001;

-- Places an order atomically: checks + decrements stock, upserts the customer,
-- inserts the order, its items and a first timeline event. Called by the
-- checkout route with the service role, after it has re-priced everything.
create or replace function place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  v_customer uuid;
  v_order uuid;
  v_number text := 'TC-' || nextval('order_number_seq');
  v_left int;
begin
  -- 1. Stock (locks each variant row; fails the whole order if one is short)
  for item in select * from jsonb_array_elements(p->'items') loop
    update variants set stock = stock - (item->>'quantity')::int
      where id = item->>'variant_id' and stock >= (item->>'quantity')::int
      returning stock into v_left;
    if not found then
      raise exception 'out_of_stock:%', item->>'variant_id' using errcode = 'P0001';
    end if;
  end loop;

  -- 2. Customer
  insert into customers (email, first_name, last_name, phone, country, nif, newsletter)
  values (lower(p->>'email'), p->'address'->>'firstName', p->'address'->>'lastName', p->'address'->>'phone',
          p->>'country', nullif(p->>'nif', ''), coalesce((p->>'marketing')::boolean, false))
  on conflict (email) do update set
    first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone,
    country = excluded.country, nif = coalesce(excluded.nif, customers.nif),
    newsletter = customers.newsletter or excluded.newsletter
  returning id into v_customer;

  -- 3. Order + items
  insert into orders (number, customer_id, status, email, locale, country, shipping_address, nif, subtotal, shipping,
                      shipping_method, gift_wrap, gift_message, discount_code, discount_amount, vat, total,
                      payment_method, payment_ref, utm, paid_at)
  values (v_number, v_customer, (p->>'status')::order_status, lower(p->>'email'), p->>'locale', p->>'country', p->'address',
          nullif(p->>'nif', ''), (p->>'subtotal')::int, (p->>'shipping')::int, p->>'shipping_method',
          (p->>'gift_wrap')::boolean, nullif(p->>'gift_message', ''), nullif(p->>'discount_code', ''),
          (p->>'discount_amount')::int, (p->>'vat')::int, (p->>'total')::int, p->>'payment_method', p->>'payment_ref',
          coalesce(p->'utm', '{}'::jsonb), case when p->>'status' = 'paid' then now() end)
  returning id into v_order;

  insert into order_items (order_id, product_id, variant_id, sku, name, variant_label, unit_price, quantity)
  select v_order, v.product_id, i->>'variant_id', v.sku, i->>'name', i->>'variant_label', (i->>'unit_price')::int, (i->>'quantity')::int
  from jsonb_array_elements(p->'items') i
  join variants v on v.id = i->>'variant_id';

  insert into order_events (order_id, kind, body) values (v_order, 'status', 'Order placed (' || (p->>'status') || ')');

  if nullif(p->>'discount_code', '') is not null then
    update discounts set used_count = used_count + 1 where code = p->>'discount_code';
  end if;

  return jsonb_build_object('id', v_order, 'number', v_number, 'customer_id', v_customer);
end $$;

revoke all on function place_order(jsonb) from public, anon, authenticated;
grant execute on function place_order(jsonb) to service_role;

-- Puts stock back when an order is cancelled or fully refunded from the admin.
create or replace function restock_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  update variants v set stock = v.stock + oi.quantity
  from order_items oi where oi.order_id = p_order and oi.variant_id = v.id;
end $$;

-- Customer list with lifetime value for the admin.
create or replace view customer_stats with (security_invoker = true) as
select c.*,
       count(o.id) filter (where o.status in ('paid','packing','shipped','delivered','refunded')) as order_count,
       coalesce(sum(o.total - o.refunded_amount) filter (where o.status in ('paid','packing','shipped','delivered','refunded')), 0) as lifetime_value,
       max(o.created_at) as last_order_at
from customers c
left join orders o on o.customer_id = c.id
group by c.id;
