"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { generateJson, geminiConfigured } from "@/lib/server/gemini";
import { cleanProposal, SEO_SCHEMA, seoPrompt, slugify, type SeoInput, type SeoProposal } from "@/lib/seo-prompt";

/*
 * Proposals live in products.seo.proposal until approved, so nothing on the
 * site changes before that. Approval writes name, SEO title/description and
 * slug. Etsy is never called from here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
const plain = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

export async function generateSeo(ids: string[]): Promise<Result<Record<string, SeoProposal>>> {
  await requireAdmin();
  if (!geminiConfigured()) return { ok: false, error: "O Gemini não está configurado (GEMINI_API_KEY)." };
  if (!ids.length || ids.length > 15) return { ok: false, error: "Escolha entre 1 e 15 produtos de cada vez." };
  const sb = await supabaseServer();
  const { data: all, error } = await sb.from("products").select("id, slug, name, seo, tags, options, description, collections(name)").neq("status", "archived");
  if (error) return { ok: false, error: error.message };

  const batch = (all ?? []).filter((p: any) => ids.includes(p.id));
  const others = (all ?? []).filter((p: any) => !ids.includes(p.id));
  // Names/slugs other products already have (approved) or are about to get (pending proposals).
  const takenNames = others.map((p: any) => p.seo?.proposal?.name_en || (p.seo?.approved_at ? p.name?.en : "")).filter(Boolean);
  const usedSlugs = new Set<string>(others.flatMap((p: any) => [p.slug, p.seo?.proposal?.slug].filter(Boolean)));

  const input: SeoInput[] = batch.map((p: any) => ({
    id: p.id,
    etsyTitle: decode(p.seo?.etsy_title || p.name?.en || ""),
    collection: p.collections?.name?.en ?? "",
    tags: p.tags ?? [],
    options: (p.options ?? []).flatMap((o: any) => (o.values ?? []).map((v: any) => v.label?.en || v.value)),
    description: plain(p.description?.en ?? ""),
  }));

  let res: { items: (SeoProposal & { id: string })[] };
  try {
    res = await generateJson(seoPrompt(input, takenNames), SEO_SCHEMA);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const out: Record<string, SeoProposal> = {};
  for (const [i, p] of (batch as any[]).entries()) {
    const raw = res.items?.find((x) => x.id === `p${i + 1}`) ?? res.items?.[i];
    if (!raw) continue;
    const proposal = cleanProposal(raw, usedSlugs);
    const seo = { ...(p.seo ?? {}), proposal, etsy_title: p.seo?.etsy_title || p.name?.en };
    const { error: e } = await sb.from("products").update({ seo }).eq("id", p.id);
    if (e) return { ok: false, error: e.message };
    out[p.id] = proposal;
  }
  revalidatePath("/admin/products/seo");
  return { ok: true, data: out };
}

export type Approval = { id: string; name_en: string; name_pt: string; seo_title_en: string; seo_title_pt: string; meta_en: string; meta_pt: string; slug: string };

export async function approveSeo(items: Approval[]): Promise<Result<{ approvedIds: string[]; skipped: string[] }>> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data: all, error } = await sb.from("products").select("id, slug, name, seo");
  if (error) return { ok: false, error: error.message };
  const byId = new Map((all ?? []).map((p: any) => [p.id, p]));
  const ids = new Set(items.map((i) => i.id));
  const used = new Set<string>((all ?? []).filter((p: any) => !ids.has(p.id)).map((p: any) => p.slug));

  const approvedIds: string[] = [];
  const skipped: string[] = [];
  for (const it of items) {
    const p: any = byId.get(it.id);
    const slug = slugify(it.slug || it.name_en);
    if (!p || !it.name_en.trim() || !slug) { skipped.push(it.name_en || it.id); continue; }
    if (used.has(slug)) { skipped.push(`${it.name_en} (URL já usado: ${slug})`); continue; }
    used.add(slug);
    const { proposal: _drop, ...rest } = p.seo ?? {};
    void _drop;
    const { error: e } = await sb
      .from("products")
      .update({
        slug,
        name: { ...p.name, en: it.name_en.trim(), pt: it.name_pt.trim() || it.name_en.trim() },
        seo: {
          ...rest,
          etsy_title: rest.etsy_title || p.name?.en,
          title: { en: it.seo_title_en.trim(), pt: it.seo_title_pt.trim() },
          description: { en: it.meta_en.trim(), pt: it.meta_pt.trim() },
          approved_at: new Date().toISOString(),
          ...(p.slug !== slug ? { previous_slugs: [...new Set([...(rest.previous_slugs ?? []), p.slug])] } : {}),
        },
      })
      .eq("id", it.id);
    if (e) { skipped.push(`${it.name_en} (${e.code === "23505" ? "URL já usado" : e.message})`); continue; }
    approvedIds.push(it.id);
  }
  invalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/seo");
  return { ok: true, data: { approvedIds, skipped } };
}

export async function discardSeo(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data: p } = await sb.from("products").select("seo").eq("id", id).single();
  if (!p) return { ok: false, error: "Produto não encontrado." };
  const { proposal: _drop, ...rest } = (p.seo ?? {}) as any;
  void _drop;
  const { error } = await sb.from("products").update({ seo: rest }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products/seo");
  return { ok: true };
}
