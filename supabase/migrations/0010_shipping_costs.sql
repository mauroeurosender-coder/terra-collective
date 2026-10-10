-- Terra Collective — product weights (for carrier rate tables) and import duties per order.
-- Run after 0009. Safe to re-run.

alter table variants add column if not exists weight_g int check (weight_g is null or weight_g >= 0); -- grams, one unit packed
alter table orders add column if not exists duties_cost int;                                            -- cents, real duties/import fees paid (e.g. Zonos); null = estimate
