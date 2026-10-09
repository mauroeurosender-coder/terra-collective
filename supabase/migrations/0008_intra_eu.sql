-- Terra Collective — intra-EU purchases: VIES check result per document. Run after 0007. Safe to re-run.
alter table accounting_docs add column if not exists vies_valid boolean;
alter table accounting_docs add column if not exists vies_name text;
alter table accounting_docs add column if not exists vies_checked_at timestamptz;
