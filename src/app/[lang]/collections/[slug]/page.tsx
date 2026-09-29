import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/config";
import { t } from "@/lib/i18n";
import { getCollection, getCollections } from "@/lib/data/catalog";
import { pageMeta, resolveLang } from "@/lib/page";
import { CollectionView } from "@/components/collection/collection-view";
import type { CollectionSlug } from "@/lib/types";

export async function generateStaticParams() {
  const cols = await getCollections();
  return locales.flatMap((lang) => cols.map((c) => ({ lang, slug: c.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/collections/[slug]">) {
  const { lang, slug } = await params;
  const c = await getCollection(slug);
  if (!c || !isLocale(lang)) return {};
  return pageMeta(lang, `/collections/${slug}`, t(c.name, lang), t(c.blurb, lang), c.image);
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/[lang]/collections/[slug]">) {
  const { lang, dict } = await resolveLang(params);
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) notFound();
  return (
    <Suspense>
      <CollectionView lang={lang} dict={dict} title={t(c.name, lang)} blurb={t(c.blurb, lang)} collection={slug as CollectionSlug} searchParams={await searchParams} />
    </Suspense>
  );
}
