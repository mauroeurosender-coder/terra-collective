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
  shippedAt: string | null;
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
    items: o.order_items.flatMap((i) => packLines(i.name, i.variant_label ?? "", i.quantity)),
  };
};

/** Orders to fulfil (all) and shipped in the last `shippedDays` days, for choosing what to print. */
export async function loadPackCandidates(sb: SupabaseClient, shippedDays = 30) {
  const since = new Date(Date.now() - shippedDays * 86_400_000).toISOString();
  const [{ data: open }, { data: shipped }] = await Promise.all([
    sb.from("orders").select(SELECT).eq("test", false).in("status", ["paid", "packing"]).order("created_at"),
    sb.from("orders").select(SELECT).eq("test", false).eq("status", "shipped").gte("shipped_at", since).order("shipped_at", { ascending: false }),
  ]);
  return { open: ((open ?? []) as Row[]).map(toPack), shipped: ((shipped ?? []) as Row[]).map(toPack) };
}

export async function loadPackOrders(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data } = await sb.from("orders").select(SELECT).in("id", ids.slice(0, 300));
  const byId = new Map(((data ?? []) as Row[]).map((o) => [o.id, toPack(o)]));
  // Keep the order the rows were chosen in.
  return ids.map((id) => byId.get(id)).filter((o): o is PackOrder => Boolean(o));
}
