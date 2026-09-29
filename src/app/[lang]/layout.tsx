import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fontVars } from "@/lib/fonts";
import "../globals.css";
import { currencies, isLocale, locales, store, type Currency } from "@/lib/config";
import { getDictionary } from "@/lib/i18n";
import { getCollections, getProducts, toLite } from "@/lib/data/catalog";
import { getCountry } from "@/lib/geo";
import { getActiveTheme, getSettings } from "@/lib/data/source";
import { ThemePreviewBar } from "@/components/layout/theme-preview-bar";
import { Decoration } from "@/components/decoration";
import { Providers } from "@/components/providers";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CookieBanner } from "@/components/layout/cookie-banner";
import { QuickViewHost } from "@/components/product/quick-view";
import { PageViewTracker } from "@/components/page-view-tracker";


export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    metadataBase: new URL(store.url),
    title: { default: `${store.name}: ${store.tagline[lang]}`, template: `%s · ${store.name}` },
    description: store.tagline[lang],
    openGraph: { siteName: store.name, locale: lang === "pt" ? "pt_PT" : "en_GB", type: "website" },
    alternates: { languages: { en: "/en", pt: "/pt", "x-default": "/en" } },
  };
}

export const viewport: Viewport = { themeColor: "#FAF7F2" };

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const jar = await cookies();
  const cur = jar.get("tc_currency")?.value as Currency | undefined;
  const currency: Currency = cur && currencies.includes(cur) ? cur : "EUR";
  const country = getCountry(jar.get("tc_country")?.value).code;

  const dict = getDictionary(lang);
  const [allCollections, products, settings, theme] = await Promise.all([getCollections(), getProducts(), getSettings(), getActiveTheme()]);
  const announcement = theme.id !== "default" && (theme.announcement.en || theme.announcement.pt) ? theme.announcement : settings.announcement;
  const previewing = jar.get("tc_theme_preview")?.value;
  const collections = allCollections.filter((c) => c.featured !== false);

  return (
    <html lang={lang === "pt" ? "pt-PT" : "en"} className={fontVars} data-theme={theme.id} style={theme.palette as React.CSSProperties}>
      <body className="flex min-h-dvh flex-col">
        <Providers locale={lang} dict={dict} initialCurrency={currency} initialCountry={country} catalog={products.map(toLite)} settings={{ shipping: settings.shipping, vat: settings.vat, payments: settings.payments, announcement, store: settings.store }}>
          <a href="#main" className="sr-only z-[100] rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
            {dict.nav.skip}
          </a>
          {previewing && <ThemePreviewBar name={theme.name} />}
          <AnnouncementBar />
          {theme.decoration !== "none" && <Decoration kind={theme.decoration} />}
          <Header collections={collections} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer collections={collections} />
          <CartDrawer />
          <QuickViewHost />
          <CookieBanner />
          <PageViewTracker />
        </Providers>
      </body>
    </html>
  );
}
