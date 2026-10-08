"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { slugify, type ProductForm } from "@/lib/admin/product-form";

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };

function validate(f: ProductForm): string | null {
  if (!f.name.en.trim()) return "Add an English product name.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) return "The URL can only use lowercase letters, numbers and dashes.";
  if (!f.variants.length) return "Add at least one variant.";
  const skus = f.variants.map((v) => v.sku.trim());
  if (skus.some((s) => !s)) return "Every variant needs a SKU.";
  if (new Set(skus).size !== skus.length) return "SKUs must be unique.";
  if (f.variants.some((v) => !Number.isInteger(v.price) || v.price < 0 || !Number.isInteger(v.stock) || v.stock < 0)) return "Prices and stock must be zero or more.";
  if (f.status === "active" && f.media.filter((m) => m.kind === "image").length === 0) return "Add at least one photo before making the product active.";
  return null;
}

export async function saveProduct(f: ProductForm): Promise<Result> {
  await requireAdmin();
  f = { ...f, slug: slugify(f.slug || f.name.en) };
  const err = validate(f);
  if (err) return { ok: false, error: err };
  const sb = await supabaseServer();

  const row = {
    slug: f.slug,
    status: f.status,
    collection_id: f.collectionId,
    name: f.name,
    short: f.short,
    description: f.description,
    details: f.details,
    options: f.options,
    colors: f.colors,
    tags: f.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    shipping: f.shipping,
    wall_piece: f.wallPiece,
    food_safe: f.foodSafe,
    hidden: f.hidden,
    pairs_with: f.pairsWith,
    seo: f.seo,
    bestseller_rank: f.bestsellerRank,
  };

  const saved = f.id
    ? await sb.from("products").update(row).eq("id", f.id).select("id").single()
    : await sb.from("products").insert(row).select("id").single();
  if (saved.error) return { ok: false, error: saved.error.code === "23505" ? "Another product already uses that URL." : saved.error.message };
  const id = saved.data.id as string;

  // Media: replace the ordered list.
  await sb.from("product_media").delete().eq("product_id", id);
  if (f.media.length) {
    const m = await sb.from("product_media").insert(f.media.map((x, i) => ({ product_id: id, kind: x.kind, url: x.url, alt: x.alt, position: i })));
    if (m.error) return { ok: false, error: m.error.message };
  }

  // Variants: keep ids stable (carts and orders reference them), delete removed ones.
  const { data: existing } = await sb.from("variants").select("id").eq("product_id", id);
  const keep = new Set(f.variants.map((v) => v.id).filter(Boolean));
  const toDelete = (existing ?? []).map((v) => v.id).filter((vid) => !keep.has(vid));
  if (toDelete.length) await sb.from("variants").delete().in("id", toDelete);
  const prefix = f.slug.split("-").map((w) => w[0]).join("").slice(0, 6) || "p";
  const rows = f.variants.map((v, i) => ({
    id: v.id ?? `${prefix}-${Object.values(v.options).join("-") || "default"}-${Math.random().toString(36).slice(2, 6)}`,
    product_id: id,
    sku: v.sku.trim(),
    options: v.options,
    price: v.price,
    compare_at: v.compareAt,
    cost: v.cost ?? null,
    stock: v.stock,
    image_index: v.imageIndex,
    position: i,
  }));
  const vr = await sb.from("variants").upsert(rows);
  if (vr.error) return { ok: false, error: vr.error.code === "23505" ? "A SKU is already used by another product." : vr.error.message };

  invalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, id, message: "Saved." };
}

export async function duplicateProduct(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data: p } = await sb.from("products").select("*, product_media(*), variants(*)").eq("id", id).single();
  if (!p) return { ok: false, error: "Product not found." };
  const stamp = Math.random().toString(36).slice(2, 5);
  const { id: _id, created_at: _c, updated_at: _u, product_media, variants, ...rest } = p;
  void _id; void _c; void _u;
  const copy = await sb
    .from("products")
    .insert({ ...rest, slug: `${p.slug}-copy-${stamp}`, status: "draft", name: { en: `${p.name.en} (copy)`, pt: `${p.name.pt} (cópia)` } })
    .select("id")
    .single();
  if (copy.error) return { ok: false, error: copy.error.message };
  const nid = copy.data.id as string;
  if (product_media?.length) await sb.from("product_media").insert(product_media.map((m: Record<string, unknown>) => ({ product_id: nid, kind: m.kind, url: m.url, alt: m.alt, position: m.position })));
  if (variants?.length)
    await sb.from("variants").insert(
      variants.map((v: Record<string, unknown>) => ({ ...v, id: `${v.id}-c${stamp}`, product_id: nid, sku: `${v.sku}-C${stamp.toUpperCase()}`, stock: 0 })),
    );
  revalidatePath("/admin/products");
  return { ok: true, id: nid };
}

export async function deleteProduct(id: string): Promise<Result> {
  const session = await requireAdmin();
  if (session.role !== "owner") return { ok: false, error: "Only the owner can delete products." };
  const sb = await supabaseServer();
  const { count } = await sb.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (count) return { ok: false, error: "This product has orders, so it can’t be deleted. Archive it instead." };
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function bulkUpdate(ids: string[], patch: { status?: "draft" | "active" | "archived"; collectionId?: string }): Promise<Result> {
  await requireAdmin();
  if (!ids.length) return { ok: false, error: "Select some products first." };
  const sb = await supabaseServer();
  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.collectionId) update.collection_id = patch.collectionId;
  const { error } = await sb.from("products").update(update).in("id", ids);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/products");
  return { ok: true, message: `Updated ${ids.length} product${ids.length === 1 ? "" : "s"}.` };
}
