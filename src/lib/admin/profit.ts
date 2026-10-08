import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeSettings, type ProfitSettings } from "../settings";
import type { Range } from "./types";

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
  order_items: { quantity: number; unit_price: number; variant_id: string | null; name: string; variants: { cost: number | null } | null; products: { slug: string; name: { en: string } } | null }[];
};

export type OrderProfit = {
  revenue: number; // net of VAT owed and marketplace-collected tax
  vatOwed: number;
  cogs: number;
  shipping: number;
  packaging: number;
  fees: number;
  profit: number;
  missingCost: number; // units sold without a cost
  estimated: { shipping: boolean; packaging: boolean; fees: boolean };
};

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
      const c = i.variants?.cost;
      if (c == null) missingCost += i.quantity;
      else cogs += c * i.quantity;
    }
  }
  const zone = o.country === "PT" ? "PT" : EU.has(o.country) ? "EU" : "ROW";
  const ships = o.shipping_method !== "pickup";
  const shipping = o.shipping_cost ?? (ships ? p.shipping[zone] : 0);
  const packaging = o.packaging_cost ?? (ships ? p.packaging : 0);
  const units = o.order_items.reduce((n, i) => n + i.quantity, 0);
  const estFees =
    o.source === "etsy"
      ? Math.round(((o.subtotal - o.discount_amount + o.shipping) * p.etsy.transactionPct) / 100 + (o.total * p.etsy.processingPct) / 100 + p.etsy.processingFixed + units * p.etsy.listingFee)
      : o.source === "web" && /card|paypal|klarna|mbway|multibanco|apple|google/i.test(o.payment_method ?? "")
        ? Math.round((o.total * p.stripe.pct) / 100 + p.stripe.fixed)
        : 0;
  const fees = o.fees_cost ?? estFees;
  return {
    revenue,
    vatOwed,
    cogs,
    shipping,
    packaging,
    fees,
    profit: revenue - cogs - shipping - packaging - fees,
    missingCost,
    estimated: { shipping: o.shipping_cost == null, packaging: o.packaging_cost == null, fees: o.fees_cost == null },
  };
}

export type ProfitReport = {
  totals: { revenue: number; vatOwed: number; cogs: number; shipping: number; packaging: number; fees: number; expenses: number; profit: number; orders: number; margin: number };
  prev: { revenue: number; profit: number; margin: number };
  channels: { channel: string; orders: number; revenue: number; costs: number; profit: number }[];
  products: { slug: string; name: string; units: number; revenue: number; cogs: number; profit: number; missingCost: boolean }[];
  months: { month: string; revenue: number; costs: number; profit: number }[];
  expensesByCategory: { category: string; amount: number }[];
  missing: { unitsWithoutCost: number; variantsWithoutCost: number };
  estimatedShare: number; // share of orders using default shipping/fees
};

const SELECT =
  "id, number, created_at, source, status, country, subtotal, discount_amount, shipping, shipping_method, vat, total, refunded_amount, payment_method, shipping_cost, packaging_cost, fees_cost, invoice_ref, order_items(quantity, unit_price, variant_id, name, variants(cost), products(slug, name))";

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

  const t = { revenue: 0, vatOwed: 0, cogs: 0, shipping: 0, packaging: 0, fees: 0, expenses: 0, profit: 0, orders: 0, margin: 0 };
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
    t.profit += r.profit;
    t.orders++;
    unitsWithoutCost += r.missingCost;
    if (r.estimated.shipping || r.estimated.fees) estimatedOrders++;
    const costs = r.cogs + r.shipping + r.packaging + r.fees;

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
    const orderLevel = r.shipping + r.packaging + r.fees;
    for (const i of o.order_items) {
      const share = (i.unit_price * i.quantity) / itemsValue;
      const key = i.products?.slug ?? i.name;
      const x = prod.get(key) ?? { slug: i.products?.slug ?? "", name: i.products?.name.en ?? i.name, units: 0, revenue: 0, cogs: 0, profit: 0, missingCost: false };
      const itemCogs = i.variants?.cost != null ? i.variants.cost * i.quantity : 0;
      x.units += i.quantity;
      x.revenue += Math.round(r.revenue * share);
      x.cogs += itemCogs;
      x.profit += Math.round(r.revenue * share - itemCogs - orderLevel * share);
      if (i.variants?.cost == null) x.missingCost = true;
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
  };
}
