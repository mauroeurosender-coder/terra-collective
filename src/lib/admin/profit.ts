import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeSettings, type ProfitSettings, type RateRow, type RateZone } from "../settings";
import type { Range } from "./types";

// Countries CTT prices as "Europe" (EU + the rest of geographic Europe).
const EUROPE_EXTRA = new Set(["GB", "CH", "NO", "IS", "LI", "AD", "MC", "SM", "VA", "AL", "BA", "ME", "MK", "RS", "XK", "MD", "UA", "BY", "GI", "FO", "GL"]);
const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

export type OrderRow = {
  id: string;
  number: string;
  created_at: string;
  source: string;
  status: string;
  country: string;
  subtotal: number;
  discount_amount: number;
  shipping: number;
  shipping_method: string;
  vat: number;
  total: number;
  refunded_amount: number;
  payment_method: string | null;
  shipping_cost: number | null;
  packaging_cost: number | null;
  fees_cost: number | null;
  duties_cost?: number | null;
  order_items: {
    quantity: number;
    unit_price: number;
    variant_id: string | null;
    name: string;
    variant_label?: string | null;
    variants: { cost: number | null; weight_g?: number | null } | null;
    products: { slug: string; name: { en: string }; variants?: { cost: number | null; weight_g: number | null }[] } | null;
  }[];
};

/** "Set of 3", "Pack of 5", "3 pcs", "Conjunto de 3" → 3; otherwise 1. */
export function setSize(label: string | null | undefined) {
  const m = (label ?? "").match(/(?:set|pack|lot|box|bundle|conjunto) (?:of|de) (\d+)|\b(\d+)\s*(?:x|pcs|pieces|units|sardines|sardinhas)\b/i);
  const n = Number(m?.[1] ?? m?.[2] ?? 1);
  return n >= 1 && n <= 50 ? n : 1;
}

/**
 * Cost and weight of one unit of an order line. Lines linked to a variant use it; lines that aren’t
 * (e.g. an Etsy "Set of 3" option the website doesn’t have) use the product’s per-piece values × the set size.
 */
export function lineUnit(i: OrderRow["order_items"][number]): { cost: number | null; weight: number | null } {
  if (i.variants) return { cost: i.variants.cost, weight: i.variants.weight_g ?? null };
  const vs = i.products?.variants ?? [];
  const k = setSize(i.variant_label);
  const cost = vs.find((v) => v.cost != null)?.cost;
  const weight = vs.find((v) => v.weight_g != null)?.weight_g;
  return { cost: cost == null ? null : cost * k, weight: weight == null ? null : weight * k };
}

export type OrderProfit = {
  revenue: number; // net of VAT owed and marketplace-collected tax
  vatOwed: number;
  cogs: number;
  shipping: number;
  packaging: number;
  fees: number;
  duties: number;
  profit: number;
  missingCost: number; // units sold without a cost
  estimated: { shipping: boolean; packaging: boolean; fees: boolean; duties: boolean };
  /** How the shipping estimate was found, for the order page. */
  ship: { grams: number | null; missingWeight: number; basis: "real" | "table" | "flat" | "none"; carrier?: string; bracket?: number };
};

export const rateZone = (country: string): RateZone => (country === "PT" ? "PT" : country === "US" ? "US" : EU.has(country) || EUROPE_EXTRA.has(country) ? "EUROPE" : "ROW");

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

/** Profit for one order with the given default costs. All money in cents. */
export function orderProfit(o: OrderRow, p: ProfitSettings): OrderProfit {
  const refundedShare = o.total ? Math.min(1, o.refunded_amount / o.total) : 0;
  const marketplaceTax = o.source === "etsy" ? o.vat : 0;
  const kept = Math.max(0, o.total - o.refunded_amount - marketplaceTax * (1 - refundedShare));
  // VAT you owe the State: included in EU/PT sales; exports are exempt; Etsy’s own taxes are not yours.
  const vatOwed = o.source === "etsy" ? (EU.has(o.country) ? Math.round((kept * 23) / 123) : 0) : Math.round(o.vat * (1 - refundedShare));
  const revenue = kept - vatOwed;

  const fullyRefunded = refundedShare >= 0.999;
  let cogs = 0;
  let missingCost = 0;
  if (!fullyRefunded) {
    for (const i of o.order_items) {
      const c = lineUnit(i).cost;
      if (c == null) missingCost += i.quantity;
      else cogs += c * i.quantity;
    }
  }
  const zone = o.country === "PT" ? "PT" : EU.has(o.country) ? "EU" : "ROW";
  const ships = o.shipping_method !== "pickup";
  // Shipping: real label cost > weight table (CTT, or FedEx for heavy parcels) > flat amount per zone.
  let missingWeight = 0;
  let grams = p.packagingWeight ?? 0;
  for (const i of o.order_items) {
    const w = lineUnit(i).weight;
    if (w == null) missingWeight += i.quantity;
    else grams += w * i.quantity;
  }
  let ship: OrderProfit["ship"] = { grams: missingWeight ? null : grams, missingWeight, basis: "none" };
  let tableShipping: number | null = null;
  if (ships && !missingWeight && p.carriers) {
    const heavy = p.bulkAboveGrams != null && grams > p.bulkAboveGrams;
    const carrier = heavy && p.carriers.fedex.zones[rateZone(o.country)]?.length ? p.carriers.fedex : p.carriers.ctt;
    const hit = rateFor(carrier.zones[rateZone(o.country)] ?? [], grams);
    if (hit) {
      tableShipping = hit.price;
      ship = { ...ship, basis: "table", carrier: carrier.name, bracket: hit.bracket };
    }
  }
  if (ships && tableShipping == null) ship = { ...ship, basis: "flat" };
  if (o.shipping_cost != null) ship = { ...ship, basis: "real" };
  const shipping = o.shipping_cost ?? (ships ? (tableShipping ?? p.shipping[zone]) : 0);
  const packaging = o.packaging_cost ?? (ships ? p.packaging : 0);
  const units = o.order_items.reduce((n, i) => n + i.quantity, 0);
  const estFees =
    o.source === "etsy"
      ? Math.round(((o.subtotal - o.discount_amount + o.shipping) * p.etsy.transactionPct) / 100 + (o.total * p.etsy.processingPct) / 100 + p.etsy.processingFixed + units * p.etsy.listingFee)
      : o.source === "web" && /card|paypal|klarna|mbway|multibanco|apple|google/i.test(o.payment_method ?? "")
        ? Math.round((o.total * p.stripe.pct) / 100 + p.stripe.fixed)
        : 0;
  const fees = o.fees_cost ?? estFees;
  // Import duties paid up front (e.g. 10% of the goods value for the US via Zonos).
  const rule = (p.duties ?? []).find((d) => d.country === o.country);
  const goods = Math.max(0, o.subtotal - o.discount_amount);
  const estDuties = rule && ships && !fullyRefunded ? Math.round((goods * rule.pct) / 100 + rule.fixed) : 0;
  const duties = o.duties_cost ?? estDuties;
  return {
    revenue,
    vatOwed,
    cogs,
    shipping,
    packaging,
    fees,
    duties,
    profit: revenue - cogs - shipping - packaging - fees - duties,
    missingCost,
    estimated: { shipping: o.shipping_cost == null, packaging: o.packaging_cost == null, fees: o.fees_cost == null, duties: o.duties_cost == null },
    ship,
  };
}

export type ProfitReport = {
  totals: { revenue: number; vatOwed: number; cogs: number; shipping: number; packaging: number; fees: number; duties: number; shippingCharged: number; expenses: number; profit: number; orders: number; margin: number };
  prev: { revenue: number; profit: number; margin: number };
  channels: { channel: string; orders: number; revenue: number; costs: number; profit: number }[];
  products: { slug: string; name: string; units: number; revenue: number; cogs: number; profit: number; missingCost: boolean }[];
  months: { month: string; revenue: number; costs: number; profit: number }[];
  expensesByCategory: { category: string; amount: number }[];
  missing: { unitsWithoutCost: number; variantsWithoutCost: number };
  estimatedShare: number; // share of orders using default shipping/fees
  flatShippingOrders: number; // orders whose shipping used the flat amount (missing weights or empty table)
};

const SELECT =
  "id, number, created_at, source, status, country, subtotal, discount_amount, shipping, shipping_method, vat, total, refunded_amount, payment_method, shipping_cost, packaging_cost, fees_cost, duties_cost, invoice_ref, order_items(quantity, unit_price, variant_id, name, variant_label, variants(cost, weight_g), products(slug, name, variants(cost, weight_g)))";

export async function loadProfitOrders(sb: SupabaseClient, from: Date, to: Date) {
  const rows: OrderRow[] = [];
  for (let off = 0; ; off += 1000) {
    const { data } = await sb
      .from("orders")
      .select(SELECT)
      .in("status", ["paid", "packing", "shipped", "delivered", "refunded"])
      .eq("test", false)
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at")
      .range(off, off + 999);
    rows.push(...((data ?? []) as unknown as OrderRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function getProfitReport(sb: SupabaseClient, range: Range): Promise<ProfitReport> {
  const [{ data: sets }, orders, prevOrders, { data: exps }, { data: prevExps }, { count: variantsWithoutCost }] = await Promise.all([
    sb.from("settings").select("key, value"),
    loadProfitOrders(sb, range.from, range.to),
    loadProfitOrders(sb, range.prevFrom, range.prevTo),
    sb.from("expenses").select("category, amount").gte("date", range.from.toISOString().slice(0, 10)).lt("date", range.to.toISOString().slice(0, 10)),
    sb.from("expenses").select("amount").gte("date", range.prevFrom.toISOString().slice(0, 10)).lt("date", range.prevTo.toISOString().slice(0, 10)),
    sb.from("variants").select("id, products!inner(status)", { count: "exact", head: true }).is("cost", null).neq("products.status", "archived"),
  ]);
  const p = mergeSettings(sets ?? []).profit;

  const t = { revenue: 0, vatOwed: 0, cogs: 0, shipping: 0, packaging: 0, fees: 0, duties: 0, shippingCharged: 0, expenses: 0, profit: 0, orders: 0, margin: 0 };
  let flatShippingOrders = 0;
  const ch = new Map<string, { channel: string; orders: number; revenue: number; costs: number; profit: number }>();
  const prod = new Map<string, ProfitReport["products"][number]>();
  const months = new Map<string, { month: string; revenue: number; costs: number; profit: number }>();
  let unitsWithoutCost = 0;
  let estimatedOrders = 0;

  for (const o of orders) {
    const r = orderProfit(o, p);
    t.revenue += r.revenue;
    t.vatOwed += r.vatOwed;
    t.cogs += r.cogs;
    t.shipping += r.shipping;
    t.packaging += r.packaging;
    t.fees += r.fees;
    t.duties += r.duties;
    t.shippingCharged += o.shipping;
    t.profit += r.profit;
    if (r.ship.basis === "flat") flatShippingOrders++;
    t.orders++;
    unitsWithoutCost += r.missingCost;
    if (r.estimated.shipping || r.estimated.fees) estimatedOrders++;
    const costs = r.cogs + r.shipping + r.packaging + r.fees + r.duties;

    const name = o.source === "etsy" ? "Etsy" : o.source === "manual" ? "Manual" : "Website";
    const c = ch.get(name) ?? { channel: name, orders: 0, revenue: 0, costs: 0, profit: 0 };
    c.orders++;
    c.revenue += r.revenue;
    c.costs += costs;
    c.profit += r.profit;
    ch.set(name, c);

    const mk = o.created_at.slice(0, 7);
    const m = months.get(mk) ?? { month: mk, revenue: 0, costs: 0, profit: 0 };
    m.revenue += r.revenue;
    m.costs += costs;
    m.profit += r.profit;
    months.set(mk, m);

    // Per product: share the order’s revenue and order-level costs by item value.
    const itemsValue = o.order_items.reduce((n, i) => n + i.unit_price * i.quantity, 0) || 1;
    const orderLevel = r.shipping + r.packaging + r.fees + r.duties;
    for (const i of o.order_items) {
      const share = (i.unit_price * i.quantity) / itemsValue;
      const key = i.products?.slug ?? i.name;
      const x = prod.get(key) ?? { slug: i.products?.slug ?? "", name: i.products?.name.en ?? i.name, units: 0, revenue: 0, cogs: 0, profit: 0, missingCost: false };
      const unitCost = lineUnit(i).cost;
      const itemCogs = unitCost != null ? unitCost * i.quantity : 0;
      x.units += i.quantity;
      x.revenue += Math.round(r.revenue * share);
      x.cogs += itemCogs;
      x.profit += Math.round(r.revenue * share - itemCogs - orderLevel * share);
      if (unitCost == null) x.missingCost = true;
      prod.set(key, x);
    }
  }

  const expenseMap = new Map<string, number>();
  for (const e of exps ?? []) expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + e.amount);
  t.expenses = [...expenseMap.values()].reduce((a, b) => a + b, 0);
  t.profit -= t.expenses;
  t.margin = t.revenue ? t.profit / t.revenue : 0;

  let prevRevenue = 0;
  let prevProfit = 0;
  for (const o of prevOrders) {
    const r = orderProfit(o, p);
    prevRevenue += r.revenue;
    prevProfit += r.profit;
  }
  prevProfit -= (prevExps ?? []).reduce((n, e) => n + e.amount, 0);

  return {
    totals: t,
    prev: { revenue: prevRevenue, profit: prevProfit, margin: prevRevenue ? prevProfit / prevRevenue : 0 },
    channels: [...ch.values()].sort((a, b) => b.revenue - a.revenue),
    products: [...prod.values()].sort((a, b) => b.profit - a.profit),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    expensesByCategory: [...expenseMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    missing: { unitsWithoutCost, variantsWithoutCost: variantsWithoutCost ?? 0 },
    estimatedShare: orders.length ? estimatedOrders / orders.length : 0,
    flatShippingOrders,
  };
}
