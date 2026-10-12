-- Terra Collective — customs info per product, for the CTT bulk-label file.
-- Run after 0011. Safe to re-run.
alter table products add column if not exists customs_desc text; -- short English description for customs, e.g. "Ceramic sardine ornament"
alter table products add column if not exists hs_code text;      -- customs tariff code (código pautal), e.g. 6913909890
