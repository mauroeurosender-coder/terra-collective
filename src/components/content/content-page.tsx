import type { Locale } from "@/lib/config";
import { t } from "@/lib/i18n";
import type { ContentPage } from "@/lib/data/pages";
import { TileMotif, WaveDivider } from "../illustrations";

export function ContentPageView({ page, lang, children }: { page: ContentPage; lang: Locale; children?: React.ReactNode }) {
  const updated = page.updated
    ? new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "long" }).format(new Date(page.updated))
    : null;
  return (
    <div className="container-x max-w-3xl pt-10 md:pt-16">
      <header className="mb-10">
        <TileMotif className="mb-6 h-10 w-10 text-azulejo" />
        <h1 className="headline text-5xl md:text-6xl">{t(page.title, lang)}</h1>
        <p className="mt-5 text-xl leading-relaxed text-ink-soft">{t(page.intro, lang)}</p>
        {updated && <p className="mt-4 text-sm text-ink-soft">{lang === "pt" ? "Atualizado a" : "Last updated"} {updated}</p>}
      </header>
      <WaveDivider className="mb-4 h-4 w-full text-azulejo/30" />
      <div className="prose-tc">
        {page.sections.map((s, i) => (
          <section key={i}>
            {s.h && <h2>{t(s.h, lang)}</h2>}
            {s.p.map((p, j) => (
              <p key={j}>{t(p, lang)}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((li, j) => (
                  <li key={j}>{t(li, lang)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {children}
    </div>
  );
}
