import Image from "next/image";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { href, t } from "@/lib/i18n";
import { getPage } from "@/lib/data/source";
import { pageMeta, resolveLang } from "@/lib/page";
import { Reveal } from "@/components/ui/reveal";
import { HandArrow, SardineLine, TileMotif, WaveDivider } from "@/components/illustrations";


export async function generateMetadata({ params }: PageProps<"/[lang]/our-story">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const page = (await getPage("our-story"))!;
  return pageMeta(lang, "/our-story", t(page.title, lang), t(page.intro, lang));
}

export default async function StoryPage({ params }: PageProps<"/[lang]/our-story">) {
  const { lang, dict } = await resolveLang(params);
  const page = (await getPage("our-story"))!;
  const pt = lang === "pt";
  const steps = [
    { img: "/lifestyle/studio-portrait.svg", t: pt ? "Prensar" : "Press", d: pt ? "O grés branco é prensado à mão em moldes que nós próprios esculpimos." : "White stoneware is pressed by hand into moulds we carve ourselves." },
    { img: "/journal/painting.svg", t: pt ? "Pintar" : "Paint", d: pt ? "Escamas, riscas e flores pintadas à mão livre, nunca decalcadas." : "Scales, stripes and flowers painted freehand, never traced." },
    { img: "/products/sardine-wall-decor/detail.svg", t: pt ? "Vidrar" : "Glaze", d: pt ? "Uma segunda cozedura a 1.200°C dá o brilho profundo e vítreo." : "A second firing at 1,200°C gives the deep, glassy shine." },
  ];
  return (
    <>
      <section className="paper-grain">
        <div className="container-x grid items-center gap-10 pt-10 pb-16 md:grid-cols-2 md:pt-16 md:pb-24">
          <div>
            <p className="eyebrow mb-4">{t(page.title, lang)}</p>
            <h1 className="headline text-5xl md:text-7xl">{pt ? "Feito à mão, com sol dentro" : "Made by hand, with sunshine inside"}</h1>
            <p className="mt-6 max-w-lg text-xl leading-relaxed text-ink-soft">{t(page.intro, lang)}</p>
          </div>
          <div className="relative">
            <div className="mask-pebble relative aspect-square overflow-hidden bg-azulejo-tint">
              <Image src="/products/sardine-set-of-5/1.svg" alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <p className="hand absolute -bottom-4 left-4 flex items-end gap-1 md:-left-6">
              {pt ? "a primeira sardinha" : "where it all began"} <HandArrow className="h-7 w-10 -translate-y-2" />
            </p>
          </div>
        </div>
      </section>

      <div className="container-x max-w-3xl py-16 prose-tc">
        {page.sections.map((s, i) => (
          <section key={i}>
            {s.h && <h2>{t(s.h, lang)}</h2>}
            {s.p.map((p, j) => <p key={j}>{t(p, lang)}</p>)}
          </section>
        ))}
      </div>

      <section className="bg-paper py-16 md:py-24" aria-labelledby="process-h">
        <div className="container-x">
          <div className="mb-12 text-center">
            <TileMotif className="mx-auto mb-4 h-10 w-10 text-azulejo" />
            <h2 id="process-h" className="headline text-4xl md:text-5xl">{pt ? "Do barro ao vidrado" : "From clay to glaze"}</h2>
          </div>
          <ol className="grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.t} delay={i * 100}>
                <div className="mask-arch relative aspect-[4/5] overflow-hidden bg-cream-deep">
                  <Image src={s.img} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                </div>
                <p className="headline mt-5 text-3xl"><span className="text-azulejo">{i + 1}.</span> {s.t}</p>
                <p className="mt-2 text-ink-soft">{s.d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-20 text-center">
        <SardineLine className="mx-auto h-12 w-32 text-azulejo" />
        <h2 className="headline mt-6 text-4xl">{pt ? "Conheça as peças" : "Meet the pieces"}</h2>
        <Link href={href(lang, "/shop")} className="btn-primary mt-8">{dict.home.heroCta}</Link>
        <WaveDivider className="mt-20 h-4 w-full text-azulejo/30" />
      </section>
    </>
  );
}
