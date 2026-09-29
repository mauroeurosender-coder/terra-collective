import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, store, type Locale } from "./config";
import { getDictionary } from "./i18n";
import { isNew } from "./data/catalog";
import type { Product } from "./types";
import type { CardProduct } from "@/components/product/product-card";

export async function resolveLang(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { lang, dict: getDictionary(lang) };
}

/** Strip a product down to what a card needs (keeps RSC payloads small). */
export const toCard = (p: Product): CardProduct => ({
  slug: p.slug,
  name: p.name,
  images: p.images.slice(0, 2),
  video: p.video,
  variants: p.variants,
  options: p.options,
  colors: p.colors,
  createdAt: p.createdAt,
  shipping: p.shipping,
  isNew: isNew(p),
});

/** Per-page metadata with canonical + hreflang alternates. */
export function pageMeta(lang: Locale, path: string, title: string, description?: string, image?: string): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${path}`,
      languages: { en: `/en${path}`, pt: `/pt${path}`, "x-default": `/en${path}` },
    },
    openGraph: {
      title: `${title} · ${store.name}`,
      description,
      url: `/${lang}${path}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
