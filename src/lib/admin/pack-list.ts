import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { packLines, type PackLine } from "./pack-names";

/** One order as it appears on the pack list: who, where, what they paid and what goes in the box. */
export type PackOrder = {
  id: string;
  number: string;
  status: string;
  source: string;
  country: string;
  name: string;
  /** What the customer paid for the order (cents), without refunds or tax a marketplace (Etsy) keeps. */
  paid: number;
  createdAt: string;
  /** Ship date as set on Etsy (can be a later day than when the order was marked shipped). */
  shippedAt: string | null;
  /** When the order was marked shipped (first "shipped" event); falls back to shippedAt. */
  markedAt: string | null;
  /** Short names, with sets counted as pieces ("Set of Six Sardines" ×1 → 6). */
  items: PackLine[];
};

type Row = {
  id: string;
  number: string;
  status: string;
  source: string | null;
  country: string;
  total: number;
  vat: number | null;
  refunded_amount: number;
  created_at: string;
  shipped_at: string | null;
  shipping_address: { firstName?: string; lastName?: string; company?: string } | null;
  order_items: { name: string; variant_label: string | null; quantity: number }[];
};

const SELECT = "id, number, status, source, country, total, vat, refunded_amount, created_at, shipped_at, shipping_address, order_items(name, variant_label, quantity)";

const toPack = (o: Row): PackOrder => {
  const a = o.shipping_address ?? {};
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    source: o.source ?? "web",
    country: o.country,
    name: [a.firstName, a.lastName].filter(Boolean).join(" ") || a.company || "",
    paid: o.total - o.refunded_amount - (o.source === "etsy" ? (o.vat ?? 0) : 0),
    createdAt: o.created_at,
    shippedAt: o.shipped_at,
    markedAt: o.shipped_at,
    items: o.order_items.flatMap((i) => packLines(i.name, i.variant_label ?? "", i.quantity)),
  };
};

/** Orders to fulfil (all) and shipped in the last `shippedDays` days, for choosing what to print. */
export async function loadPackCandidates(sb: SupabaseClient, shippedDays = 30) {
  const since = new Date(Date.now() - shippedDays * 86_400_000).toISOString();
  // Supabase returns at most 1,000 rows per request: read long ranges in pages.
  const shippedSince = async () => {
    const out: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from("orders").select(SELECT).eq("test", false).in("status", ["shipped", "delivered"]).gte("shipped_at", since).order("shipped_at", { ascending: false }).range(from, from + 999);
      out.push(...((data ?? []) as Row[]));
      if (!data || data.length < 1000) return out;
    }
  };
  const [{ data: open }, shipped] = await Promise.all([
    sb.from("orders").select(SELECT).eq("test", false).in("status", ["paid", "packing"]).order("created_at"),
    shippedSince(),
  ]);
  const list = shipped.map(toPack);
  // Etsy stores the ship date chosen when marking (often tomorrow or later); the order log knows when it was really marked.
  const ids = list.map((o) => o.id);
  const marked = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb.from("order_events").select("order_id, created_at").in("order_id", ids.slice(i, i + 150)).eq("kind", "status").ilike("body", "%shipped%").order("created_at");
    for (const e of (data ?? []) as { order_id: string; created_at: string }[]) if (!marked.has(e.order_id)) marked.set(e.order_id, e.created_at);
  }
  for (const o of list) {
    const m = marked.get(o.id);
    if (m && (!o.shippedAt || m < o.shippedAt)) o.markedAt = m;
  }
  list.sort((a, b) => (b.markedAt ?? "").localeCompare(a.markedAt ?? ""));
  return { open: ((open ?? []) as Row[]).map(toPack), shipped: list };
}

export async function loadPackOrders(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data } = await sb.from("orders").select(SELECT).in("id", ids.slice(0, 300));
  const byId = new Map(((data ?? []) as Row[]).map((o) => [o.id, toPack(o)]));
  // Keep the order the rows were chosen in.
  return ids.map((id) => byId.get(id)).filter((o): o is PackOrder => Boolean(o));
}
