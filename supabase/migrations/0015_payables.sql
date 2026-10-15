-- Terra Collective — supplier invoices: due date, payment date and each supplier's payment terms.
-- Run after 0014. Safe to re-run.
alter table accounting_docs add column if not exists due_date date; -- when it must be paid
alter table accounting_docs add column if not exists paid_on date;  -- null = still to pay

-- Payment terms per supplier (by VAT number, or by name when there is none). 0 days = paid on receipt.
create table if not exists supplier_terms (
  key text primary key,
  name text,
  days int not null default 0 check (days between 0 and 365),
  updated_at timestamptz not null default now()
);
alter table supplier_terms enable row level security;
drop policy if exists owner_all on supplier_terms;
create policy owner_all on supplier_terms for all to authenticated using (is_owner()) with check (is_owner());

create index if not exists accounting_docs_unpaid_idx on accounting_docs (due_date) where paid_on is null and direction = 'purchase';
