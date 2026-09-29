import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/config";
import { pageMeta, resolveLang } from "@/lib/page";
import { CollectionView } from "@/components/collection/collection-view";

export async function generateMetadata({ params }: PageProps<"/[lang]/shop">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/shop", d.collection.all, d.collection.allSub);
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[lang]/shop">) {
  const { lang, dict } = await resolveLang(params);
  return (
    <Suspense>
      <CollectionView lang={lang} dict={dict} title={dict.collection.all} blurb={dict.collection.allSub} searchParams={await searchParams} />
    </Suspense>
  );
}
