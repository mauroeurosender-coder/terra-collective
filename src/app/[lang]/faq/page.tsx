import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { isLocale } from "@/lib/config";
import { getDictionary, href, t } from "@/lib/i18n";
import { getFaq } from "@/lib/data/source";
import { pageMeta, resolveLang } from "@/lib/page";
import { JsonLd } from "@/components/json-ld";
import { TileMotif } from "@/components/illustrations";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMeta(lang, "/faq", getDictionary(lang).footer.faq);
}

export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang, dict } = await resolveLang(params);
  const faq = await getFaq();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.flatMap((g) => g.items.map((i) => ({ "@type": "Question", name: t(i.q, lang), acceptedAnswer: { "@type": "Answer", text: t(i.a, lang) } }))),
  };
  return (
    <div className="container-x max-w-3xl pt-10 md:pt-16">
      <JsonLd data={jsonLd} />
      <TileMotif className="mb-6 h-10 w-10 text-azulejo" />
      <h1 className="headline text-5xl md:text-6xl">{dict.footer.faq}</h1>
      <div className="mt-12 space-y-12">
        {faq.map((g) => (
          <section key={g.title.en} aria-labelledby={`faq-${g.title.en}`}>
            <h2 id={`faq-${g.title.en}`} className="eyebrow mb-4">{t(g.title, lang)}</h2>
            <div className="divide-y divide-line border-y border-line">
              {g.items.map((i) => (
                <details key={i.q.en} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {t(i.q, lang)}
                    <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink-soft">{t(i.a, lang)}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-ink-soft">
        {lang === "pt" ? "Não encontrou a resposta?" : "Didn’t find your answer?"}{" "}
        <Link href={href(lang, "/contact")} className="link text-ink">{dict.footer.contact}</Link>
      </p>
    </div>
  );
}
