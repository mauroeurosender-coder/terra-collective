"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Saves unit costs for many variants at once (cents; null clears). */
export async function saveVariantCosts(costs: { id: string; cost: number | null }[]): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  for (const c of costs) {
    if (c.cost != null && (!Number.isInteger(c.cost) || c.cost < 0)) return { ok: false, error: "Costs must be zero or more." };
    const { error } = await sb.from("variants").update({ cost: c.cost }).eq("id", c.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/analytics");
  return { ok: true, message: `Saved ${costs.length} cost${costs.length === 1 ? "" : "s"}.` };
}

export async function addExpense(e: { date: string; description: string; category: string; amount: number }): Promise<Result> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return { ok: false, error: "Pick a date." };
  if (!e.description.trim()) return { ok: false, error: "Add a description." };
  if (!Number.isInteger(e.amount) || e.amount <= 0) return { ok: false, error: "Enter an amount." };
  const sb = await supabaseServer();
  const { error } = await sb.from("expenses").insert({ date: e.date, description: e.description.trim().slice(0, 200), category: e.category, amount: e.amount });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/analytics");
  return { ok: true, message: "Expense added." };
}

export async function deleteExpense(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/analytics");
  return { ok: true };
}

/** Real costs for one order (null = use the defaults). */
export async function saveOrderCosts(orderId: string, c: { shipping: number | null; packaging: number | null; fees: number | null }): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("orders").update({ shipping_cost: c.shipping, packaging_cost: c.packaging, fees_cost: c.fees }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/analytics");
  return { ok: true, message: "Costs saved." };
}
