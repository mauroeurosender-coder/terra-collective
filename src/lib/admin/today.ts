import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obligations } from "./tax";
import { getReorder } from "./reorder";
import { getPayables } from "./payables";

/** Everything that needs the owner today, for the top of the dashboard. */
export type Today = {
  toShip: number;
  oldestDays: number | null;
  drafts: number | null; // Moloni drafts to finalise (owner)
  invoiceErrors: number | null;
  docsToConfirm: number | null; // supplier documents not confirmed (owner)
  toPay: { count: number; amount: number; late: number } | null; // supplier invoices due within 7 days or overdue (owner)
  reorder: number;
  nextTax: { title: string; date: string; days: number } | null;
};

export async function getToday(sb: SupabaseClient, isOwner: boolean): Promise<Today> {
  const head = { count: "exact" as const, head: true };
  const [ship, oldest, drafts, errors, docs, reorder, done, payables] = await Promise.all([
    sb.from("orders").select("id", head).eq("test", false).in("status", ["paid", "packing"]),
    sb.from("orders").select("created_at").eq("test", false).in("status", ["paid", "packing"]).order("created_at").limit(1),
    isOwner ? sb.from("orders").select("id", head).eq("invoice_status", "draft") : null,
    isOwner ? sb.from("orders").select("id", head).eq("invoice_status", "error") : null,
    isOwner ? sb.from("accounting_docs").select("id", head).neq("status", "confirmed") : null,
    getReorder(sb),
    isOwner ? sb.from("settings").select("value").eq("key", "tax_done").maybeSingle() : null,
    isOwner ? getPayables(sb) : null,
  ]);
  const soon = (payables ?? []).filter((p) => p.daysLate >= -7);
  const first = oldest.data?.[0]?.created_at;
  let nextTax: Today["nextTax"] = null;
  if (isOwner) {
    const doneKeys = (done?.data?.value ?? {}) as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);
    const y = new Date().getFullYear();
    const next = [...obligations(y), ...obligations(y + 1)].filter((o) => o.date >= today && !doneKeys[o.key]).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next) nextTax = { title: next.title, date: next.date, days: Math.round((new Date(`${next.date}T12:00:00`).getTime() - Date.now()) / 86_400_000) };
  }
  return {
    toShip: ship.count ?? 0,
    oldestDays: first ? Math.floor((Date.now() - new Date(first).getTime()) / 86_400_000) : null,
    drafts: drafts?.count ?? null,
    invoiceErrors: errors?.count ?? null,
    docsToConfirm: docs?.count ?? null,
    reorder: reorder.length,
    toPay: payables ? { count: soon.length, amount: soon.reduce((n, p) => n + p.total, 0), late: soon.filter((p) => p.daysLate > 0).length } : null,
    nextTax,
  };
}
