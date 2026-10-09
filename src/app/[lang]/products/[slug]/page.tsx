import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronDown, ShieldCheck, Utensils } from "lucide-react";
import { isLocale, locales, store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { getCollection, getProduct, getProducts, getProductsBySlugs, getRelated, getRenamedProduct, getReviews, toLite } from "@/lib/data/catalog";
import { pageMeta, resolveLang, toCard } from "@/lib/page";
import { ProductView } from "@/components/product/product-view";
import { ProductCard } from "@/components/product/product-card";
import { Stars } from "@/components/ui/stars";
import { Carousel } from "@/components/ui/carousel";
import { WaveDivider } from "@/components/illustrations";
import { JsonLd } from "@/components/json-ld";
import { ReviewForm } from "@/components/product/review-form";

export async function generateStaticParams() {
  const products = await getProducts();
  return locales.flatMap((lang) => products.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/products/[slug]">) {
  const { lang, slug } = await params;
  const p = await getProduct(slug);
  if (!p || !isLocale(lang)) return {};
  const seoTitle = p.seo?.title[lang] || p.seo?.title.en;
  const meta = pageMeta(lang, `/products/${slug}`, seoTitle || t(p.name, lang), p.seo?.description[lang] || t(p.short, lang) || p.seo?.description.en, p.images[0]);
  // A written SEO title is already complete (~60 chars), so skip the " · Terra Collective" suffix.
  return seoTitle ? { ...meta, title: { absolute: seoTitle } } : meta;
}

export default async function ProductPage({ params, searchParams }: PageProps<"/[lang]/products/[slug]">) {
  const { lang, dict } = await resolveLang(params);
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProduct(slug);
  if (!product) {
    const renamed = await getRenamedProduct(slug);
    if (renamed) permanentRedirect(href(lang, `/products/${renamed.slug}`));
    notFound();
  }

  const [collection, reviews, pairs, related] = await Promise.all([
    getCollection(product.collection),
    getReviews({ productSlug: slug }),
    getProductsBySlugs(product.pairsWith),
    getRelated(product),
  ]);
  const d = dict.product;
  const name = t(product.name, lang);

  const accordions = [
    { title: d.description, body: <p>{t(product.description, lang)}</p>, open: true },
    { title: d.dimensions, body: <><p>{t(product.details.dimensions, lang)}</p><p>{t(product.details.materials, lang)}</p></> },
    {
      title: product.wallPiece ? `${d.care} · ${d.hanging}` : d.care,
      body: (
        <>
          {product.foodSafe && (
            <p className="flex items-center gap-2 font-medium text-ink">
              <Utensils className="h-4 w-4 text-olive" /> {d.foodSafe}
            </p>
          )}
          <p>{t(product.details.care, lang)}</p>
          <p>
            <Link href={href(lang, "/care-guide")} className="link">
              {dict.footer.care} →
            </Link>
          </p>
        </>
      ),
    },
    {
      title: d.shippingReturns,
      body: (
        <>
          <p>{d.shippingReturnsBody}</p>
          <p>
            <Link href={href(lang, "/shipping-returns")} className="link">
              {dict.footer.shipping} →
            </Link>
          </p>
        </>
      ),
    },
  ];

  const url = `${store.url}/${lang}/products/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name,
    description: t(product.description, lang),
    url,
    brand: { "@type": "Brand", name: store.name },
    productGroupID: product.id,
    variesBy: product.options.map((o) => (o.name === "color" ? "https://schema.org/color" : o.name === "size" ? "https://schema.org/size" : o.name)),
    ...(product.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.toFixed(1), reviewCount: product.reviewCount } } : {}),
    hasVariant: product.variants.map((v) => ({
      "@type": "Product",
      sku: v.sku,
      name,
      image: `${store.url}${product.images[v.image ?? 0]}`,
      ...(v.options.color ? { color: v.options.color } : {}),
      ...(v.options.size ? { size: v.options.size } : {}),
      offers: {
        "@type": "Offer",
        url: `${url}?variant=${v.id}`,
        price: (v.price / 100).toFixed(2),
        priceCurrency: "EUR",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    })),
    review: reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating },
      reviewBody: r.body,
      datePublished: r.date,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.nav.shop, item: `${store.url}/${lang}/shop` },
      ...(collection ? [{ "@type": "ListItem", position: 2, name: t(collection.name, lang), item: `${store.url}/${lang}/collections/${collection.slug}` }] : []),
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };

  const dateFmt = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="container-x pt-6 pb-10 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href={href(lang, "/shop")} className="hover:text-ink">{dict.nav.shop}</Link></li>
            {collection && (
              <>
                <li aria-hidden>/</li>
                <li><Link href={href(lang, `/collections/${collection.slug}`)} className="hover:text-ink">{t(collection.name, lang)}</Link></li>
              </>
            )}
          </ol>
        </nav>

        <ProductView
          product={toLite(product)}
          initialVariantId={typeof sp.variant === "string" ? sp.variant : undefined}
          header={
            <>
              <h1 className="headline text-4xl md:text-5xl">{name}</h1>
              {product.reviewCount > 0 && (
                <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
                  <Stars rating={product.rating} /> {product.rating.toFixed(1)} · {fmt(d.reviewCount, { count: product.reviewCount })}
                </a>
              )}
              <p className="mt-4 text-lg text-ink-soft">{t(product.short, lang)}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive-tint px-3 py-1.5 text-xs font-semibold tracking-wide text-olive">
                <ShieldCheck className="h-3.5 w-3.5" /> {d.handmade}
              </p>
            </>
          }
        >
          <div className="divide-y divide-line border-y border-line">
            {accordions.map((a) => (
              <details key={a.title} open={a.open} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {a.title}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-3 pb-5 leading-relaxed text-ink-soft">{a.body}</div>
              </details>
            ))}
          </div>
        </ProductView>
      </div>

      {/* Pairs well with */}
      {pairs.length > 0 && (
        <section className="container-x py-12 md:py-16" aria-labelledby="pairs-h">
          <h2 id="pairs-h" className="headline mb-8 text-3xl">{d.pairsWell}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {pairs.map((p) => (
              <li key={p.slug}>
                <ProductCard product={toCard(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-24 bg-paper py-14 md:py-20" aria-labelledby="reviews-h">
        <div className="container-x grid gap-10 md:grid-cols-[280px_1fr] md:gap-16">
          <div>
            <h2 id="reviews-h" className="headline text-3xl">{d.reviews}</h2>
            {product.reviewCount > 0 ? (
              <>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="headline text-6xl">{product.rating.toFixed(1)}</span>
                  <span className="text-ink-soft">/ 5</span>
                </p>
                <Stars rating={product.rating} size="md" className="mt-2" />
                <p className="mt-2 text-sm text-ink-soft">{fmt(d.reviewCount, { count: product.reviewCount })}</p>
              </>
            ) : (
              <p className="mt-4 text-ink-soft">{lang === "pt" ? "Ainda sem opiniões. Seja o primeiro!" : "No reviews yet. Be the first!"}</p>
            )}
            <div className="mt-6"><ReviewForm slug={product.slug} /></div>
          </div>
          <ul className="space-y-8">
                        {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-8 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={r.rating} />
                  <span className="font-semibold">{r.title}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {r.author} · {r.country} · <time dateTime={r.date}>{dateFmt.format(new Date(r.date))}</time>{r.verified && <> · {d.verified}</>}
                </p>
                <p className="mt-3 max-w-2xl leading-relaxed">{r.body}</p>
                {r.photo && (
                  <div className="relative mt-4 h-28 w-28 overflow-hidden rounded-xl bg-cream-deep">
                    <Image src={r.photo} alt={`${r.author}`} fill sizes="112px" className="object-cover" />
                  </div>
                )}
                {r.reply && (
                  <div className="mt-4 max-w-2xl rounded-xl bg-azulejo-tint/60 px-4 py-3 text-sm">
                    <p className="font-semibold">{d.storeReply}</p>
                    <p className="mt-1 text-ink-soft">{r.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* You may also like */}
      <section className="container-x pt-16 md:pt-20" aria-labelledby="related-h">
        <WaveDivider className="mb-10 h-4 w-full text-azulejo/30" />
        <h2 id="related-h" className="headline mb-8 text-3xl">{d.youMayLike}</h2>
        <Carousel label={d.youMayLike}>
          {related.map((p) => (
            <ProductCard key={p.slug} product={toCard(p)} />
          ))}
        </Carousel>
      </section>
    </>
  );
}
