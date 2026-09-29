import type { Metadata } from "next";
import Link from "next/link";
import { fmt, href } from "@/lib/i18n";
import { getProducts } from "@/lib/data/catalog";
import { resolveLang, toCard } from "@/lib/page";
import { ProductCard } from "@/components/product/product-card";
import { SearchTracker } from "@/components/content/search-tracker";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang, dict } = await resolveLang(params);
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const results = q ? await getProducts({ q }) : [];
  return (
    <div className="container-x pt-10 md:pt-16">
      {q && <SearchTracker q={q} count={results.length} />}
      <form role="search" action={href(lang, "/search")} className="mb-10 max-w-xl">
        <label htmlFor="q" className="sr-only">{dict.search.title}</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder={dict.search.placeholder} className="field rounded-full py-4 text-lg" />
      </form>
      <h1 className="headline mb-8 text-3xl md:text-4xl">
        {q ? fmt(results.length ? dict.search.results : dict.search.none, { count: results.length, q }) : dict.search.title}
      </h1>
      {results.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {results.map((p) => (
            <li key={p.slug}><ProductCard product={toCard(p)} /></li>
          ))}
        </ul>
      ) : (
        q && <Link href={href(lang, "/shop")} className="btn-primary">{dict.nav.shopAll}</Link>
      )}
    </div>
  );
}
