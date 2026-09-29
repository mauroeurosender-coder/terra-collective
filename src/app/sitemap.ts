import type { MetadataRoute } from "next";
import { locales, store } from "@/lib/config";
import { getCollections, getPosts, getProducts } from "@/lib/data/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, posts] = await Promise.all([getProducts(), getCollections(), getPosts()]);
  const paths: { path: string; lastModified?: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/shop", priority: 0.9 },
    ...collections.map((c) => ({ path: `/collections/${c.slug}`, priority: 0.8 })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.createdAt, priority: 0.8 })),
    { path: "/journal", priority: 0.6 },
    ...posts.map((p) => ({ path: `/journal/${p.slug}`, lastModified: p.date, priority: 0.6 })),
    ...["/our-story", "/faq", "/shipping-returns", "/care-guide", "/contact", "/wholesale", "/gift-cards"].map((path) => ({ path, priority: 0.4 })),
    ...["/legal/terms", "/legal/privacy", "/legal/cookies"].map((path) => ({ path, priority: 0.2 })),
  ];
  return paths.flatMap(({ path, lastModified, priority }) =>
    locales.map((lang) => ({
      url: `${store.url}/${lang}${path}`,
      lastModified,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${store.url}/${l}${path}`])) },
    })),
  );
}
