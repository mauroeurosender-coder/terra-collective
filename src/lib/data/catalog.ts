/**
 * Catalogue queries. Every storefront read goes through here, so moving from
 * seed data to Supabase only means changing these function bodies.
 */
import type { CollectionSlug, ColorKey, Product, Variant } from "../types";
import { loadCatalog } from "./source";

export type SortKey = "bestselling" | "newest" | "price-asc" | "price-desc";

export type ProductFilter = {
  collection?: CollectionSlug;
  colors?: ColorKey[];
  maxPrice?: number; // cents
  minPrice?: number;
  sizes?: string[];
  inStock?: boolean;
  q?: string;
  tag?: string;
  sort?: SortKey;
  includeHidden?: boolean;
};

export const priceRange = (p: Product) => {
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

export const totalStock = (p: Product) => p.variants.reduce((n, v) => n + v.stock, 0);

export const isNew = (p: Product, now = new Date("2026-09-28")) =>
  now.getTime() - new Date(p.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30;

/** "Only X left" when the whole product is nearly sold out. */
export const lowStock = (p: Product) => {
  const s = totalStock(p);
  return s > 0 && s <= 3 ? s : null;
};

export const defaultVariant = (p: Product): Variant => p.variants.find((v) => v.stock > 0) ?? p.variants[0];

export async function getCollections() {
  return (await loadCatalog()).collections;
}

export async function getCollection(slug: string) {
  const { collections } = await loadCatalog();
  return collections.find((c) => c.slug === slug) ?? null;
}

export async function getProducts(f: ProductFilter = {}) {
  const { products } = await loadCatalog();
  let list = f.includeHidden ? products.slice() : products.filter((p) => !p.hidden);
  if (f.collection) list = list.filter((p) => p.collection === f.collection);
  if (f.tag) list = list.filter((p) => p.tags.includes(f.tag!));
  if (f.colors?.length) list = list.filter((p) => p.colors.some((c) => f.colors!.includes(c)));
  if (f.sizes?.length)
    list = list.filter((p) => p.variants.some((v) => v.options.size && f.sizes!.includes(v.options.size)));
  if (f.maxPrice != null) list = list.filter((p) => priceRange(p).min <= f.maxPrice!);
  if (f.minPrice != null) list = list.filter((p) => priceRange(p).max >= f.minPrice!);
  if (f.inStock) list = list.filter((p) => totalStock(p) > 0);
  if (f.q) {
    const q = f.q.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    list = list.filter((p) =>
      [p.name.en, p.name.pt, p.short.en, p.short.pt, ...p.tags].some((s) => norm(s).includes(q)),
    );
  }
  const sort = f.sort ?? "bestselling";
  list.sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "price-asc":
        return priceRange(a).min - priceRange(b).min;
      case "price-desc":
        return priceRange(b).min - priceRange(a).min;
      default:
        return (a.bestseller || 99) - (b.bestseller || 99);
    }
  });
  return list;
}

export async function getProduct(slug: string) {
  const { products } = await loadCatalog();
  return products.find((p) => p.slug === slug) ?? null;
}

/** Product that used to live at this URL before it was renamed. */
export async function getRenamedProduct(slug: string) {
  const { products } = await loadCatalog();
  return products.find((p) => p.previousSlugs?.includes(slug)) ?? null;
}

export async function getProductsBySlugs(slugs: string[]) {
  const { products } = await loadCatalog();
  return slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => !!p);
}

export async function getRelated(p: Product, limit = 4) {
  const { products } = await loadCatalog();
  return products
    .filter((x) => !x.hidden && x.slug !== p.slug && !p.pairsWith.includes(x.slug))
    .sort((a, b) => Number(b.collection === p.collection) - Number(a.collection === p.collection) || (a.bestseller || 99) - (b.bestseller || 99))
    .slice(0, limit);
}

export async function getReviews(opts: { productSlug?: string; featured?: boolean } = {}) {
  const { reviews } = await loadCatalog();
  return reviews
    .filter((r) => (!opts.productSlug || r.productSlug === opts.productSlug) && (!opts.featured || r.featured))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPosts() {
  const { journal } = await loadCatalog();
  return journal.slice().sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string) {
  const { journal } = await loadCatalog();
  return journal.find((p) => p.slug === slug) ?? null;
}

/** Light product payload for client components (cart upsell, quick view, search). */
export type ProductLite = Pick<
  Product,
  "id" | "slug" | "name" | "images" | "options" | "variants" | "shipping" | "collection" | "short" | "pairsWith" | "video" | "colors" | "createdAt"
>;
export const toLite = (p: Product): ProductLite => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  short: p.short,
  images: p.images,
  options: p.options,
  variants: p.variants,
  shipping: p.shipping,
  collection: p.collection,
  pairsWith: p.pairsWith,
  video: p.video,
  colors: p.colors,
  createdAt: p.createdAt,
});
