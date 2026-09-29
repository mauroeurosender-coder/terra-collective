import type { Locale } from "./config";
import type { ProductOption, Variant } from "./types";

type Opts = Partial<Record<ProductOption["name"], string>>;

export const matches = (v: Variant, sel: Opts) =>
  Object.entries(sel).every(([k, val]) => v.options[k as ProductOption["name"]] === val);

export const findVariant = (variants: Variant[], sel: Opts) => variants.find((v) => matches(v, sel));

/** Is there any in-stock variant if `name` were set to `value`, keeping the other selections? */
export const valueAvailable = (variants: Variant[], sel: Opts, name: ProductOption["name"], value: string) =>
  variants.some((v) => matches(v, { ...sel, [name]: value }) && v.stock > 0);

export function variantLabel(options: ProductOption[], v: Variant, locale: Locale) {
  return options
    .map((o) => o.values.find((x) => x.value === v.options[o.name])?.label[locale])
    .filter(Boolean)
    .join(" · ");
}

export const variantLabelL = (options: ProductOption[], v: Variant) => ({
  en: variantLabel(options, v, "en"),
  pt: variantLabel(options, v, "pt"),
});
