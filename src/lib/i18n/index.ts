import type { Locale } from "../config";
import type { L } from "../types";
import en, { type Dictionary } from "./en";
import pt from "./pt";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, pt };

export const getDictionary = (locale: Locale) => dictionaries[locale];

/** Replace {tokens} in a translated string. */
export function fmt(str: string, vars: Record<string, string | number> = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Pick the right language from a localized field. */
export const t = (l: L, locale: Locale) => l[locale] ?? l.en;

/** Build a locale-prefixed path. */
export const href = (locale: Locale, path = "") => `/${locale}${path === "/" ? "" : path}`;
