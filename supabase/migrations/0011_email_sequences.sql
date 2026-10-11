-- Terra Collective — automated email sequences (abandoned cart, welcome, after purchase, win-back, back in stock).
-- Run after 0010. Safe to re-run.

-- One row per email step sent (or skipped) to one recipient; the unique key makes each step go out once.
create table if not exists email_sends (
  id bigint generated always as identity primary key,
  sequence text not null,          -- cart | welcome | post_purchase | winback | back_in_stock
  step int not null,               -- 0-based step index
  ref text not null,               -- cart id / subscriber id / order id / customer+order / request id
  email text not null,
  status text not null,            -- sent | skipped | failed
  detail text,
  created_at timestamptz not null default now(),
  unique (sequence, step, ref)
);
create index if not exists email_sends_created_idx on email_sends (created_at desc);

-- People who clicked "unsubscribe": no sequence emails at all.
create table if not exists email_suppressions (
  email text primary key,
  reason text not null default 'unsubscribed',
  created_at timestamptz not null default now()
);

alter table email_sends enable row level security;
alter table email_suppressions enable row level security;
drop policy if exists staff_read on email_sends;
create policy staff_read on email_sends for select to authenticated using (is_staff());
drop policy if exists staff_all on email_suppressions;
create policy staff_all on email_suppressions for all to authenticated using (is_staff()) with check (is_staff());
