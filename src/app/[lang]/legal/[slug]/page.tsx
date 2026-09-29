import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/config";
import { t } from "@/lib/i18n";
import { getPage } from "@/lib/data/source";
import { pageMeta, resolveLang } from "@/lib/page";
import { ContentPageView } from "@/components/content/content-page";
import { CookieSettingsButton } from "@/components/content/cookie-settings-button";

const legal = ["terms", "privacy", "cookies"] as const;

export const generateStaticParams = () => locales.flatMap((lang) => legal.map((slug) => ({ lang, slug })));

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/[slug]">) {
  const { lang, slug } = await params;
  const page = await getPage(slug);
  if (!page || !isLocale(lang)) return {};
  return pageMeta(lang, `/legal/${slug}`, t(page.title, lang), t(page.intro, lang));
}

export default async function LegalPage({ params }: PageProps<"/[lang]/legal/[slug]">) {
  const { lang } = await resolveLang(params);
  const { slug } = await params;
  if (!(legal as readonly string[]).includes(slug)) notFound();
  const page = (await getPage(slug))!;
  return (
    <ContentPageView page={page} lang={lang}>
      {slug === "cookies" && <CookieSettingsButton />}
    </ContentPageView>
  );
}
