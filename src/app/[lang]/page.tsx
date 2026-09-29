import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { getCollections, getPosts, getProducts, getReviews } from "@/lib/data/catalog";
import { getSettings } from "@/lib/data/source";
import { resolveLang, toCard } from "@/lib/page";
import { ProductCard } from "@/components/product/product-card";
import { Carousel } from "@/components/ui/carousel";
import { Reveal } from "@/components/ui/reveal";
import { Stars } from "@/components/ui/stars";
import { NewsletterForm } from "@/components/layout/newsletter";
import { HandArrow, SardineLine, Squiggle, TileMotif, WaveDivider } from "@/components/illustrations";
import { PostCard } from "@/components/journal/post-card";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang, dict } = await resolveLang(params);
  const h = dict.home;
  const [allCollections, bestsellers, reviews, posts, settings] = await Promise.all([
    getCollections(),
    getProducts({ sort: "bestselling" }),
    getReviews({ featured: true }),
    getPosts(),
    getSettings(),
  ]);
  const collections = allCollections.filter((c) => c.featured !== false);
  const hero = settings.hero;
  const heroTitle = t(hero.title, lang) || h.heroTitle;
  const allProducts = bestsellers;
  const totalReviews = allProducts.reduce((n, p) => n + p.reviewCount, 0);
  const avg = totalReviews ? allProducts.reduce((n, p) => n + p.rating * p.reviewCount, 0) / totalReviews : 5;

  return (
    <>
      {/* Hero */}
      <section className="paper-grain overflow-hidden">
        <div className="container-x grid items-center gap-10 pt-8 pb-16 md:grid-cols-[1fr_1.1fr] md:gap-6 md:pt-14 md:pb-24">
          <div className="animate-fade-up md:pr-6">
            <p className="eyebrow mb-5">{t(hero.eyebrow, lang) || h.heroEyebrow}</p>
            <h1 className="headline text-[2.9rem] sm:text-6xl lg:text-[5.2rem]">
              {heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
              <span className="relative inline-block italic text-azulejo">
                {heroTitle.split(" ").slice(-1)}
                <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-mustard" />
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-soft">{t(hero.body, lang) || h.heroBody}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={href(lang, "/shop")} className="btn-primary">
                {t(hero.cta, lang) || h.heroCta} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={href(lang, "/collections/ceramic-sardines")} className="btn-outline">
                {collections[0]?.name[lang]}
              </Link>
            </div>
          </div>
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="mask-pebble relative aspect-[16/12] overflow-hidden bg-azulejo-tint shadow-[var(--shadow-lift)]">
              <Image src={hero.image || "/lifestyle/hero.svg"} alt={lang === "pt" ? "Sardinhas de cerâmica vidrada numa parede azul clara, com uma prateleira de garrafas" : "Glazed ceramic sardines on a pale blue wall above a shelf of oil bottles"} fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 left-2 flex items-end gap-1 md:-left-10">
              <span className="hand -rotate-6">{h.heroNote}</span>
              <HandArrow className="h-8 w-12 -translate-y-3 text-azulejo" />
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="container-x py-16 md:py-20" aria-labelledby="collections-h">
        <Reveal>
          <h2 id="collections-h" className="headline mb-8 text-3xl md:text-4xl">{h.collections}</h2>
        </Reveal>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {collections.map((c, i) => (
            <Reveal as="li" key={c.slug} delay={i * 70}>
              <Link href={href(lang, `/collections/${c.slug}`)} className="group block">
                <div className={`relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] ${c.accent}`}>
                  <Image src={c.image} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <h3 className="headline text-xl md:text-2xl">{t(c.name, lang)}</h3>
                  <ArrowRight className="h-5 w-5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <p className="mt-1 hidden text-sm text-ink-soft md:block">{t(c.blurb, lang)}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Bestsellers */}
      <section className="container-x py-12 md:py-16" aria-labelledby="best-h">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="best-h" className="headline text-3xl md:text-4xl">{h.bestsellers}</h2>
            <p className="mt-2 text-ink-soft">{h.bestsellersSub}</p>
          </div>
          <Link href={href(lang, "/shop")} className="link shrink-0 text-sm font-semibold lg:hidden">
            {h.viewAll}
          </Link>
        </div>
        <Carousel label={h.bestsellers}>
          {bestsellers.slice(0, 8).map((p, i) => (
            <ProductCard key={p.slug} product={toCard(p)} priority={i < 2} />
          ))}
        </Carousel>
      </section>

      {/* Story */}
      <section className="py-16 md:py-24" aria-labelledby="story-h">
        <div className="container-x grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal className="relative">
            <div className="mask-arch relative aspect-[4/5] overflow-hidden bg-cream-deep md:aspect-[5/6]">
              <Image src="/lifestyle/studio-portrait.svg" alt={lang === "pt" ? "Prateleiras do atelier com sardinhas vidradas a secar" : "Studio shelves with freshly glazed sardines"} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
            </div>
            <TileMotif className="absolute -top-6 -right-4 h-20 w-20 rotate-12 text-azulejo/70 md:-right-8" />
          </Reveal>
          <Reveal delay={100}>
            <p className="eyebrow mb-4">{h.storyEyebrow}</p>
            <h2 id="story-h" className="headline text-4xl md:text-5xl">{h.storyTitle}</h2>
            <p className="mt-6 max-w-lg text-lg text-ink-soft">{h.storyBody}</p>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-8">
              {[
                [h.stat1, h.stat1b],
                [h.stat2, h.stat2b],
                [h.stat3, h.stat3b],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="headline text-2xl text-azulejo md:text-3xl">{a}</dt>
                  <dd className="mt-1 text-sm text-ink-soft">{b}</dd>
                </div>
              ))}
            </dl>
            <Link href={href(lang, "/our-story")} className="btn-outline mt-10">
              {h.storyCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Gift guide by price */}
      <section className="container-x py-12 md:py-16" aria-labelledby="gift-h">
        <Reveal>
          <h2 id="gift-h" className="headline mb-8 text-3xl md:text-4xl">{h.giftTitle}</h2>
        </Reveal>
        <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
          {[
            { title: h.under25, sub: h.under25Sub, to: "/shop?max=25", bg: "bg-mustard-tint", img: "/products/tinned-fish-playing-cards/1.svg" },
            { title: h.under50, sub: h.under50Sub, to: "/shop?max=50", bg: "bg-rose-tint", img: "/products/ceramic-oil-bottle/blue.svg" },
            { title: h.statement, sub: h.statementSub, to: "/shop?min=80&sort=price-desc", bg: "bg-azulejo-tint", img: "/products/sardine-set-of-5/1.svg" },
          ].map((g, i) => (
            <Reveal as="li" key={g.to} delay={i * 80}>
              <Link href={href(lang, g.to)} className={`group relative flex h-56 items-end overflow-hidden rounded-[var(--radius-card)] p-6 md:h-72 ${g.bg}`}>
                <div className="absolute -top-6 -right-10 h-[125%] w-[62%] transition duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-2 group-hover:rotate-2">
                  <Image src={g.img} alt="" fill sizes="30vw" className="object-contain" />
                </div>
                <div className="relative">
                  <h3 className="headline text-3xl">{g.title}</h3>
                  <p className="mt-1 max-w-[12rem] text-sm text-ink-soft">{g.sub}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Reviews */}
      <section className="paper-grain mt-12 bg-paper py-16 md:py-24" aria-labelledby="reviews-h">
        <div className="container-x">
          <div className="mb-10 text-center">
            <SardineLine className="mx-auto mb-4 h-8 w-20 text-azulejo" />
            <h2 id="reviews-h" className="headline text-3xl md:text-5xl">{h.reviewsTitle}</h2>
            <p className="mt-3 flex items-center justify-center gap-2 text-ink-soft">
              <Stars rating={avg} /> {fmt(h.reviewsSub, { rating: avg.toFixed(1), count: totalReviews })}
            </p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
            {reviews.slice(0, 3).map((r, i) => {
              const p = allProducts.find((x) => x.slug === r.productSlug);
              return (
                <Reveal as="li" key={r.id} delay={i * 80} className="flex flex-col rounded-[var(--radius-card)] bg-cream p-6">
                  <Stars rating={r.rating} />
                  <p className="mt-4 font-semibold">{r.title}</p>
                  <p className="mt-2 flex-1 text-ink-soft">“{r.body}”</p>
                  <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
                    <span className="font-medium">
                      {r.author} · {r.country}
                    </span>
                    {p && (
                      <Link href={href(lang, `/products/${p.slug}`)} className="link truncate pl-3 text-ink-soft">
                        {t(p.name, lang)}
                      </Link>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </ul>

          {/* Instagram-style grid */}
          <div className="mt-20">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h3 className="headline text-2xl md:text-3xl">{h.instaTitle}</h3>
                <p className="mt-1 text-sm text-ink-soft">{h.instaSub}</p>
              </div>
              <a href={store.instagram} target="_blank" rel="noopener noreferrer" className="link shrink-0 text-sm font-semibold">
                @terracollective
              </a>
            </div>
            <ul className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="group relative aspect-square overflow-hidden rounded-xl bg-cream-deep">
                  <Image src={`/insta/${n}.svg`} alt="" fill sizes="(min-width: 768px) 16vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Journal */}
      <section className="container-x py-16 md:py-24" aria-labelledby="journal-h">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="journal-h" className="headline text-3xl md:text-4xl">{h.journalTitle}</h2>
          <Link href={href(lang, "/journal")} className="link shrink-0 text-sm font-semibold">
            {h.viewAll}
          </Link>
        </div>
        <ul className="grid gap-8 md:grid-cols-3 md:gap-6">
          {posts.slice(0, 3).map((p, i) => (
            <Reveal as="li" key={p.slug} delay={i * 80}>
              <PostCard post={p} lang={lang} dict={dict} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Newsletter */}
      <section className="container-x" aria-labelledby="nl-h">
        <div className="relative overflow-hidden rounded-[2rem] bg-azulejo px-6 py-14 text-white md:px-16 md:py-20">
          <WaveDivider className="absolute inset-x-0 top-6 h-4 w-full text-white/15" />
          <WaveDivider className="absolute inset-x-0 bottom-6 h-4 w-full text-white/15" />
          <SardineLine className="absolute -right-6 bottom-10 hidden h-24 w-60 -rotate-12 text-white/25 md:block" strokeWidth={1.2} />
          <div className="relative max-w-xl">
            <h2 id="nl-h" className="headline text-4xl md:text-5xl">{fmt(dict.newsletter.title, { percent: store.newsletterDiscountPercent })}</h2>
            <p className="mt-3 mb-8 text-white/85">{dict.newsletter.body}</p>
            <NewsletterForm tone="dark" source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
