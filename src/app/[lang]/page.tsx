import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { getCollections, getPosts, getProducts, getReviews } from "@/lib/data/catalog";
import { getActiveTheme, getSettings } from "@/lib/data/source";
import { resolveLang, toCard } from "@/lib/page";
import { ProductCard } from "@/components/product/product-card";
import { Carousel } from "@/components/ui/carousel";
import { Reveal } from "@/components/ui/reveal";
import { Stars } from "@/components/ui/stars";
import { NewsletterForm } from "@/components/layout/newsletter";
import { HandArrow, SardineLine, Squiggle, WaveDivider } from "@/components/illustrations";
import { PostCard } from "@/components/journal/post-card";
import { imperfect, places, process as making, ribbon, seal } from "@/lib/data/home-story";
import { ProcessIcon } from "@/components/home/process-icons";
import { PlacesMap } from "@/components/home/places-map";
import { DottedPath, Ribbon, RotatingSeal, Stamp } from "@/components/home/craft";

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
  const theme = await getActiveTheme();
  const seasonal = theme.id !== "default";
  const collections = allCollections.filter((c) => c.featured !== false);
  // A seasonal theme replaces the hero copy (the image stays the one set in Content).
  const hero = seasonal ? { ...settings.hero, ...theme.hero } : settings.hero;
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
              <Link href={href(lang, seasonal ? theme.hero.ctaHref : "/shop")} className="btn-primary">
                {t(hero.cta, lang) || h.heroCta} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={href(lang, "/collections/ceramic-sardines")} className="btn-outline">
                {collections[0]?.name[lang]}
              </Link>
            </div>
          </div>
          <div className="relative animate-fade-up [animation-delay:120ms]">
            {seasonal && t(theme.stamp, lang) && (
              <span className="absolute -top-4 right-4 z-10 grid h-24 w-24 rotate-12 place-items-center rounded-full bg-azulejo p-2 text-center font-serif text-[0.95rem] leading-tight font-semibold text-white shadow-[var(--shadow-lift)] ring-4 ring-cream md:-top-6 md:right-8 md:h-28 md:w-28 md:text-lg">
                {t(theme.stamp, lang)}
              </span>
            )}
            <div className="mask-pebble relative aspect-[16/12] overflow-hidden bg-azulejo-tint shadow-[var(--shadow-lift)]">
              <Image src={hero.image || "/lifestyle/hero.svg"} alt={lang === "pt" ? "Sardinhas de cerâmica vidrada numa parede azul clara, com uma prateleira de garrafas" : "Glazed ceramic sardines on a pale blue wall above a shelf of oil bottles"} fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
            </div>
            <RotatingSeal text={t(seal, lang)} className="absolute -right-2 -bottom-8 h-24 w-24 md:-right-6 md:h-32 md:w-32" />
            <div className="absolute -bottom-6 left-2 flex items-end gap-1 md:-left-10">
              <span className="hand -rotate-6">{h.heroNote}</span>
              <HandArrow className="h-8 w-12 -translate-y-3 text-azulejo" />
            </div>
          </div>
        </div>
      </section>

      <Ribbon items={ribbon} lang={lang} />

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

      {/* How it is made */}
      <section className="paper-grain relative overflow-hidden bg-cream-deep py-16 md:py-24" aria-labelledby="making-h">
        <div className="container-x">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow mb-4">{t(making.eyebrow, lang)}</p>
            <h2 id="making-h" className="headline text-4xl md:text-5xl">{t(making.title, lang)}</h2>
            <p className="mt-5 text-lg text-ink-soft">{t(making.intro, lang)}</p>
          </Reveal>
          <div className="relative mt-14">
            <DottedPath className="absolute inset-x-0 top-10 hidden h-10 w-full text-azulejo/50 lg:block" />
            <ol className="relative grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {making.steps.map((st, i) => (
                <Reveal as="li" key={st.n} delay={(i % 3) * 90} className="group">
                  <div className="relative mx-auto w-fit">
                    <div className={`grid h-28 w-28 place-items-center rounded-[38%_62%_55%_45%/45%_40%_60%_55%] bg-paper text-azulejo shadow-[var(--shadow-soft)] transition duration-500 group-hover:-rotate-3 ${i % 2 ? "rotate-2" : "-rotate-2"}`}>
                      <ProcessIcon kind={st.icon} className="h-20 w-20" />
                    </div>
                    <span className="absolute -top-2 -left-3 grid h-9 w-9 place-items-center rounded-full bg-azulejo text-sm font-semibold text-white ring-4 ring-cream-deep">{st.n}</span>
                  </div>
                  <div className="mt-5 text-center">
                    <p className="hand text-2xl text-coral-ink">{st.word}</p>
                    <h3 className="headline mt-1 text-2xl">{t(st.title, lang)}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-ink-soft">{t(st.body, lang)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal className="mt-16 flex flex-col items-center gap-6 text-center">
            <p className="hand text-3xl text-azulejo md:text-4xl">{t(making.outro, lang)}</p>
            <dl className="grid w-full max-w-2xl grid-cols-3 gap-4 border-t border-line pt-8">
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
            <Link href={href(lang, "/our-story")} className="btn-outline">
              {h.storyCta} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
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

      {/* Imperfect by design */}
      <section className="container-x py-16 md:py-24" aria-labelledby="imperfect-h">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.35fr]">
          <Reveal>
            <p className="eyebrow mb-4">{t(imperfect.eyebrow, lang)}</p>
            <h2 id="imperfect-h" className="headline text-4xl md:text-5xl">{t(imperfect.title, lang)}</h2>
            <p className="mt-5 max-w-md text-lg text-ink-soft">{t(imperfect.body, lang)}</p>
            <Link href={href(lang, "/collections/ceramic-sardines")} className="btn-primary mt-8">
              {t(imperfect.cta, lang)} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <ul className="grid grid-cols-3 gap-3 pb-8 md:gap-6">
            {["blue", "coral", "mustard"].map((c, i) => (
              <Reveal as="li" key={c} delay={i * 110} className={i === 1 ? "translate-y-8" : ""}>
                <div className={`relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-soft)] ${["-rotate-2", "rotate-1", "-rotate-1"][i]}`}>
                  <Image src={`/products/sardine-wall-decor/${c}.svg`} alt="" fill sizes="(min-width: 1024px) 18vw, 30vw" className="object-cover" />
                </div>
                <p className="hand mt-4 flex items-start gap-1 text-lg leading-tight text-ink md:text-2xl">
                  <HandArrow className="h-6 w-8 shrink-0 -scale-y-100 text-coral" />
                  {t(imperfect.notes[i], lang)}
                </p>
              </Reveal>
            ))}
          </ul>
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

      {/* Where it comes from */}
      <section className="container-x py-16 md:py-24" aria-labelledby="places-h">
        <Reveal className="mb-10 max-w-2xl">
          <p className="eyebrow mb-4">{t(places.eyebrow, lang)}</p>
          <h2 id="places-h" className="headline text-4xl md:text-5xl">{t(places.title, lang)}</h2>
          <p className="mt-5 text-lg text-ink-soft">{t(places.body, lang)}</p>
        </Reveal>
        <PlacesMap pins={places.pins} lang={lang} />
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
                <Reveal as="li" key={r.id} delay={i * 80} className={`relative flex flex-col rounded-md bg-cream p-6 pt-7 shadow-[var(--shadow-soft)] ring-1 ring-line ${["md:-rotate-1", "md:rotate-1", "md:-rotate-[0.5deg]"][i % 3]}`}>
                  <Stamp country={r.country} className="absolute top-4 right-4 h-12 w-[4.2rem]" />
                  <Stars rating={r.rating} />
                  <p className="mt-4 pr-16 font-semibold">{r.title}</p>
                  <p className="hand mt-3 flex-1 text-[1.35rem] leading-snug text-ink">“{r.body}”</p>
                  <div className="mt-6 flex items-center justify-between border-t border-dashed border-ink/20 pt-4 text-sm">
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
