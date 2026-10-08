"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import type { L } from "@/lib/types";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const contentKeys = new Set(["announcement", "hero", "featured_collections", "theme", "home_layout", "home_designs"]);
const ownerKeys = new Set(["shipping", "vat", "payments", "store", "emails", "profit"]);

/** Saves one settings row. Content keys: any staff. Store configuration: owner only. */
export async function saveSetting(key: string, value: unknown): Promise<Result> {
  const session = await requireAdmin();
  if (!contentKeys.has(key) && !ownerKeys.has(key)) return { ok: false, error: "Unknown setting." };
  if (ownerKeys.has(key) && session.role !== "owner") return { ok: false, error: "Only the owner can change store settings." };
  const sb = await supabaseServer();
  const { error } = await sb.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. The store shows the change straight away." };
}

const pageSlugs = new Set(["our-story", "shipping-returns", "care-guide", "terms", "privacy", "cookies", "faq"]);

export async function savePage(slug: string, content: unknown): Promise<Result> {
  const session = await requireAdmin();
  if (!pageSlugs.has(slug)) return { ok: false, error: "Unknown page." };
  if (["terms", "privacy", "cookies"].includes(slug) && session.role !== "owner") return { ok: false, error: "Only the owner can edit legal pages." };
  const sb = await supabaseServer();
  const { error } = await sb.from("pages").upsert({ slug, content, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/", "layout");
  return { ok: true, message: "Page saved." };
}

export async function resetPage(slug: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  await sb.from("pages").delete().eq("slug", slug);
  invalidateCatalog();
  revalidatePath("/", "layout");
  return { ok: true, message: "Restored the original text." };
}

export type CollectionEdit = { id: string; name: L; blurb: L; image: string; featured: boolean; position: number };

export async function saveCollections(rows: CollectionEdit[]): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  for (const r of rows) {
    const { error } = await sb.from("collections").update({ name: r.name, blurb: r.blurb, image: r.image, featured: r.featured, position: r.position }).eq("id", r.id);
    if (error) return { ok: false, error: error.message };
  }
  invalidateCatalog();
  revalidatePath("/", "layout");
  return { ok: true, message: "Collections saved." };
}

export async function createCollection(name: string): Promise<Result> {
  await requireAdmin();
  const slug = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return { ok: false, error: "Give the collection a name." };
  const sb = await supabaseServer();
  const { count } = await sb.from("collections").select("id", { count: "exact", head: true });
  const { error } = await sb.from("collections").insert({ slug, name: { en: name, pt: name }, blurb: { en: "", pt: "" }, position: count ?? 0, accent: "bg-azulejo-tint" });
  if (error) return { ok: false, error: error.code === "23505" ? "A collection with that name exists." : error.message };
  invalidateCatalog();
  revalidatePath("/admin/content");
  return { ok: true, message: "Collection created." };
}
