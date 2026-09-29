import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { getPost, getPosts, getProductsBySlugs } from "@/lib/data/catalog";
import { pageMeta, resolveLang, toCard } from "@/lib/page";
import { ProductCard } from "@/components/product/product-card";
import { PostCard } from "@/components/journal/post-card";
import { JsonLd } from "@/components/json-ld";
import { SardineLine, TileMotif } from "@/components/illustrations";

export async function generateStaticParams() {
  const posts = await getPosts();
  return locales.flatMap((lang) => posts.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/journal/[slug]">) {
  const { lang, slug } = await params;
  const p = await getPost(slug);
  if (!p || !isLocale(lang)) return {};
  return { ...pageMeta(lang, `/journal/${slug}`, t(p.title, lang), t(p.excerpt, lang), p.cover), openGraph: { type: "article", publishedTime: p.date, images: [{ url: p.cover }] } };
}

export default async function Article({ params }: PageProps<"/[lang]/journal/[slug]">) {
  const { lang, dict } = await resolveLang(params);
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const productSlugs = post.blocks.flatMap((b) => (b.type === "products" ? b.slugs : []));
  const products = await getProductsBySlugs([...new Set(productSlugs)]);
  const more = (await getPosts()).filter((p) => p.slug !== slug).slice(0, 2);
  const date = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.date));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: t(post.title, lang),
    description: t(post.excerpt, lang),
    image: `${store.url}${post.cover}`,
    datePublished: post.date,
    inLanguage: lang,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: store.name },
    mainEntityOfPage: `${store.url}/${lang}/journal/${slug}`,
  };

  return (
    <article className="pt-10 md:pt-16">
      <JsonLd data={jsonLd} />
      <header className="container-x max-w-3xl text-center">
        <Link href={href(lang, "/journal")} className="text-xs font-semibold tracking-wider text-azulejo uppercase hover:underline">
          {t(post.category, lang)}
        </Link>
        <h1 className="headline mt-4 text-4xl md:text-6xl">{t(post.title, lang)}</h1>
        <p className="mt-5 text-lg text-ink-soft">{t(post.excerpt, lang)}</p>
        <p className="mt-5 text-sm text-ink-soft">
          <time dateTime={post.date}>{date}</time> · {fmt(dict.journal.minutes, { n: post.readingMinutes })}
        </p>
      </header>

      <div className="container-x mt-10 md:mt-14">
        <div className="relative mx-auto aspect-[16/10] max-w-5xl overflow-hidden rounded-[2rem] bg-cream-deep">
          <Image src={post.cover} alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
        </div>
      </div>

      <div className="container-x mt-12 max-w-2xl prose-tc">
        {post.blocks.map((b, i) => {
          switch (b.type) {
            case "p":
              return <p key={i}>{t(b.text, lang)}</p>;
            case "h2":
              return <h2 key={i}>{t(b.text, lang)}</h2>;
            case "quote":
              return (
                <blockquote key={i} className="my-10 border-l-0 text-center">
                  <TileMotif className="mx-auto mb-4 h-8 w-8 text-azulejo" />
                  <p className="headline text-2xl text-ink italic md:text-3xl">“{t(b.text, lang)}”</p>
                </blockquote>
              );
            case "image":
              return (
                <figure key={i} className="my-10 -mx-4 sm:mx-0">
                  <div className="relative aspect-[16/10] overflow-hidden bg-cream-deep sm:rounded-[var(--radius-card)]">
                    <Image src={b.src} alt={t(b.alt, lang)} fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
                  </div>
                  {b.caption && <figcaption className="hand mt-3 px-4 text-center sm:px-0">{t(b.caption, lang)}</figcaption>}
                </figure>
              );
            case "gallery":
              return (
                <figure key={i} className="my-10 -mx-4 sm:mx-0">
                  <div className={`grid gap-2 ${b.images.length > 2 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
                    {b.images.map((src, k) => (
                      <div key={k} className="relative aspect-square overflow-hidden bg-cream-deep sm:rounded-xl">
                        <Image src={src} alt="" fill sizes="(min-width: 768px) 224px, 50vw" className="object-cover" />
                      </div>
                    ))}
                  </div>
                  {b.caption && <figcaption className="hand mt-3 px-4 text-center sm:px-0">{t(b.caption, lang)}</figcaption>}
                </figure>
              );
            case "video": {
              const embed = videoEmbed(b.url);
              return embed ? (
                <figure key={i} className="my-10">
                  <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
                    <iframe src={embed} title={b.caption ? t(b.caption, lang) : "Video"} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
                  </div>
                  {b.caption && <figcaption className="hand mt-3 text-center">{t(b.caption, lang)}</figcaption>}
                </figure>
              ) : null;
            }
            case "products":
              return (
                <aside key={i} aria-label={dict.journal.shopStory} className="not-prose my-10 rounded-[var(--radius-card)] bg-paper p-5 md:-mx-16 md:p-6">
                  <p className="eyebrow mb-4 flex items-center gap-2">
                    <SardineLine className="h-4 w-10 text-azulejo" /> {dict.journal.shopStory}
                  </p>
                  <ul className={`grid gap-4 ${b.slugs.length > 3 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
                    {b.slugs.map((s) => {
                      const p = products.find((x) => x.slug === s);
                      return p ? (
                        <li key={s} className="text-base">
                          <ProductCard product={toCard(p)} />
                        </li>
                      ) : null;
                    })}
                  </ul>
                </aside>
              );
          }
        })}
      </div>

      {more.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="more-h">
          <h2 id="more-h" className="headline mb-8 text-3xl">{dict.journal.more}</h2>
          <ul className="grid gap-10 md:grid-cols-2">
            {more.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} lang={lang} dict={dict} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

/** Privacy-friendly embed URLs for YouTube (nocookie) and Vimeo (dnt). */
function videoEmbed(url: string) {
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;
  return null;
}
