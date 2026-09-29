"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function updateCustomer(id: string, patch: { tags?: string[]; notes?: string; newsletter?: boolean }): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const row: Record<string, unknown> = {};
  if (patch.tags) row.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  if (patch.notes != null) row.notes = patch.notes.slice(0, 4000);
  if (patch.newsletter != null) row.newsletter = patch.newsletter;
  const { error } = await sb.from("customers").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return { ok: true, message: "Saved." };
}

/**
 * GDPR erasure. Invoices must be kept for 10 years (Portuguese tax law), so
 * orders stay but are anonymised; the customer profile itself is deleted.
 */
export async function eraseCustomer(id: string): Promise<Result> {
  const session = await requireAdmin();
  if (session.role !== "owner") return { ok: false, error: "Only the owner can erase customer data." };
  const sb = await supabaseServer();
  const { data: c } = await sb.from("customers").select("email").eq("id", id).single();
  if (!c) return { ok: false, error: "Customer not found." };
  const anon = `erased-${id.slice(0, 8)}@deleted.invalid`;
  const { data: orders } = await sb.from("orders").select("id, shipping_address, nif").eq("customer_id", id);
  for (const o of orders ?? []) {
    const a = o.shipping_address ?? {};
    await sb
      .from("orders")
      .update({ email: anon, gift_message: null, shipping_address: { country: a.country, postal: a.postal?.slice(0, 4) ?? null, erased: true }, customer_id: null })
      .eq("id", o.id);
    await sb.from("order_events").insert({ order_id: o.id, kind: "note", body: "Customer data erased on request (GDPR). Invoice records retained." });
  }
  await sb.from("newsletter_subscribers").delete().eq("email", c.email);
  await sb.from("back_in_stock_requests").delete().eq("email", c.email);
  const { error } = await sb.from("customers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/customers");
  return { ok: true };
}
