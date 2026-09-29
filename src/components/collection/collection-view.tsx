import Link from "next/link";
import type { Locale } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import { fmt, href } from "@/lib/i18n";
import { getCollections, getProducts, type SortKey } from "@/lib/data/catalog";
import type { CollectionSlug, ColorKey } from "@/lib/types";
import { toCard } from "@/lib/page";
import { ProductCard } from "../product/product-card";
import { Filters, SortSelect } from "./filters";
import { SardineLine } from "../illustrations";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (one(v) ? one(v)!.split(",").filter(Boolean) : []);

export function parseFilters(sp: SP) {
  const sort = (one(sp.sort) as SortKey) ?? "bestselling";
  return {
    colors: list(sp.color) as ColorKey[],
    sizes: list(sp.size),
    collections: list(sp.collection) as CollectionSlug[],
    maxPrice: one(sp.max) ? Number(one(sp.max)) * 100 : undefined,
    minPrice: one(sp.min) ? Number(one(sp.min)) * 100 : undefined,
    inStock: one(sp.instock) === "1",
    sort: ["bestselling", "newest", "price-asc", "price-desc"].includes(sort) ? sort : "bestselling",
  };
}

export async function CollectionView({
  lang,
  dict,
  title,
  blurb,
  collection,
  searchParams,
}: {
  lang: Locale;
  dict: Dictionary;
  title: string;
  blurb: string;
  collection?: CollectionSlug;
  searchParams: SP;
}) {
  const f = parseFilters(searchParams);
  const base = await getProducts({ collection, sort: f.sort });
  let products = await getProducts({
    collection,
    colors: f.colors,
    sizes: f.sizes,
    maxPrice: f.maxPrice,
    minPrice: f.minPrice,
    inStock: f.inStock,
    sort: f.sort,
  });
  if (!collection && f.collections.length) products = products.filter((p) => f.collections.includes(p.collection));

  const collections = await getCollections();
  const facets = {
    colors: [...new Set(base.flatMap((p) => p.colors))],
    sizes: [...new Set(base.flatMap((p) => p.variants.map((v) => v.options.size).filter(Boolean) as string[]))],
    collections: collection ? [] : collections.map((c) => ({ value: c.slug, label: c.name[lang] })),
  };
  const active = f.colors.length + f.sizes.length + f.collections.length + (f.maxPrice ? 1 : 0) + (f.minPrice ? 1 : 0) + (f.inStock ? 1 : 0);

  return (
    <div className="container-x pt-8 pb-10 md:pt-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={href(lang)} className="hover:text-ink">Terra</Link>
          </li>
          <li aria-hidden>/</li>
          {collection ? (
            <>
              <li>
                <Link href={href(lang, "/shop")} className="hover:text-ink">{dict.nav.shop}</Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">{title}</li>
            </>
          ) : (
            <li aria-current="page" className="text-ink">{dict.nav.shop}</li>
          )}
        </ol>
      </nav>

      <header className="mb-8 max-w-2xl md:mb-12">
        <h1 className="headline text-5xl md:text-6xl">{title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{blurb}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <Filters facets={facets} activeCount={active} resultCount={products.length} />

        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {fmt(dict.collection.results, { count: products.length })}
            </p>
            <SortSelect />
          </div>

          {products.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-3 2xl:grid-cols-4">
              {products.map((p, i) => (
                <li key={p.slug}>
                  <ProductCard product={toCard(p)} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-paper px-6 py-20 text-center">
              <SardineLine className="h-14 w-36 text-azulejo" strokeWidth={1.2} />
              <p className="headline mt-6 text-2xl">{dict.collection.empty}</p>
              <Link href="?" className="btn-outline mt-6">
                {dict.collection.emptyCta}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
