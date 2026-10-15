import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */import type { SupabaseClient } from "@supabase/supabase-js";

/** Supplier payment terms and due dates for purchase invoices. */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
export const supplierKey = (nif: string | null | undefined, name: string | null | undefined) =>
  nif?.trim() ? `nif:${nif.replace(/\s/g, "").toUpperCase()}` : name?.trim() ? `name:${norm(name)}` : null;

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export async function supplierDays(sb: SupabaseClient, nif: string | null | undefined, name: string | null | undefined): Promise<number | null> {
  const key = supplierKey(nif, name);
  if (!key) return null;
  const { data } = await sb.from("supplier_terms").select("days").eq("key", key).maybeSingle();
  return data ? Number(data.days) : null;
}

/**
 * Due date and payment for a new purchase invoice:
 * fatura-recibo / marked paid → paid on its date; a due date printed on the invoice wins;
 * otherwise the supplier’s terms (0 days = paid on receipt); unknown supplier → due on the invoice date.
 */
export function paymentFor(date: string, opts: { paidOnIssue: boolean; printedDue: string | null; supplierDays: number | null }) {
  if (opts.paidOnIssue) return { due_date: date, paid_on: date };
  if (opts.printedDue && /^\d{4}-\d{2}-\d{2}$/.test(opts.printedDue) && opts.printedDue >= date) return { due_date: opts.printedDue, paid_on: opts.supplierDays === 0 ? date : null };
  if (opts.supplierDays != null) return { due_date: addDays(date, opts.supplierDays), paid_on: opts.supplierDays === 0 ? date : null };
  return { due_date: date, paid_on: null };
}

export type Payable = { id: string; party: string; number: string | null; date: string; due: string; total: number; daysLate: number };

/** Unpaid purchase invoices (all quarters), soonest due first. */
export async function getPayables(sb: SupabaseClient): Promise<Payable[]> {
  const { data } = await sb.from("accounting_docs").select("id, party_name, file_name, number, date, due_date, total").eq("direction", "purchase").neq("kind", "credit_note").is("paid_on", null).order("due_date", { ascending: true, nullsFirst: false }).limit(200);
  const today = new Date().toISOString().slice(0, 10);
  return (data ?? []).map((d: any) => {
    const due = d.due_date ?? d.date ?? today;
    return { id: d.id, party: d.party_name ?? d.file_name ?? "Fornecedor", number: d.number, date: d.date, due, total: d.total ?? 0, daysLate: Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${due}T12:00:00Z`).getTime()) / 86_400_000) };
  });
}
