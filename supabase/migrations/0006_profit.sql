-- Terra Collective — costs & profit. Run after 0005. Safe to re-run.

-- What one unit costs you (materials / purchase price), in cents.
alter table variants add column if not exists cost int check (cost is null or cost >= 0);

-- Real per-order costs (null = use the defaults from Settings → Profit).
alter table orders add column if not exists shipping_cost int;    -- CTT / courier label
alter table orders add column if not exists packaging_cost int;   -- box, paper, tape
alter table orders add column if not exists fees_cost int;        -- marketplace + payment fees

-- Other business expenses (subscriptions, materials, ads, …)
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  category text not null default 'other',
  amount int not null check (amount >= 0),       -- cents, as paid (incl. VAT)
  created_at timestamptz not null default now()
);
alter table expenses enable row level security;
drop policy if exists staff_all on expenses;
create policy staff_all on expenses for all to authenticated using (is_staff()) with check (is_staff());
create index if not exists expenses_date_idx on expenses (date);
