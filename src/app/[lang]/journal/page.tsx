import { isLocale } from "@/lib/config";
import { getDictionary } from "@/lib/i18n";
import { getPosts } from "@/lib/data/catalog";
import { pageMeta, resolveLang } from "@/lib/page";
import { PostCard } from "@/components/journal/post-card";
import { Reveal } from "@/components/ui/reveal";
import { WaveDivider } from "@/components/illustrations";

export async function generateMetadata({ params }: PageProps<"/[lang]/journal">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/journal", d.journal.title, d.journal.sub);
}

export default async function JournalIndex({ params }: PageProps<"/[lang]/journal">) {
  const { lang, dict } = await resolveLang(params);
  const [first, ...rest] = await getPosts();
  return (
    <div className="container-x pt-10 md:pt-16">
      <header className="mb-10 max-w-2xl md:mb-14">
        <h1 className="headline text-5xl md:text-7xl">{dict.journal.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{dict.journal.sub}</p>
      </header>
      {first && (
        <Reveal className="mb-14">
          <PostCard post={first} lang={lang} dict={dict} large />
        </Reveal>
      )}
      <WaveDivider className="mb-14 h-4 w-full text-azulejo/30" />
      <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <Reveal as="li" key={p.slug} delay={i * 80}>
            <PostCard post={p} lang={lang} dict={dict} />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
