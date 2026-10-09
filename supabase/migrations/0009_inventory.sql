-- Terra Collective — inventory items (components), product compositions and stock movements.
-- A sellable variant can be made of inventory items (e.g. "Deck + 3 sardines" = 1 deck + 3 sardines).
-- Purchases add to items, sales (website, Etsy, manual) subtract from items, refunds put them back.
-- Variant stock = how many can be assembled; variant cost = sum of component costs.
-- Run after 0008. Safe to re-run.

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  keywords text[] not null default '{}',     -- words that identify it on supplier invoices (e.g. latas, cartas, baralho)
  stock int not null default 0,
  unit_cost int,                             -- cents, weighted average purchase cost (without deductible VAT)
  low_stock int not null default 5,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists variant_components (
  variant_id text not null references variants on delete cascade,
  item_id uuid not null references inventory_items on delete cascade,
  qty int not null default 1 check (qty > 0),
  primary key (variant_id, item_id)
);

create table if not exists inventory_movements (
  id bigint generated always as identity primary key,
  item_id uuid not null references inventory_items on delete cascade,
  qty int not null,                          -- + in, − out
  reason text not null,                      -- purchase | credit_note | sale | return | adjust
  ref text,                                  -- order number / document id
  unit_cost int,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_idx on inventory_movements (item_id, created_at desc);

alter table accounting_doc_lines add column if not exists item_id uuid references inventory_items on delete set null;

alter table inventory_items enable row level security;
alter table variant_components enable row level security;
alter table inventory_movements enable row level security;
drop policy if exists staff_all on inventory_items;
create policy staff_all on inventory_items for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists staff_all on variant_components;
create policy staff_all on variant_components for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists staff_read on inventory_movements;
create policy staff_read on inventory_movements for select to authenticated using (is_staff());

-- Recalculate stock (how many can be assembled) and cost of every variant that uses these items.
create or replace function refresh_composed_variants(p_items uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  update variants v set
    stock = sub.can_make,
    cost = coalesce(sub.cost, v.cost)
  from (
    select vc.variant_id,
           min(floor(greatest(i.stock, 0)::numeric / vc.qty))::int as can_make,
           case when bool_and(i.unit_cost is not null) then sum(i.unit_cost * vc.qty)::int end as cost
    from variant_components vc
    join inventory_items i on i.id = vc.item_id
    where vc.variant_id in (select variant_id from variant_components where item_id = any(p_items))
    group by vc.variant_id
  ) sub
  where v.id = sub.variant_id;
end $$;

-- Applies a sale (p_qty > 0) or a return (p_qty < 0) of a variant: components if it has any, else the variant itself.
create or replace function apply_sale(p_variant text, p_qty int, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare
  items uuid[];
begin
  select array_agg(item_id) into items from variant_components where variant_id = p_variant;
  if items is null then
    update variants set stock = greatest(0, stock - p_qty) where id = p_variant;
    return;
  end if;
  update inventory_items i set stock = i.stock - p_qty * vc.qty
  from variant_components vc where vc.variant_id = p_variant and vc.item_id = i.id;
  insert into inventory_movements (item_id, qty, reason, ref, unit_cost)
  select vc.item_id, -p_qty * vc.qty, case when p_qty > 0 then 'sale' else 'return' end, p_ref, i.unit_cost
  from variant_components vc join inventory_items i on i.id = vc.item_id where vc.variant_id = p_variant;
  perform refresh_composed_variants(items);
end $$;

-- Purchase (p_qty > 0) or supplier credit note (p_qty < 0) of an inventory item. Owner only.
create or replace function receive_item(p_item uuid, p_qty int, p_unit_cost int, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'forbidden'; end if;
  update inventory_items set
    unit_cost = case
      when p_qty > 0 and p_unit_cost is not null and unit_cost is not null and stock > 0
        then round((stock * unit_cost + p_qty * p_unit_cost)::numeric / (stock + p_qty))::int
      when p_qty > 0 and p_unit_cost is not null then p_unit_cost
      else unit_cost end,
    stock = stock + p_qty
  where id = p_item;
  insert into inventory_movements (item_id, qty, reason, ref, unit_cost)
  values (p_item, p_qty, case when p_qty > 0 then 'purchase' else 'credit_note' end, p_ref, p_unit_cost);
  perform refresh_composed_variants(array[p_item]);
end $$;

-- Manual stock count / correction. Staff.
create or replace function adjust_item(p_item uuid, p_new_stock int, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  old int;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select stock into old from inventory_items where id = p_item for update;
  update inventory_items set stock = p_new_stock where id = p_item;
  insert into inventory_movements (item_id, qty, reason, ref) values (p_item, p_new_stock - old, 'adjust', p_note);
  perform refresh_composed_variants(array[p_item]);
end $$;

-- Recompute one variant after its composition changed. Staff.
create or replace function refresh_variant(p_variant text) returns void
language plpgsql security definer set search_path = public as $$
declare
  items uuid[];
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select array_agg(item_id) into items from variant_components where variant_id = p_variant;
  if items is not null then perform refresh_composed_variants(items); end if;
end $$;

-- Etsy (and any server-side) sale: now consumes components when the variant has them.
create or replace function decrement_stock(p_variant text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform apply_sale(p_variant, p_qty, 'etsy');
end $$;

-- Cancellations / refunds put components (or variant stock) back.
create or replace function restock_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_number text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select number into v_number from orders where id = p_order;
  for r in select variant_id, quantity from order_items where order_id = p_order and variant_id is not null loop
    perform apply_sale(r.variant_id, -r.quantity, v_number);
  end loop;
end $$;

-- Website / manual orders: same checks as before, but stock leaves through apply_sale (components aware).
create or replace function place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  v_customer uuid;
  v_order uuid;
  v_number text := 'TC-' || nextval('order_number_seq');
  v_available int;
begin
  -- 1. Stock: lock each variant and check it can be sold (for composed variants, stock = how many can be assembled)
  for item in select * from jsonb_array_elements(p->'items') loop
    select stock into v_available from variants where id = item->>'variant_id' for update;
    if v_available is null or v_available < (item->>'quantity')::int then
      raise exception 'out_of_stock:%', item->>'variant_id' using errcode = 'P0001';
    end if;
    perform apply_sale(item->>'variant_id', (item->>'quantity')::int, v_number);
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
revoke all on function decrement_stock(text, int) from public, anon, authenticated;
grant execute on function decrement_stock(text, int) to service_role;
revoke all on function apply_sale(text, int, text) from public, anon, authenticated;
grant execute on function apply_sale(text, int, text) to service_role;
revoke all on function refresh_composed_variants(uuid[]) from public, anon, authenticated;
grant execute on function refresh_composed_variants(uuid[]) to service_role;
revoke all on function receive_item(uuid, int, int, text) from public, anon;
grant execute on function receive_item(uuid, int, int, text) to authenticated, service_role;
revoke all on function adjust_item(uuid, int, text) from public, anon;
grant execute on function adjust_item(uuid, int, text) to authenticated, service_role;
revoke all on function refresh_variant(text) from public, anon;
grant execute on function refresh_variant(text) to authenticated, service_role;
