import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Collection, JournalPost, Product, Review } from "../types";
import * as seed from "./seed";
import { pages as staticPages, faq as staticFaq, type ContentPage, type FaqGroup } from "./pages";
import { applySettings, defaultSettings, mergeSettings, type Settings } from "../settings";

export type Catalog = { collections: Collection[]; products: Product[]; reviews: Review[]; journal: JournalPost[]; settings: Settings; pages: Record<string, unknown>; source: "seed" | "supabase" };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TTL = 15_000;

let cached: { at: number; data: Promise<Catalog> } | null = null;

/** Drop the in-memory catalogue so the next request reads fresh data (called after admin edits). */
export function invalidateCatalog() {
  cached = null;
}

export function loadCatalog(): Promise<Catalog> {
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  const data = url && anon ? fromSupabase().catch((e) => {
    console.error("[catalog] Supabase read failed, using seed data:", e);
    cached = null;
    return fromSeed();
  }) : Promise.resolve(fromSeed());
  cached = { at: Date.now(), data };
  return data;
}

function fromSeed(): Catalog {
  return { collections: seed.collections, products: seed.products, reviews: seed.reviews, journal: seed.journal, settings: defaultSettings(), pages: {}, source: "seed" };
}

export async function getSettings() {
  return (await loadCatalog()).settings;
}

/** Editable content page (falls back to the built-in text). */
export async function getPage(slug: string): Promise<ContentPage | undefined> {
  const saved = (await loadCatalog()).pages[slug] as ContentPage | undefined;
  return saved?.sections ? saved : staticPages[slug];
}

export async function getFaq(): Promise<FaqGroup[]> {
  const saved = (await loadCatalog()).pages.faq as FaqGroup[] | undefined;
  return Array.isArray(saved) && saved.length ? saved : staticFaq;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fromSupabase(): Promise<Catalog> {
  const sb = createClient(url!, anon!, { auth: { persistSession: false } });
  const [cols, prods, revs, posts, sets, pgs] = await Promise.all([
    sb.from("collections").select("*").order("position"),
    sb.from("products").select("*, collections(slug), product_media(url, kind, position), variants(*)").eq("status", "active"),
    sb.from("reviews").select("*, products(slug)").eq("status", "approved").order("created_at", { ascending: false }),
    sb.from("journal_posts").select("*").order("publish_at", { ascending: false }),
    sb.from("settings").select("key, value"),
    sb.from("pages").select("slug, content"),
  ]);
  for (const r of [cols, prods, revs, posts]) if (r.error) throw r.error;
  const settings = mergeSettings((sets.data as any[]) ?? []);
  applySettings(settings);
  const pageMap = Object.fromEntries(((pgs.data as any[]) ?? []).map((p) => [p.slug, p.content]));

  const reviews: Review[] = (revs.data as any[]).map((r) => ({
    id: r.id,
    productSlug: r.products?.slug ?? "",
    author: r.author,
    country: r.country ?? "",
    rating: r.rating,
    title: r.title ?? "",
    body: r.body,
    date: r.created_at.slice(0, 10),
    photo: r.photo ?? undefined,
    featured: r.featured,
    reply: r.reply ?? undefined,
    verified: !!r.order_id,
  }));

  const products: Product[] = (prods.data as any[]).map((p) => {
    const media = [...(p.product_media ?? [])].sort((a, b) => a.position - b.position);
    const own = reviews.filter((r) => r.productSlug === p.slug);
    return {
      id: p.id,
      slug: p.slug,
      collection: p.collections?.slug ?? "gifts",
      name: p.name,
      short: { en: "", pt: "", ...p.short },
      description: { en: "", pt: "", ...p.description },
      details: {
        dimensions: { en: "", pt: "", ...p.details?.dimensions },
        materials: { en: "", pt: "", ...p.details?.materials },
        care: { en: "", pt: "", ...p.details?.care },
      },
      images: media.filter((m) => m.kind === "image").map((m) => m.url),
      video: media.find((m) => m.kind === "video")?.url,
      colors: p.colors ?? [],
      options: p.options ?? [],
      variants: [...(p.variants ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((v) => ({ id: v.id, sku: v.sku, options: v.options ?? {}, price: v.price, compareAt: v.compare_at ?? undefined, stock: v.stock, image: v.image_index ?? undefined })),
      shipping: p.shipping,
      tags: p.tags ?? [],
      createdAt: p.created_at.slice(0, 10),
      bestseller: p.bestseller_rank ?? 0,
      rating: own.length ? own.reduce((n, r) => n + r.rating, 0) / own.length : 0,
      reviewCount: own.length,
      pairsWith: p.pairs_with ?? [],
      wallPiece: p.wall_piece,
      foodSafe: p.food_safe,
      hidden: p.hidden,
    } satisfies Product;
  }).filter((p) => p.variants.length > 0);

  const collections: Collection[] = (cols.data as any[]).map((c) => ({ slug: c.slug, name: c.name, blurb: c.blurb, image: c.image ?? "", accent: c.accent ?? "bg-azulejo-tint", featured: c.featured !== false }));

  const now = new Date().toISOString();
  const journal: JournalPost[] = (posts.data as any[])
    .filter((p) => p.status === "published" || (p.status === "scheduled" && p.publish_at && p.publish_at <= now))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      cover: p.cover ?? "",
      category: p.category,
      author: p.author ?? "Terra Collective",
      date: (p.publish_at ?? p.created_at).slice(0, 10),
      readingMinutes: p.reading_minutes,
      blocks: p.blocks ?? [],
    }));

  return { collections, products, reviews, journal, settings, pages: pageMap, source: "supabase" };
}
