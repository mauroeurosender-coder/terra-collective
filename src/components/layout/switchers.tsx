"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { currencies, locales, type Currency } from "@/lib/config";
import { countries } from "@/lib/geo";
import { usePrefs } from "../providers";

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, dict } = usePrefs();
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(en|pt)(?=\/|$)/, "");
  return (
    <nav aria-label={dict.nav.language} className={clsx("flex items-center gap-1", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={clsx(
            "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wider transition",
            l === locale ? "bg-ink/10 text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export function CurrencySelect({ className }: { className?: string }) {
  const { currency, setCurrency, dict } = usePrefs();
  return (
    <label className={clsx("relative inline-flex items-center", className)}>
      <span className="sr-only">{dict.nav.currency}</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1 pr-5 pl-2 text-xs font-semibold tracking-wider text-ink hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-azulejo"
      >
        {currencies.map((c) => (
          <option key={c} value={c}>
            {c} {c === "EUR" ? "€" : c === "USD" ? "$" : "£"}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-1.5 text-[0.6rem]">▾</span>
    </label>
  );
}

export function CountrySelect({ className, id = "ship-to" }: { className?: string; id?: string }) {
  const { country, setCountry, locale, dict } = usePrefs();
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {dict.nav.shipTo}
      </label>
      <select id={id} value={country} onChange={(e) => setCountry(e.target.value)} className="field py-2 text-sm">
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
