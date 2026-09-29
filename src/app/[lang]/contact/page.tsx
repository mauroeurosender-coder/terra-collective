import { Clock, Mail, MapPin } from "lucide-react";
import { isLocale } from "@/lib/config";
import { getSettings } from "@/lib/data/source";
import { getDictionary } from "@/lib/i18n";
import { pageMeta, resolveLang } from "@/lib/page";
import { EnquiryForm } from "@/components/content/enquiry-form";
import { SardineLine } from "@/components/illustrations";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMeta(lang, "/contact", getDictionary(lang).footer.contact);
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang, dict } = await resolveLang(params);
  const pt = lang === "pt";
  const { store } = await getSettings();
  return (
    <div className="container-x grid gap-12 pt-10 md:grid-cols-[1fr_1.2fr] md:gap-20 md:pt-16">
      <div>
        <h1 className="headline text-5xl md:text-6xl">{dict.footer.contact}</h1>
        <p className="mt-5 text-lg text-ink-soft">
          {pt ? "Uma pergunta sobre uma peça, uma encomenda ou só para dizer olá? Respondemos em 1–2 dias úteis." : "A question about a piece, an order, or just saying hello? We reply within 1–2 business days."}
        </p>
        <ul className="mt-10 space-y-5">
          <li className="flex gap-4"><Mail className="mt-0.5 h-5 w-5 text-azulejo" /><a href={`mailto:${store.email}`} className="link">{store.email}</a></li>
          <li className="flex gap-4"><MapPin className="mt-0.5 h-5 w-5 text-azulejo" /><span className="text-ink-soft">{store.address}</span></li>
          <li className="flex gap-4"><Clock className="mt-0.5 h-5 w-5 text-azulejo" /><span className="text-ink-soft">{pt ? "Seg–Sex, 10h–18h (hora de Lisboa)" : "Mon–Fri, 10am–6pm (Lisbon time)"}</span></li>
        </ul>
        <SardineLine className="mt-12 h-10 w-28 text-azulejo/60" />
      </div>
      <div className="rounded-[var(--radius-card)] bg-paper p-6 md:p-10">
        <EnquiryForm kind="contact" />
      </div>
    </div>
  );
}
