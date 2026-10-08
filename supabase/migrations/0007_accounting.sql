-- Terra Collective — accounting: purchase invoices, credit notes, quarterly folders, tax calendar.
-- Run after 0006. Safe to re-run.

do $$ begin create type acc_direction as enum ('purchase', 'sale'); exception when duplicate_object then null; end $$;
do $$ begin create type acc_kind as enum ('invoice', 'credit_note', 'receipt', 'other'); exception when duplicate_object then null; end $$;

create table if not exists accounting_docs (
  id uuid primary key default gen_random_uuid(),
  direction acc_direction not null default 'purchase',
  kind acc_kind not null default 'invoice',
  status text not null default 'draft',              -- draft (being reviewed) | confirmed
  party_name text,                                    -- supplier (purchases) or customer (sales credit notes)
  party_nif text,
  party_country text default 'PT',
  number text,                                        -- document number, e.g. FT 2026/123
  date date,
  net int not null default 0,                         -- cents, without VAT
  vat int not null default 0,                         -- cents
  total int not null default 0,                       -- cents
  vat_lines jsonb not null default '[]',              -- [{ rate, base, vat }]
  category text not null default 'goods',             -- goods (stock for resale) | materials | services | other
  deductible boolean not null default true,           -- VAT can be deducted
  file_path text,                                     -- in the private 'accounting' bucket
  file_name text,
  extraction jsonb,                                   -- raw result of automatic reading
  stock_applied boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounting_docs_date_idx on accounting_docs (date);

create table if not exists accounting_doc_lines (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references accounting_docs on delete cascade,
  position int not null default 0,
  description text not null default '',
  quantity numeric not null default 1,
  unit_net int not null default 0,                    -- cents, without VAT
  vat_rate numeric not null default 23,
  variant_id text references variants on delete set null,
  apply_stock boolean not null default true
);

drop trigger if exists accounting_docs_touch on accounting_docs;
create trigger accounting_docs_touch before update on accounting_docs for each row execute function touch_updated_at();

alter table accounting_docs enable row level security;
alter table accounting_doc_lines enable row level security;
drop policy if exists owner_all on accounting_docs;
create policy owner_all on accounting_docs for all to authenticated using (is_owner()) with check (is_owner());
drop policy if exists owner_all on accounting_doc_lines;
create policy owner_all on accounting_doc_lines for all to authenticated using (is_owner()) with check (is_owner());

-- Private file storage for invoices (never public).
insert into storage.buckets (id, name, public) values ('accounting', 'accounting', false) on conflict (id) do update set public = false;
drop policy if exists "accounting owner read" on storage.objects;
create policy "accounting owner read" on storage.objects for select to authenticated using (bucket_id = 'accounting' and is_owner());
drop policy if exists "accounting owner write" on storage.objects;
create policy "accounting owner write" on storage.objects for insert to authenticated with check (bucket_id = 'accounting' and is_owner());
drop policy if exists "accounting owner delete" on storage.objects;
create policy "accounting owner delete" on storage.objects for delete to authenticated using (bucket_id = 'accounting' and is_owner());

-- Stock change from a purchase, atomically (positive adds, negative removes, never below zero).
create or replace function adjust_stock(p_variant text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'forbidden'; end if;
  update variants set stock = greatest(0, stock + p_qty) where id = p_variant;
end $$;
revoke all on function adjust_stock(text, int) from public, anon;
grant execute on function adjust_stock(text, int) to authenticated, service_role;
