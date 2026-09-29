import { fxRates, type Currency, type Locale } from "./config";

const intlLocale = (l: Locale) => (l === "pt" ? "pt-PT" : "en-IE");

/** Format EUR cents in the shopper's display currency. Non-EUR is rounded to whole units. */
export function formatMoney(cents: number, currency: Currency = "EUR", locale: Locale = "en") {
  const converted = (cents / 100) * fxRates[currency];
  const whole = currency !== "EUR";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : Number.isInteger(converted) ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(converted) : converted);
}

/** Always-precise EUR formatting (checkout totals, invoices). */
export function formatEUR(cents: number, locale: Locale = "en") {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR" }).format(cents / 100);
}
