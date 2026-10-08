"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Copy, GripVertical, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { L, ProductOption } from "@/lib/types";
import { swatches } from "@/lib/swatches";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { combinations, slugify, variantKey, type MediaItem, type ProductForm, type VariantRow } from "@/lib/admin/product-form";
import { deleteProduct, duplicateProduct, saveProduct } from "@/app/admin/(app)/products/actions";
import { Card } from "./ui";

type Lang = "en" | "pt";
type Collection = { id: string; name: string };

const optionTypes: { name: ProductOption["name"]; label: L }[] = [
  { name: "size", label: { en: "Size", pt: "Tamanho" } },
  { name: "color", label: { en: "Glaze", pt: "Vidrado" } },
  { name: "set", label: { en: "Quantity", pt: "Quantidade" } },
  { name: "handles", label: { en: "Handles", pt: "Asas" } },
];

const toEuros = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
const toCents = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export function ProductEditor({ initial, collections, allProducts, isOwner }: { initial: ProductForm; collections: Collection[]; allProducts: { slug: string; name: string }[]; isOwner: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<ProductForm>(initial);
  const [lang, setLang] = useState<Lang>("en");
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const setL = (k: "name" | "short" | "description", v: string) => {
    setF((p) => {
      const next = { ...p, [k]: { ...p[k], [lang]: v } };
      if (k === "name" && lang === "en" && !slugTouched) next.slug = slugify(v);
      return next;
    });
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      const r = await saveProduct(f);
      if (!r.ok) return setMsg({ kind: "error", text: r.error });
      setMsg({ kind: "ok", text: r.message ?? "Saved." });
      setDirty(false);
      if (!f.id && r.id) router.replace(`/admin/products/${r.id}`);
      else router.refresh();
    });

  return (
    <div className="pb-28">
      {/* Language switch for all translated fields */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Editing language" className="inline-flex rounded-full border border-line bg-paper p-1">
          {(["en", "pt"] as const).map((l) => (
            <button key={l} role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={clsx("rounded-full px-4 py-1.5 text-sm font-medium", lang === l ? "bg-ink text-cream" : "text-ink-soft")}>
              {l === "en" ? "English" : "Português"}
              {l === "pt" && !f.name.pt && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-coral align-middle" aria-label="missing translation" />}
            </button>
          ))}
        </div>
        {f.id && (
          <div className="flex gap-2">
            <a href={`/en/products/${f.slug}`} target="_blank" className="btn-outline min-h-10 py-2 text-sm">View in store</a>
            <button
              onClick={() =>
                start(async () => {
                  const r = await duplicateProduct(f.id!);
                  if (r.ok && r.id) router.push(`/admin/products/${r.id}`);
                  else if (!r.ok) setMsg({ kind: "error", text: r.error });
                })
              }
              className="btn-outline min-h-10 py-2 text-sm"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Basics">
            <div className="space-y-4">
              <Field label={`Name (${lang.toUpperCase()})`} id="name">
                <input id="name" value={f.name[lang]} onChange={(e) => setL("name", e.target.value)} className="field" />
              </Field>
              <Field label={`Short description (${lang.toUpperCase()})`} id="short" hint="One line shown under the title and in search.">
                <input id="short" value={f.short[lang]} onChange={(e) => setL("short", e.target.value)} className="field" />
              </Field>
              <Field label={`Description (${lang.toUpperCase()})`} id="desc">
                <textarea id="desc" rows={6} value={f.description[lang]} onChange={(e) => setL("description", e.target.value)} className="field" />
              </Field>
            </div>
          </Card>

          <MediaCard media={f.media} onChange={(m) => set("media", m)} productKey={f.id ?? f.slug ?? "new"} lang={lang} />

          <VariantsCard f={f} setF={(fn) => { setF(fn); setDirty(true); }} lang={lang} />

          <Card title="Details">
            <div className="space-y-4">
              {(["dimensions", "materials", "care"] as const).map((k) => (
                <Field key={k} id={k} label={`${k === "care" ? "Care & hanging" : k[0].toUpperCase() + k.slice(1)} (${lang.toUpperCase()})`}>
                  <textarea
                    id={k}
                    rows={k === "care" ? 3 : 2}
                    value={f.details[k][lang]}
                    onChange={(e) => set("details", { ...f.details, [k]: { ...f.details[k], [lang]: e.target.value } })}
                    className="field"
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Search engine listing">
            <div className="space-y-4">
              <Field id="seo-title" label={`SEO title (${lang.toUpperCase()})`} hint={`${(f.seo.title[lang] || f.name[lang]).length}/60`}>
                <input id="seo-title" value={f.seo.title[lang]} placeholder={f.name[lang]} onChange={(e) => set("seo", { ...f.seo, title: { ...f.seo.title, [lang]: e.target.value } })} className="field" />
              </Field>
              <Field id="seo-desc" label={`Meta description (${lang.toUpperCase()})`} hint={`${(f.seo.description[lang] || f.short[lang]).length}/155`}>
                <textarea id="seo-desc" rows={2} value={f.seo.description[lang]} placeholder={f.short[lang]} onChange={(e) => set("seo", { ...f.seo, description: { ...f.seo.description, [lang]: e.target.value } })} className="field" />
              </Field>
              <Field id="slug" label="URL" hint="Changing it breaks links people have shared.">
                <div className="flex items-center rounded-xl border border-line bg-paper focus-within:border-azulejo">
                  <span className="pl-4 text-sm text-ink-soft">/{lang}/products/</span>
                  <input id="slug" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="min-w-0 flex-1 bg-transparent py-3 pr-4 outline-none" />
                </div>
              </Field>
              <div className="rounded-xl bg-cream p-4" aria-label="Google preview">
                <p className="text-xs text-ink-soft">terracollective.pt › {lang} › products › {f.slug}</p>
                <p className="mt-0.5 text-lg text-[#1a0dab]">{(f.seo.title[lang] || f.name[lang] || "Product name").slice(0, 60)} · Terra Collective</p>
                <p className="text-sm text-ink-soft">{(f.seo.description[lang] || f.short[lang] || "Description").slice(0, 155)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Status">
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1.5">
              {(["draft", "active", "archived"] as const).map((s) => (
                <button key={s} role="radio" aria-checked={f.status === s} onClick={() => set("status", s)} className="chip min-h-10 px-2 text-sm capitalize">{s}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">{f.status === "active" ? "Visible in the store." : f.status === "draft" ? "Hidden while you work on it." : "Hidden and kept for order history."}</p>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hidden} onChange={(e) => set("hidden", e.target.checked)} className="h-4 w-4 accent-azulejo" /> Hide from collections and search (direct link only)</label>
          </Card>

          <Card title="Organisation">
            <div className="space-y-4">
              <Field id="collection" label="Collection">
                <select id="collection" value={f.collectionId ?? ""} onChange={(e) => set("collectionId", e.target.value || null)} className="field">
                  <option value="">None</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field id="tags" label="Tags" hint="Comma separated, e.g. sardine, gift, under-25">
                <input id="tags" defaultValue={f.tags.join(", ")} onBlur={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} className="field" />
              </Field>
              <fieldset>
                <legend className="label">Colours (for filters)</legend>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(swatches).map((c) => (
                    <button key={c} type="button" aria-pressed={f.colors.includes(c)} onClick={() => set("colors", f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c])} className="chip min-h-9 gap-1.5 pl-1.5 text-xs capitalize">
                      <span className="h-4 w-4 rounded-full ring-1 ring-ink/10" style={{ background: swatches[c as keyof typeof swatches] }} /> {c}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field id="pairs" label="Pairs well with">
                <select id="pairs" multiple value={f.pairsWith} onChange={(e) => set("pairsWith", [...e.target.selectedOptions].map((o) => o.value).slice(0, 4))} className="field h-32 text-sm">
                  {allProducts.filter((p) => p.slug !== f.slug).map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>
              </Field>
              <Field id="rank" label="Bestseller rank" hint="1 shows first; 0 = not ranked.">
                <input id="rank" type="number" min={0} value={f.bestsellerRank} onChange={(e) => set("bestsellerRank", Math.max(0, Number(e.target.value) || 0))} className="field w-28" />
              </Field>
            </div>
          </Card>

          <Card title="Shipping & care">
            <Field id="ship" label="Shipping profile" hint="Sets the rate for each zone (Portugal, EU, UK, US, rest of world).">
              <select id="ship" value={f.shipping} onChange={(e) => set("shipping", e.target.value as ProductForm["shipping"])} className="field">
                <option value="small">Small & light (cards, ornaments)</option>
                <option value="standard">Standard ceramics</option>
                <option value="statement">Large / statement (heavy, double-boxed)</option>
                <option value="textile">Bags & textiles</option>
                <option value="digital">Digital (no shipping)</option>
              </select>
            </Field>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.foodSafe} onChange={(e) => set("foodSafe", e.target.checked)} className="h-4 w-4 accent-azulejo" /> Food-safe & dishwasher safe</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.wallPiece} onChange={(e) => set("wallPiece", e.target.checked)} className="h-4 w-4 accent-azulejo" /> Wall piece (shows hanging instructions)</label>
            </div>
          </Card>

          {f.id && isOwner && (
            <Card title="Danger zone">
              <button
                onClick={() =>
                  confirm("Delete this product permanently? Products with orders can only be archived.") &&
                  start(async () => {
                    const r = await deleteProduct(f.id!);
                    if (r.ok) router.push("/admin/products");
                    else setMsg({ kind: "error", text: r.error });
                  })
                }
                className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"
              >
                <Trash2 className="h-4 w-4" /> Delete product
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <p role={msg?.kind === "error" ? "alert" : "status"} className={clsx("min-w-0 truncate text-sm", msg?.kind === "error" ? "text-coral-ink" : "text-ink-soft")}>
            {msg?.text ?? (dirty ? "Unsaved changes" : f.id ? "All changes saved" : "New product")}
          </p>
          <div className="flex shrink-0 gap-2">
            <Link href="/admin/products" className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">Back</Link>
            <button onClick={save} disabled={pending} className="btn-primary min-h-10 py-2 text-sm">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Media */

function MediaCard({ media, onChange, productKey, lang }: { media: MediaItem[]; onChange: (m: MediaItem[]) => void; productKey: string; lang: Lang }) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    setError(null);
    const list = [...files].filter((f) => /^(image|video)\//.test(f.type));
    const tooBig = list.find((f) => f.size > (f.type.startsWith("video") ? 50 : 10) * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is too large (max 10 MB for photos, 50 MB for video).`);
    setUploading(list.length);
    const sb = supabaseBrowser();
    const added: MediaItem[] = [];
    for (const file of list) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `products/${slugify(productKey) || "new"}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: e } = await sb.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (e) {
        setError(`Upload failed: ${e.message}`);
        continue;
      }
      added.push({ url: sb.storage.from("media").getPublicUrl(path).data.publicUrl, kind: file.type.startsWith("video") ? "video" : "image", alt: { en: "", pt: "" } });
      setUploading((n) => n - 1);
    }
    setUploading(0);
    if (added.length) onChange([...media, ...added]);
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= media.length) return;
    const next = [...media];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <Card title="Photos & video" action={<span className="text-xs text-ink-soft">First photo is the main image · drag to reorder</span>}>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {media.map((m, i) => (
          <li
            key={m.url}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag != null) move(drag, i); setDrag(null); }}
            className={clsx("group relative overflow-hidden rounded-xl border bg-cream-deep", i === 0 ? "col-span-2 row-span-2 border-azulejo" : "border-line", drag === i && "opacity-50")}
          >
            <div className="relative aspect-[4/5]">
              {m.kind === "video" ? (
                <video src={m.url} muted className="h-full w-full object-cover" />
              ) : (
                <Image src={m.url} alt={m.alt[lang]} fill sizes="200px" className="object-cover" />
              )}
            </div>
            <span className="absolute top-1.5 left-1.5 grid h-7 w-7 cursor-grab place-items-center rounded-full bg-paper/90 text-ink-soft" aria-hidden><GripVertical className="h-4 w-4" /></span>
            {m.kind === "video" && <span className="absolute bottom-10 left-1.5 rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold text-white">VIDEO</span>}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button type="button" onClick={() => move(i, i - 1)} aria-label="Move earlier" className="grid h-7 w-7 place-items-center rounded-full bg-paper/90"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
              <button type="button" onClick={() => move(i, i + 1)} aria-label="Move later" className="grid h-7 w-7 place-items-center rounded-full bg-paper/90"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
              <button type="button" onClick={() => onChange(media.filter((_, j) => j !== i))} aria-label="Remove" className="grid h-7 w-7 place-items-center rounded-full bg-paper/90 text-coral-ink"><X className="h-3.5 w-3.5" /></button>
            </div>
            <label className="block border-t border-line bg-paper">
              <span className="sr-only">Alt text {i + 1}</span>
              <input value={m.alt[lang]} onChange={(e) => onChange(media.map((x, j) => (j === i ? { ...x, alt: { ...x.alt, [lang]: e.target.value } } : x)))} placeholder="Alt text" className="w-full bg-transparent px-2 py-1.5 text-xs outline-none" />
            </label>
          </li>
        ))}
        <li className={clsx(media.length === 0 && "col-span-3 sm:col-span-4")}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
            className={clsx("flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm text-ink-soft transition", over ? "border-azulejo bg-azulejo-tint" : "border-line hover:border-ink/30")}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            {uploading ? `Uploading ${uploading}…` : "Add photos or video"}
            <span className="text-xs">or drop files here</span>
          </button>
          <input ref={input} type="file" accept="image/*,video/mp4,video/webm" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        </li>
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-coral-ink">{error}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ Variants */

function VariantsCard({ f, setF, lang }: { f: ProductForm; setF: (fn: (p: ProductForm) => ProductForm) => void; lang: Lang }) {
  const [bulkPrice, setBulkPrice] = useState("");
  const used = new Set(f.options.map((o) => o.name));
  const imageCount = f.media.filter((m) => m.kind === "image").length;

  // Regenerate variant rows from options, keeping existing data for combinations that still exist.
  const sync = (options: ProductOption[]) =>
    setF((p) => {
      const byKey = new Map(p.variants.map((v) => [variantKey(v.options), v]));
      const base = p.variants[0];
      const skuBase = (p.variants[0]?.sku.split("-").slice(0, 2).join("-") || `TC-${p.slug.slice(0, 6).toUpperCase()}`).replace(/-$/, "");
      const variants: VariantRow[] = combinations(options).map((o) => {
        const existing = byKey.get(variantKey(o));
        if (existing) return existing;
        return {
          options: o,
          sku: [skuBase, ...Object.values(o).map((v) => v.slice(0, 3).toUpperCase())].join("-"),
          price: base?.price ?? 0,
          compareAt: base?.compareAt ?? null,
          cost: base?.cost ?? null,
          stock: 0,
          imageIndex: null,
        };
      });
      return { ...p, options, variants };
    });

  const updateOption = (i: number, fn: (o: ProductOption) => ProductOption) => sync(f.options.map((o, j) => (j === i ? fn(o) : o)));
  const setVariant = (i: number, patch: Partial<VariantRow>) => setF((p) => ({ ...p, variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const label = (v: VariantRow) =>
    f.options.map((o) => o.values.find((x) => x.value === v.options[o.name])?.label[lang] || v.options[o.name]).join(" · ") || "Default";
  const totalStock = useMemo(() => f.variants.reduce((n, v) => n + v.stock, 0), [f.variants]);

  return (
    <Card title="Options, prices & stock" action={<span className="text-xs text-ink-soft">{f.variants.length} variant{f.variants.length === 1 ? "" : "s"} · {totalStock} in stock</span>}>
      <div className="space-y-4">
        {f.options.map((o, i) => (
          <div key={o.name} className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-medium">{o.label[lang] || o.name}</p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`opt-label-${o.name}`}>Option label</label>
                <input id={`opt-label-${o.name}`} value={o.label[lang]} onChange={(e) => updateOption(i, (x) => ({ ...x, label: { ...x.label, [lang]: e.target.value } }))} className="field w-32 py-1.5 text-sm" />
                <button type="button" onClick={() => sync(f.options.filter((_, j) => j !== i))} aria-label={`Remove ${o.name} option`} className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <ul className="flex flex-wrap gap-2">
              {o.values.map((v, k) => (
                <li key={v.value} className="flex items-center gap-1 rounded-full border border-line bg-cream py-1 pr-1 pl-3 text-sm">
                  {o.name === "color" && (
                    <select aria-label="Swatch" value={Object.entries(swatches).find(([, c]) => c === v.swatch)?.[0] ?? ""} onChange={(e) => updateOption(i, (x) => ({ ...x, values: x.values.map((y, m) => (m === k ? { ...y, swatch: swatches[e.target.value as keyof typeof swatches] } : y)) }))} className="mr-1 w-5 cursor-pointer appearance-none rounded-full text-transparent" style={{ background: v.swatch ?? "#ddd", height: 20 }}>
                      <option value="">none</option>
                      {Object.keys(swatches).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <input
                    aria-label={`Value label (${lang})`}
                    value={v.label[lang]}
                    onChange={(e) => updateOption(i, (x) => ({ ...x, values: x.values.map((y, m) => (m === k ? { ...y, label: { ...y.label, [lang]: e.target.value } } : y)) }))}
                    className="w-24 bg-transparent outline-none"
                  />
                  <button type="button" onClick={() => updateOption(i, (x) => ({ ...x, values: x.values.filter((_, m) => m !== k) }))} aria-label={`Remove ${v.label.en}`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-ink/10"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
              <li>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem("v") as HTMLInputElement;
                    const text = input.value.trim();
                    if (!text) return;
                    const value = slugify(text) || text;
                    if (o.values.some((x) => x.value === value)) return;
                    updateOption(i, (x) => ({ ...x, values: [...x.values, { value, label: { en: text, pt: text }, ...(o.name === "color" ? { swatch: swatches[value as keyof typeof swatches] } : {}) }] }));
                    input.value = "";
                  }}
                  className="flex"
                >
                  <input name="v" placeholder="Add value + Enter" aria-label={`Add ${o.name} value`} className="field w-40 rounded-full py-1.5 text-sm" />
                </form>
              </li>
            </ul>
          </div>
        ))}

        {used.size < optionTypes.length && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">Add option:</span>
            {optionTypes.filter((t) => !used.has(t.name)).map((t) => (
              <button key={t.name} type="button" onClick={() => sync([...f.options, { name: t.name, label: t.label, values: [] }])} className="chip min-h-9 text-sm">
                <Plus className="h-3.5 w-3.5" /> {t.label.en}
              </button>
            ))}
          </div>
        )}

        {f.variants.length > 1 && (
          <form
            className="flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const c = toCents(bulkPrice);
              if (c > 0) setF((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, price: c })) }));
            }}
          >
            <label htmlFor="bulk-price" className="text-ink-soft">Set all prices to €</label>
            <input id="bulk-price" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} inputMode="decimal" className="field w-24 py-1.5 text-sm" />
            <button className="btn-outline min-h-9 px-3 py-1 text-sm">Apply</button>
          </form>
        )}

        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="px-2 pb-2 font-medium">Variant</th>
                <th className="px-2 pb-2 font-medium">SKU</th>
                <th className="px-2 pb-2 font-medium">Price €</th>
                <th className="px-2 pb-2 font-medium">Was €</th>
                <th className="px-2 pb-2 font-medium" title="What one unit costs you, for profit reports">Cost €</th>
                <th className="px-2 pb-2 font-medium">Stock</th>
                <th className="px-2 pb-2 font-medium">Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {f.variants.map((v, i) => (
                <tr key={variantKey(v.options)}>
                  <td className="px-2 py-2 font-medium">{label(v)}</td>
                  <td className="px-2 py-2"><input aria-label={`SKU for ${label(v)}`} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className="field py-1.5 text-sm" /></td>
                  <td className="px-2 py-2"><MoneyInput label={`Price for ${label(v)}`} cents={v.price} onChange={(c) => setVariant(i, { price: c ?? 0 })} /></td>
                  <td className="px-2 py-2"><MoneyInput label={`Compare-at price for ${label(v)}`} cents={v.compareAt} onChange={(c) => setVariant(i, { compareAt: c })} /></td>
                  <td className="px-2 py-2"><MoneyInput label={`Cost of ${label(v)}`} cents={v.cost ?? null} onChange={(c) => setVariant(i, { cost: c })} /></td>
                  <td className="px-2 py-2">
                    <input aria-label={`Stock for ${label(v)}`} type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={clsx("field w-20 py-1.5 text-sm tabular-nums", v.stock === 0 && "border-coral/60")} />
                  </td>
                  <td className="px-2 py-2">
                    <select aria-label={`Photo for ${label(v)}`} value={v.imageIndex ?? ""} onChange={(e) => setVariant(i, { imageIndex: e.target.value === "" ? null : Number(e.target.value) })} className="field w-20 py-1.5 text-sm">
                      <option value="">—</option>
                      {Array.from({ length: imageCount }, (_, n) => <option key={n} value={n}>#{n + 1}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function MoneyInput({ cents, onChange, label }: { cents: number | null; onChange: (c: number | null) => void; label: string }) {
  const [text, setText] = useState(toEuros(cents));
  const [last, setLast] = useState(cents);
  if (cents !== last) {
    setLast(cents);
    setText(toEuros(cents));
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const c = text.trim() === "" ? null : toCents(text);
        setLast(c);
        onChange(c);
        setText(toEuros(c));
      }}
      className="field w-24 py-1.5 text-sm tabular-nums"
    />
  );
}
