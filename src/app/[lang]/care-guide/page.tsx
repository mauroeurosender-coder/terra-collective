import { isLocale } from "@/lib/config";
import { t } from "@/lib/i18n";
import { getPage } from "@/lib/data/source";
import { pageMeta, resolveLang } from "@/lib/page";
import { ContentPageView } from "@/components/content/content-page";


export async function generateMetadata({ params }: PageProps<"/[lang]/care-guide">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const page = (await getPage("care-guide"))!;
  return pageMeta(lang, "/care-guide", t(page.title, lang), t(page.intro, lang));
}

export default async function Page({ params }: PageProps<"/[lang]/care-guide">) {
  const { lang } = await resolveLang(params);
  const page = (await getPage("care-guide"))!;
  return <ContentPageView page={page} lang={lang} />;
}
