/** Weight-bracket price tables, shared by checkout (customer prices) and profit (carrier costs). No imports: safe on client and server. */

/** One weight bracket: parcels up to `upTo` grams cost `price` cents. */
export type RateRow = { upTo: number; price: number };

/** Price for a parcel of `grams` from a weight table; heavier than the last bracket = split into several parcels. */
export function rateFor(rows: RateRow[], grams: number): { price: number; bracket: number } | null {
  const r = rows.filter((x) => x.upTo > 0).sort((a, b) => a.upTo - b.upTo);
  if (!r.length) return null;
  const hit = r.find((x) => grams <= x.upTo);
  if (hit) return { price: hit.price, bracket: hit.upTo };
  const max = r[r.length - 1];
  const full = Math.ceil(grams / max.upTo) - 1;
  const rest = grams - full * max.upTo;
  return { price: full * max.price + (r.find((x) => rest <= x.upTo) ?? max).price, bracket: max.upTo };
}
