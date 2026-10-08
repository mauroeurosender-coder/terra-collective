-- Terra Collective — certified invoicing (Moloni). Run after 0004. Safe to re-run.

alter table orders add column if not exists invoice_status text;      -- null = not handled | pending | draft | issued | error | skipped
alter table orders add column if not exists invoice_ref text;         -- Moloni document id / number
alter table orders add column if not exists invoice_error text;
alter table orders add column if not exists invoice_attempted_at timestamptz;
create index if not exists orders_invoice_status_idx on orders (invoice_status);
