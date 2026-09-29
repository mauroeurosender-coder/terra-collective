"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Collection } from "@/lib/types";
import { store } from "@/lib/config";
import { fmt, href, t } from "@/lib/i18n";
import { Logo, SardineLine, WaveDivider } from "../illustrations";
import { usePrefs } from "../providers";
import { NewsletterForm } from "./newsletter";
import { CountrySelect } from "./switchers";

export const paymentMethods = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", "MB WAY", "Multibanco", "PayPal", "Klarna"];

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className ?? ""}`} aria-label="Payment methods">
      {paymentMethods.map((m) => (
        <li key={m} className="rounded-md border border-line bg-paper px-2 py-1 text-[0.7rem] font-semibold tracking-wide text-ink-soft">
          {m}
        </li>
      ))}
    </ul>
  );
}

export function Footer({ collections }: { collections: Collection[] }) {
  const { locale, dict, settings } = usePrefs();
  const f = dict.footer;
  // The home page has its own newsletter band; avoid two identical forms on one page.
  const pathname = usePathname();
  const isHome = /^\/(en|pt)\/?$/.test(pathname);
  if (/^\/(en|pt)\/checkout/.test(pathname)) return null;
  const col = (title: string, links: { label: string; to: string; external?: boolean }[]) => (
    <div>
      <h2 className="eyebrow mb-4">{title}</h2>
      <ul className="space-y-2.5 text-[0.95rem]">
        {links.map((l) => (
          <li key={l.to}>
            {l.external ? (
              <a href={l.to} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-azulejo">
                {l.label}
              </a>
            ) : (
              <Link href={href(locale, l.to)} className="text-ink hover:text-azulejo">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-24 bg-cream-deep paper-grain">
      <WaveDivider className="h-4 w-full text-azulejo/40" />
      <div className="container-x grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-md">
          <Logo />
          {isHome ? (
            <p className="mt-6 text-ink-soft">{store.tagline[locale]}</p>
          ) : (
            <>
              <h2 className="headline mt-8 text-3xl">{fmt(dict.newsletter.title, { percent: store.newsletterDiscountPercent })}</h2>
              <p className="mt-2 mb-5 text-ink-soft">{dict.newsletter.body}</p>
              <NewsletterForm />
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {col(f.shop, [
            { label: dict.nav.shopAll, to: "/shop" },
            ...collections.map((c) => ({ label: t(c.name, locale), to: `/collections/${c.slug}` })),
            { label: dict.nav.giftCards, to: "/gift-cards" },
          ])}
          {col(f.help, [
            { label: f.faq, to: "/faq" },
            { label: f.shipping, to: "/shipping-returns" },
            { label: f.care, to: "/care-guide" },
            { label: f.contact, to: "/contact" },
          ])}
          {col(f.about, [
            { label: dict.nav.story, to: "/our-story" },
            { label: dict.nav.journal, to: "/journal" },
            { label: f.wholesale, to: "/wholesale" },
            { label: "Instagram", to: settings.store.instagram, external: true },
          ])}
        </div>
      </div>

      <div className="container-x flex flex-col gap-6 border-t border-line py-8 lg:flex-row lg:items-center lg:justify-between">
        <PaymentBadges />
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{dict.nav.shipTo}</span>
          <CountrySelect id="ship-to-footer" className="w-48" />
        </div>
      </div>

      <div className="container-x flex flex-col gap-4 pb-10 text-sm text-ink-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <SardineLine className="h-5 w-12 text-azulejo" />
          <p>
            © {new Date().getFullYear()} {settings.store.name} · NIF {settings.store.nif} · {f.rights}
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <li><Link className="hover:text-ink" href={href(locale, "/legal/terms")}>{f.terms}</Link></li>
          <li><Link className="hover:text-ink" href={href(locale, "/legal/privacy")}>{f.privacy}</Link></li>
          <li><Link className="hover:text-ink" href={href(locale, "/legal/cookies")}>{f.cookies}</Link></li>
          <li>
            <a className="hover:text-ink" href={store.livroReclamacoesUrl} target="_blank" rel="noopener noreferrer">
              {f.complaints}
            </a>
          </li>
                  </ul>
      </div>
    </footer>
  );
}
