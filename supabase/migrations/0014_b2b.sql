-- Terra Collective — B2B orders (Faire): VIES result of the retailer's VAT number.
-- Run after 0013. Safe to re-run.
alter table orders add column if not exists vies_valid boolean; -- true = valid EU VAT number (intra-EU supply exempt, art. 14.º RITI)
