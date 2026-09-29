"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { SlidersHorizontal } from "lucide-react";
import { fmt } from "@/lib/i18n";
import { swatches } from "@/lib/swatches";
import type { ColorKey } from "@/lib/types";
import { usePrefs } from "../providers";
import { Sheet } from "../ui/sheet";

type Facets = { colors: ColorKey[]; sizes: string[]; collections: { value: string; label: string }[] };

const colorLabels: Record<ColorKey, { en: string; pt: string }> = {
  blue: { en: "Blue", pt: "Azul" },
  coral: { en: "Coral", pt: "Coral" },
  mustard: { en: "Mustard", pt: "Mostarda" },
  olive: { en: "Olive", pt: "Azeitona" },
  white: { en: "White", pt: "Branco" },
  rose: { en: "Rose", pt: "Rosa" },
  natural: { en: "Natural", pt: "Natural" },
  multi: { en: "Multicolour", pt: "Multicolor" },
};
const sizeLabels: Record<string, { en: string; pt: string }> = {
  small: { en: "Small", pt: "Pequeno" },
  medium: { en: "Medium", pt: "Médio" },
  large: { en: "Large", pt: "Grande" },
  statement: { en: "Statement", pt: "Statement" },
};
const priceBands = [
  { max: "25", min: "" },
  { max: "50", min: "" },
  { max: "100", min: "" },
  { max: "", min: "80" },
];

function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const get = (k: string) => sp.get(k)?.split(",").filter(Boolean) ?? [];
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  };
  const toggle = (k: string, v: string) => {
    const cur = get(k);
    set({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(",") || null });
  };
  return { sp, get, set, toggle, pending };
}

export function SortSelect() {
  const { dict } = usePrefs();
  const { sp, set } = useFilterParams();
  const c = dict.collection;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-soft">{c.sort}</span>
      <select value={sp.get("sort") ?? "bestselling"} onChange={(e) => set({ sort: e.target.value === "bestselling" ? null : e.target.value })} className="field w-auto rounded-full py-2 pr-8 text-sm">
        <option value="bestselling">{c.sortBestselling}</option>
        <option value="newest">{c.sortNewest}</option>
        <option value="price-asc">{c.sortPriceAsc}</option>
        <option value="price-desc">{c.sortPriceDesc}</option>
      </select>
    </label>
  );
}

export function Filters({ facets, activeCount, resultCount }: { facets: Facets; activeCount: number; resultCount: number }) {
  const { dict } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-outline mb-6 min-h-11 w-full py-2 lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> {dict.collection.filters}
        {activeCount > 0 && <span className="rounded-full bg-ink px-2 text-xs text-cream">{activeCount}</span>}
      </button>
      <aside className="hidden lg:block" aria-label={dict.collection.filters}>
        <div className="sticky top-28">
          <FilterPanel facets={facets} activeCount={activeCount} />
        </div>
      </aside>
      <Sheet open={open} onClose={() => setOpen(false)} side="left" label={dict.collection.filters}>
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          <h2 className="headline mb-6 text-2xl">{dict.collection.filters}</h2>
          <FilterPanel facets={facets} activeCount={activeCount} />
        </div>
        <div className="border-t border-line p-4">
          <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>
            {fmt(dict.collection.apply, { count: resultCount })}
          </button>
        </div>
      </Sheet>
    </>
  );
}

function FilterPanel({ facets, activeCount }: { facets: Facets; activeCount: number }) {
  const { dict, locale, price } = usePrefs();
  const { get, set, toggle, sp, pending } = useFilterParams();
  const c = dict.collection;
  const colors = get("color");
  const sizes = get("size");
  const cols = get("collection");
  const max = sp.get("max") ?? "";
  const min = sp.get("min") ?? "";

  return (
    <div className={clsx("space-y-8 transition-opacity", pending && "opacity-60")}>
      {activeCount > 0 && (
        <button type="button" onClick={() => set({ color: null, size: null, collection: null, max: null, min: null, instock: null })} className="link text-sm font-medium">
          {c.clear} ({activeCount})
        </button>
      )}

      {facets.collections.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">{c.collection}</legend>
          <div className="space-y-2">
            {facets.collections.map((col) => (
              <label key={col.value} className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                <input type="checkbox" checked={cols.includes(col.value)} onChange={() => toggle("collection", col.value)} className="h-4 w-4 accent-azulejo" />
                {col.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {facets.colors.length > 1 && (
        <fieldset>
          <legend className="eyebrow mb-3">{c.color}</legend>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((col) => (
              <button
                key={col}
                type="button"
                aria-pressed={colors.includes(col)}
                onClick={() => toggle("color", col)}
                className="chip gap-2 pl-2"
              >
                <span className="h-5 w-5 rounded-full ring-1 ring-ink/10" style={{ background: swatches[col] }} />
                {colorLabels[col][locale]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-3">{c.price}</legend>
        <div className="flex flex-wrap gap-2">
          {priceBands.map((b) => {
            const on = max === b.max && min === b.min;
            return (
              <button key={b.max + b.min} type="button" aria-pressed={on} onClick={() => set(on ? { max: null, min: null } : { max: b.max || null, min: b.min || null })} className="chip">
                {b.max ? fmt(dict.nav.underPrice, { price: price(Number(b.max) * 100, { raw: true }) }) : `${price(Number(b.min) * 100, { raw: true })}+`}
              </button>
            );
          })}
        </div>
      </fieldset>

      {facets.sizes.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">{c.size}</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} type="button" aria-pressed={sizes.includes(s)} onClick={() => toggle("size", s)} className="chip">
                {sizeLabels[s]?.[locale] ?? s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-3">{c.availability}</legend>
        <label className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
          <input type="checkbox" checked={sp.get("instock") === "1"} onChange={(e) => set({ instock: e.target.checked ? "1" : null })} className="h-4 w-4 accent-azulejo" />
          {c.inStock}
        </label>
      </fieldset>
    </div>
  );
}
