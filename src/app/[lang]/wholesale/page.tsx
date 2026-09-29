import Image from "next/image";
import { isLocale } from "@/lib/config";
import { getDictionary } from "@/lib/i18n";
import { pageMeta, resolveLang } from "@/lib/page";
import { EnquiryForm } from "@/components/content/enquiry-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/wholesale">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMeta(lang, "/wholesale", getDictionary(lang).footer.wholesale);
}

export default async function WholesalePage({ params }: PageProps<"/[lang]/wholesale">) {
  const { lang, dict } = await resolveLang(params);
  const pt = lang === "pt";
  const points = pt
    ? ["Encomenda mínima de 300 €, preços de revenda a partir de 50% do PVP", "Sardinhas personalizadas com cores, padrões ou o logótipo da sua marca", "Prazos de produção de 3–6 semanas", "Fatura com IVA intracomunitário para empresas da UE"]
    : ["€300 minimum order, trade prices from 50% of retail", "Custom sardines in your colours, patterns or brand logo", "3–6 week production lead times", "Intra-EU VAT invoicing for EU businesses"];
  return (
    <div className="container-x pt-10 md:pt-16">
      <div className="grid gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <p className="eyebrow mb-4">{pt ? "Para lojas, hotéis e restaurantes" : "For shops, hotels & restaurants"}</p>
          <h1 className="headline text-5xl md:text-6xl">{dict.footer.wholesale}</h1>
          <p className="mt-5 text-lg text-ink-soft">
            {pt ? "Trabalhamos com lojas independentes, hotéis e restaurantes em toda a Europa. Também fazemos peças personalizadas para eventos e presentes corporativos." : "We work with independent shops, hotels and restaurants across Europe, and make custom pieces for events and corporate gifts."}
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-azulejo" />{p}</li>
            ))}
          </ul>
          <div className="mask-arch relative mt-10 hidden aspect-[4/5] max-w-sm overflow-hidden bg-azulejo-tint md:block">
            <Image src="/products/sardine-set-of-5/3.svg" alt="" fill sizes="384px" className="object-cover" />
          </div>
        </div>
        <div className="self-start rounded-[var(--radius-card)] bg-paper p-6 md:p-10">
          <EnquiryForm kind="wholesale" />
        </div>
      </div>
    </div>
  );
}
