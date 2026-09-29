"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Currency, Locale } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { localizePrice } from "@/lib/geo";
import type { ProductLite } from "@/lib/data/catalog";
import { useCart, useWishlist } from "@/lib/store/cart";
import { applySettings, type Settings } from "@/lib/settings";

type Prefs = {
  locale: Locale;
  dict: Dictionary;
  currency: Currency;
  country: string;
  catalog: ProductLite[];
  settings: Pick<Settings, "shipping" | "vat" | "payments" | "announcement" | "store">;
  setCurrency: (c: Currency) => void;
  setCountry: (c: string) => void;
  /** Format a catalogue price for this shopper (country VAT rules + display currency). */
  price: (cents: number, opts?: { raw?: boolean }) => string;
  tr: (s: string, vars?: Record<string, string | number>) => string;
};

const PrefsContext = createContext<Prefs | null>(null);

const setCookie = (k: string, v: string) => {
  document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`;
};

export function Providers({
  children,
  locale,
  dict,
  initialCurrency,
  initialCountry,
  catalog,
  settings,
}: {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
  initialCurrency: Currency;
  initialCountry: string;
  catalog: ProductLite[];
  settings: Pick<Settings, "shipping" | "vat" | "payments" | "announcement" | "store">;
}) {
  // Apply admin-edited shipping/VAT/payment settings before anything prices a cart.
  useMemo(() => applySettings(settings), [settings]);
  const router = useRouter();
  const [currency, setCurrencyState] = useState(initialCurrency);
  const [country, setCountryState] = useState(initialCountry);

  useEffect(() => {
    useCart.persist.rehydrate();
    useWishlist.persist.rehydrate();
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    setCookie("tc_currency", c);
  }, []);

  const setCountry = useCallback(
    (c: string) => {
      setCountryState(c);
      setCookie("tc_country", c);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<Prefs>(
    () => ({
      locale,
      dict,
      currency,
      country,
      catalog,
      settings,
      setCurrency,
      setCountry,
      price: (cents, opts) => formatMoney(opts?.raw ? cents : localizePrice(cents, country), currency, locale),
      tr: fmt,
    }),
    [locale, dict, currency, country, catalog, settings, setCurrency, setCountry],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <Providers>");
  return ctx;
}

/** Client-side price that follows the shopper's currency + country. */
export function Price({ cents, className, raw }: { cents: number; className?: string; raw?: boolean }) {
  const { price } = usePrefs();
  return <span className={className}>{price(cents, { raw })}</span>;
}
