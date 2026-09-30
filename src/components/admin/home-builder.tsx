"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { L } from "@/lib/types";
import type { Step } from "@/lib/data/home-story";
import { defaultHomeLayout, sectionTypes, towns, type Button, type Field, type HomeSection, type Pin, type SectionType } from "@/lib/home-layout";
import { uploadMedia } from "@/lib/supabase/upload";
import { ImageField, LField, useSave } from "./fields";
import { Card } from "./ui";

const E = (): L => ({ en: "", pt: "" });
const icons: [Step["icon"], string][] = [["clay", "Clay"], ["dry", "Drying rack"], ["kiln", "Kiln"], ["brush", "Brush"], ["glaze", "Glaze"], ["parcel", "Parcel"]];

type Product = { slug: string; name: string };

export function HomeBuilder({ initial, products, title, onSave }: { initial: HomeSection[]; products: Product[]; title: string; onSave: (sections: HomeSection[]) => Promise<{ ok: boolean; error?: string; message?: string }> }) {
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const save = useSave();

  const update = (next: HomeSection[]) => {
    setSections(next);
    setDirty(true);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const patch = (id: string, p: Record<string, unknown>) => update(sections.map((s) => (s.id === id ? ({ ...s, ...p } as HomeSection) : s)));
  const present = new Set(sections.map((s) => s.type));
  const addable = (Object.keys(sectionTypes) as SectionType[]).filter((t) => sectionTypes[t].repeatable || !present.has(t));

  return (
    <Card
      title={title}
      
    >
      <p className="mb-4 text-sm text-ink-soft">Reorder, hide, edit or remove sections, and add new ones. Click <b>Save design</b> to keep your changes. If this design is live (or in an A/B test), visitors see them straight away.</p>
      <ol className="space-y-2">
        {sections.map((s, i) => {
          const meta = sectionTypes[s.type];
          const isOpen = open === s.id;
          return (
            <li key={s.id} className={clsx("rounded-2xl border", s.enabled ? "border-line bg-paper" : "border-dashed border-line bg-cream/60")}>
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${meta.label} up`} className="grid h-6 w-7 place-items-center rounded text-ink-soft hover:bg-ink/5 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Move ${meta.label} down`} className="grid h-6 w-7 place-items-center rounded text-ink-soft hover:bg-ink/5 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={clsx("font-medium", !s.enabled && "text-ink-soft")}>
                    {meta.label}
                    {!s.enabled && <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-normal">Hidden</span>}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{summary(s) || meta.description}</p>
                </div>
                <button type="button" onClick={() => patch(s.id, { enabled: !s.enabled })} aria-label={s.enabled ? `Hide ${meta.label}` : `Show ${meta.label}`} title={s.enabled ? "Hide" : "Show"} className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5">
                  {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                {meta.fields.length > 0 && (
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="btn min-h-9 px-3 py-1 text-sm hover:bg-ink/5"><Pencil className="h-4 w-4" /> Edit</button>
                )}
                {s.type !== "hero" && (
                  <button type="button" onClick={() => confirm(`Remove “${meta.label}” from the homepage?`) && update(sections.filter((x) => x.id !== s.id))} aria-label={`Remove ${meta.label}`} className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              {isOpen && (
                <div className="space-y-4 border-t border-line p-4">
                  {meta.fields.map((f) => (
                    <FieldEditor key={f.key} field={f} value={(s as unknown as Record<string, unknown>)[f.key]} onChange={(v) => patch(s.id, { [f.key]: v })} products={products} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {adding ? (
        <div className="mt-4 rounded-2xl border border-dashed border-azulejo/40 bg-azulejo-tint/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium">Add a section</p>
            <button type="button" onClick={() => setAdding(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><X className="h-4 w-4" /></button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {addable.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => {
                    const s = sectionTypes[t].make();
                    const withId = sectionTypes[t].repeatable ? s : { ...s, id: t };
                    update([...sections, withId]);
                    setAdding(false);
                    setOpen(withId.id);
                  }}
                  className="w-full rounded-xl border border-line bg-paper p-3 text-left hover:border-azulejo"
                >
                  <span className="block font-medium">{sectionTypes[t].label}</span>
                  <span className="text-xs text-ink-soft">{sectionTypes[t].description}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">New sections are added at the bottom. Use the arrows to move them.</p>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-outline mt-4 min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Add section</button>
      )}

      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur md:-mx-6 md:px-6">
        <button type="button" disabled={save.pending || !dirty} onClick={() => save.run(() => onSave(sections), () => { setDirty(false); router.refresh(); })} className="btn-primary min-h-10 py-2 text-sm">
          {save.pending && <Loader2 className="h-4 w-4 animate-spin" />} Save design
        </button>
        <button type="button" onClick={() => confirm("Reset the homepage to the original sections and texts? (Not saved until you click Save.)") && update(defaultHomeLayout())} className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5"><RotateCcw className="h-4 w-4" /> Reset to original</button>
        {dirty ? <span className="text-sm text-ink-soft">Unsaved changes</span> : <save.Status />}
      </div>
    </Card>
  );
}

function summary(s: HomeSection) {
  const r = s as unknown as Record<string, unknown>;
  const title = r.title as L | undefined;
  if (title?.en) return title.en;
  if (s.type === "ribbon") return s.items.map((i) => i.en).join(" · ");
  if (s.type === "quote") return s.text.en;
  return "";
}

function FieldEditor({ field: f, value, onChange, products }: { field: Field; value: unknown; onChange: (v: unknown) => void; products: Product[] }) {
  switch (f.kind) {
    case "l":
      return <LField label={f.label} hint={f.hint} value={(value as L) ?? E()} onChange={onChange} />;
    case "lm":
      return <LField label={f.label} hint={f.hint} value={(value as L) ?? E()} onChange={onChange} multiline rows={3} />;
    case "text":
    case "href":
      return (
        <div>
          <label className="label">{f.label}</label>
          <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="field text-sm" />
        </div>
      );
    case "number":
      return (
        <div>
          <label className="label">{f.label}</label>
          <input type="number" min={1} max={12} value={(value as number) ?? 8} onChange={(e) => onChange(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} className="field w-24 text-sm" />
        </div>
      );
    case "bool":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-azulejo" /> {f.label}
        </label>
      );
    case "select":
      return (
        <div>
          <label className="label">{f.label}</label>
          <select value={value as string} onChange={(e) => onChange(e.target.value)} className="field w-auto text-sm">
            {f.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      );
    case "button": {
      const b = (value as Button) ?? { label: E(), href: "" };
      return (
        <fieldset className="space-y-2 rounded-xl bg-cream p-3">
          <legend className="label">{f.label}</legend>
          <LField label="Button text" value={b.label} onChange={(label) => onChange({ ...b, label })} />
          <div>
            <label className="label">Link</label>
            <input value={b.href} onChange={(e) => onChange({ ...b, href: e.target.value })} placeholder="/shop, /collections/gifts, /products/… or https://…" className="field text-sm" />
            <p className="mt-1 text-xs text-ink-soft">Leave empty to hide the button.</p>
          </div>
        </fieldset>
      );
    }
    case "image":
      return <ImageField label={f.label} value={(value as string) ?? ""} onChange={onChange} folder="content/home" />;
    case "images":
      return <ImagesField label={f.label} value={(value as string[]) ?? []} onChange={onChange} />;
    case "llist": {
      const list = (value as L[]) ?? [];
      return (
        <fieldset>
          <legend className="label">{f.label}</legend>
          <ul className="space-y-2">
            {list.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="flex-1"><LField label={`#${i + 1}`} value={item} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} /></div>
                <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Remove" className="mt-7 grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onChange([...list, E()])} className="btn-outline mt-2 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Add</button>
        </fieldset>
      );
    }
    case "steps": {
      const steps = (value as Step[]) ?? [];
      const set = (i: number, p: Partial<Step>) => onChange(steps.map((x, j) => (j === i ? { ...x, ...p } : x)));
      return (
        <fieldset>
          <legend className="label">{f.label}</legend>
          <ol className="space-y-3">
            {steps.map((st, i) => (
              <li key={i} className="space-y-2 rounded-xl bg-cream p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-azulejo text-xs font-semibold text-white">{String(i + 1).padStart(2, "0")}</span>
                  <div><label className="label">Drawing</label><select value={st.icon} onChange={(e) => set(i, { icon: e.target.value as Step["icon"] })} className="field w-auto py-2 text-sm">{icons.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div className="flex-1"><label className="label">Handwritten word</label><input value={st.word} onChange={(e) => set(i, { word: e.target.value })} className="field py-2 text-sm" /></div>
                  <button type="button" onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label="Remove step" className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                </div>
                <LField label="Step title" value={st.title} onChange={(title) => set(i, { title })} />
                <LField label="Step text" value={st.body} onChange={(body) => set(i, { body })} multiline rows={2} />
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => onChange([...steps, { n: "", word: "", icon: "clay", title: E(), body: E() }])} className="btn-outline mt-2 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Add step</button>
        </fieldset>
      );
    }
    case "pins": {
      const pins = (value as Pin[]) ?? [];
      const set = (i: number, p: Partial<Pin>) => onChange(pins.map((x, j) => (j === i ? { ...x, ...p } : x)));
      return (
        <fieldset>
          <legend className="label">{f.label}</legend>
          <ul className="space-y-3">
            {pins.map((p, i) => (
              <li key={p.id} className="space-y-2 rounded-xl bg-cream p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1">
                    <label className="label">Place</label>
                    <select
                      value={towns.find((t) => t.name === p.name)?.name ?? ""}
                      onChange={(e) => { const t = towns.find((x) => x.name === e.target.value); if (t) set(i, { name: t.name, lon: t.lon, lat: t.lat }); }}
                      className="field py-2 text-sm"
                    >
                      {!towns.some((t) => t.name === p.name) && <option value="">{p.name}</option>}
                      {towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => onChange(pins.filter((_, j) => j !== i))} aria-label="Remove place" className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                </div>
                <LField label="What is made there" value={p.craft} onChange={(craft) => set(i, { craft })} />
                <LField label="Short story" value={p.note} onChange={(note) => set(i, { note })} multiline rows={2} />
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onChange([...pins, { id: Math.random().toString(36).slice(2, 8), ...towns[3], craft: E(), note: E() }])} className="btn-outline mt-2 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Add place</button>
        </fieldset>
      );
    }
    case "products": {
      const slugs = (value as string[]) ?? [];
      return (
        <fieldset>
          <legend className="label">{f.label} <span className="font-normal text-ink-soft">({slugs.length} selected, up to 8)</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button key={p.slug} type="button" aria-pressed={slugs.includes(p.slug)} onClick={() => onChange(slugs.includes(p.slug) ? slugs.filter((x) => x !== p.slug) : [...slugs, p.slug].slice(0, 8))} className="chip min-h-9 text-xs">{p.name}</button>
            ))}
          </div>
        </fieldset>
      );
    }
  }
}

function ImagesField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <ul className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <li key={src + i} className="relative h-28 w-24 overflow-hidden rounded-xl bg-cream-deep">
            <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-paper/90"><X className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        {value.length < 3 && (
          <li>
            <label className="grid h-28 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-xs text-ink-soft hover:border-ink/30">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { onChange([...value, await uploadMedia(file, "content/home")]); } finally { setBusy(false); } }} />
            </label>
          </li>
        )}
      </ul>
    </fieldset>
  );
}
