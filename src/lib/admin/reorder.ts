import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What to reorder: stock vs. the last 30 days of sales (website + Etsy), for products
 * sold as they are and for inventory items (components). Products made from components
 * are covered by their items, so they aren't listed twice.
 */

export type ReorderRow = {
  kind: "product" | "item";
  id: string;
  name: string;
  stock: number;
  sold30: number;
  perDay: number;
  daysLeft: number | null; // null = no recent sales
  suggest: number; // units to reach TARGET_DAYS of stock
};

export const TARGET_DAYS = 45;
const WARN_DAYS = 21;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getReorder(sb: SupabaseClient): Promise<ReorderRow[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: vs }, { data: comps }, { data: lines }, { data: items }, { data: moves }] = await Promise.all([
    sb.from("variants").select("id, stock, options, products!inner(name, status, options)").neq("products.status", "archived"),
    sb.from("variant_components").select("variant_id"),
    sb.from("order_items").select("variant_id, quantity, orders!inner(created_at, status, test)").gte("orders.created_at", since).eq("orders.test", false).in("orders.status", ["paid", "packing", "shipped", "delivered"]),
    sb.from("inventory_items").select("id, name, stock, low_stock"),
    sb.from("inventory_movements").select("item_id, qty").eq("reason", "sale").gte("created_at", since),
  ]);
  const composed = new Set((comps ?? []).map((c: any) => c.variant_id));
  const soldByVariant = new Map<string, number>();
  for (const l of (lines ?? []) as any[]) if (l.variant_id) soldByVariant.set(l.variant_id, (soldByVariant.get(l.variant_id) ?? 0) + l.quantity);
  const soldByItem = new Map<string, number>();
  for (const m of (moves ?? []) as any[]) soldByItem.set(m.item_id, (soldByItem.get(m.item_id) ?? 0) - m.qty);

  const row = (kind: ReorderRow["kind"], id: string, name: string, stock: number, sold30: number): ReorderRow => {
    const perDay = sold30 / 30;
    return { kind, id, name, stock, sold30, perDay, daysLeft: perDay ? Math.max(0, stock) / perDay : null, suggest: Math.max(0, Math.ceil(perDay * TARGET_DAYS - Math.max(0, stock))) };
  };
  const out: ReorderRow[] = [];
  for (const v of (vs ?? []) as any[]) {
    if (composed.has(v.id)) continue;
    const sold = soldByVariant.get(v.id) ?? 0;
    const label = (val: string) => (v.products.options ?? []).flatMap((o: any) => o.values ?? []).find((x: any) => x.value === val)?.label?.en ?? val;
    const opts = Object.values(v.options ?? {}).map((x) => label(String(x))).join(" · ");
    const r = row("product", v.id, `${v.products.name.en}${opts ? ` · ${opts}` : ""}`, v.stock, sold);
    if (sold > 0 && (r.daysLeft! < WARN_DAYS || v.stock <= 0)) out.push(r);
  }
  for (const i of (items ?? []) as any[]) {
    const r = row("item", i.id, i.name, i.stock, soldByItem.get(i.id) ?? 0);
    if (i.stock <= i.low_stock || (r.daysLeft != null && r.daysLeft < WARN_DAYS)) out.push(r);
  }
  return out.sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
}
