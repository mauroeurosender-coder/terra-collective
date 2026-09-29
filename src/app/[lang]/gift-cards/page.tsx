import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { getDictionary, t } from "@/lib/i18n";
import { getProduct, toLite } from "@/lib/data/catalog";
import { pageMeta, resolveLang } from "@/lib/page";
import { GiftCardForm } from "@/components/content/gift-card-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/gift-cards">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMeta(lang, "/gift-cards", getDictionary(lang).nav.giftCards);
}

export default async function GiftCardsPage({ params }: PageProps<"/[lang]/gift-cards">) {
  const { lang, dict } = await resolveLang(params);
  const product = await getProduct("gift-card");
  if (!product) notFound();
  return (
    <div className="container-x grid items-center gap-12 pt-10 md:grid-cols-2 md:gap-20 md:pt-16">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-azulejo-tint">
        <Image src={product.images[0]} alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <div>
        <h1 className="headline text-5xl md:text-6xl">{dict.nav.giftCards}</h1>
        <p className="mt-4 mb-10 text-lg text-ink-soft">{t(product.description, lang)}</p>
        <GiftCardForm product={toLite(product)} />
      </div>
    </div>
  );
}
