"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };
const done = (message?: string, id?: string): Result => {
  invalidateCatalog();
  revalidatePath("/admin/inventory");
  return { ok: true, message, id };
};
const keywords = (raw: string) => [...new Set(raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 20);

export async function saveItem(i: { id?: string; name: string; sku: string; keywords: string; unit_cost: number | null; low_stock: number; notes: string }): Promise<Result> {
  await requireAdmin();
  if (!i.name.trim()) return { ok: false, error: "Dê um nome ao artigo." };
  const sb = await supabaseServer();
  const row = { name: i.name.trim(), sku: i.sku.trim() || null, keywords: keywords(i.keywords), unit_cost: i.unit_cost, low_stock: Math.max(0, i.low_stock || 0), notes: i.notes.trim() || null };
  const r = i.id ? await sb.from("inventory_items").update(row).eq("id", i.id).select("id").single() : await sb.from("inventory_items").insert({ ...row, stock: 0 }).select("id").single();
  if (r.error) return { ok: false, error: r.error.code === "23505" ? "Já existe um artigo com esse SKU." : r.error.message };
  if (i.id) {
    // A changed unit cost changes the cost of every product made with this item.
    const { data } = await sb.from("variant_components").select("variant_id").eq("item_id", i.id);
    for (const v of data ?? []) await sb.rpc("refresh_variant", { p_variant: v.variant_id });
  }
  return done(i.id ? "Guardado." : "Artigo criado.", r.data.id);
}

export async function deleteItem(id: string): Promise<Result> {
  await requireAdmin({ owner: true });
  const sb = await supabaseServer();
  const { error } = await sb.from("inventory_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return done("Artigo apagado.");
}

/** Sets the stock to a counted value (records the difference as an adjustment). */
export async function countItem(id: string, stock: number, note: string): Promise<Result> {
  await requireAdmin();
  if (!Number.isInteger(stock) || stock < 0) return { ok: false, error: "Indique um número inteiro." };
  const sb = await supabaseServer();
  const { error } = await sb.rpc("adjust_item", { p_item: id, p_new_stock: stock, p_note: note.trim() || "contagem" });
  if (error) return { ok: false, error: error.message };
  return done("Stock atualizado.");
}

/** Adds, changes (qty > 0) or removes (qty = 0) a component of a product variant. */
export async function setComponent(variantId: string, itemId: string, qty: number): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  if (qty > 0) {
    const { error } = await sb.from("variant_components").upsert({ variant_id: variantId, item_id: itemId, qty: Math.round(qty) });
    if (error) return { ok: false, error: error.message };
    await sb.rpc("refresh_variant", { p_variant: variantId });
  } else {
    await sb.from("variant_components").delete().eq("variant_id", variantId).eq("item_id", itemId);
  }
  return done(qty > 0 ? "Composição guardada. Stock e custo do produto recalculados." : "Componente removido.");
}

/** After editing a unit cost by hand, refresh the cost of the products that use it. */
export async function refreshItemProducts(itemId: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data } = await sb.from("variant_components").select("variant_id").eq("item_id", itemId);
  for (const v of data ?? []) await sb.rpc("refresh_variant", { p_variant: v.variant_id });
  return done();
}
