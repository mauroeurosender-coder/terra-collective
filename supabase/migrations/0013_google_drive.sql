-- Terra Collective — copies of accounting documents and issued invoices in the owner's Google Drive.
-- Run after 0012. Safe to re-run.
alter table accounting_docs add column if not exists drive_file_id text;  -- file in Drive
alter table accounting_docs add column if not exists drive_parent text;   -- its folder id (to move it when the date/type changes)
alter table accounting_docs add column if not exists drive_name text;     -- its name (to rename it when edited)
alter table orders add column if not exists invoice_drive_id text;        -- Moloni invoice PDF copied to Drive
