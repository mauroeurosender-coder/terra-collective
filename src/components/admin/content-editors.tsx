"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { L } from "@/lib/types";
import type { Settings } from "@/lib/settings";
import type { ContentPage, FaqGroup, Section } from "@/lib/data/pages";
import { createCollection, resetPage, saveCollections, savePage, saveSetting, type CollectionEdit } from "@/app/admin/(app)/content/actions";
import { ImageField, LField, SaveRow, useSave } from "./fields";
import { Card } from "./ui";

const emptyL = (): L => ({ en: "", pt: "" });

function move<T>(list: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowTools({ onUp, onDown, onRemove, label }: { onUp: () => void; onDown: () => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" onClick={onUp} aria-label={`Move ${label} up`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowUp className="h-4 w-4" /></button>
      <button type="button" onClick={onDown} aria-label={`Move ${label} down`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowDown className="h-4 w-4" /></button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

export function AnnouncementEditor({ initial }: { initial: L }) {
  const [v, setV] = useState(initial);
  const s = useSave();
  return (
    <Card title="Announcement bar">
      <LField label="Text" value={v} onChange={setV} hint="Keep it short; it sits above the header on every page." />
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("announcement", v))} />
    </Card>
  );
}

export function HeroEditor({ initial }: { initial: Settings["hero"] }) {
  const [h, setH] = useState(initial);
  const s = useSave();
  return (
    <Card title="Homepage hero">
      <div className="space-y-4">
        <LField label="Small heading" value={h.eyebrow} onChange={(eyebrow) => setH({ ...h, eyebrow })} />
        <LField label="Headline" value={h.title} onChange={(title) => setH({ ...h, title })} hint="The last word is highlighted in blue." />
        <LField label="Text" value={h.body} onChange={(body) => setH({ ...h, body })} multiline />
        <LField label="Button" value={h.cta} onChange={(cta) => setH({ ...h, cta })} />
        <ImageField label="Image" value={h.image} onChange={(image) => setH({ ...h, image })} folder="content/hero" />
      </div>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("hero", h))} />
    </Card>
  );
}

export function CollectionsEditor({ initial }: { initial: CollectionEdit[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [newName, setNewName] = useState("");
  const s = useSave();
  const set = (i: number, patch: Partial<CollectionEdit>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <Card title="Collections" action={<span className="text-xs text-ink-soft">Featured collections show on the homepage and in the Shop menu</span>}>
      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={r.featured} onChange={(e) => set(i, { featured: e.target.checked })} className="h-4 w-4 accent-azulejo" /> Featured
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setRows(move(rows, i, -1))} aria-label="Move up" className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => setRows(move(rows, i, 1))} aria-label="Move down" className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowDown className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="space-y-3">
                <LField label="Name" value={r.name} onChange={(name) => set(i, { name })} />
                <LField label="Description" value={r.blurb} onChange={(blurb) => set(i, { blurb })} multiline rows={2} />
              </div>
              <ImageField label="Tile image" value={r.image} onChange={(image) => set(i, { image })} folder="content/collections" aspect="aspect-[4/5]" />
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          s.run(() => createCollection(newName), () => { setNewName(""); router.refresh(); });
        }}
      >
        <label htmlFor="new-col" className="sr-only">New collection name</label>
        <input id="new-col" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection name" className="field max-w-xs py-2 text-sm" />
        <button className="btn-outline min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
      </form>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveCollections(rows.map((r, i) => ({ ...r, position: i }))))} label="Save collections" />
    </Card>
  );
}

export function FaqEditor({ initial }: { initial: FaqGroup[] }) {
  const [groups, setGroups] = useState(initial);
  const s = useSave();
  const setGroup = (i: number, g: FaqGroup) => setGroups(groups.map((x, j) => (j === i ? g : x)));
  return (
    <Card title="FAQ">
      <div className="space-y-6">
        {groups.map((g, i) => (
          <div key={i} className="rounded-2xl border border-line p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1"><LField label="Group title" value={g.title} onChange={(title) => setGroup(i, { ...g, title })} /></div>
              <RowTools label="group" onUp={() => setGroups(move(groups, i, -1))} onDown={() => setGroups(move(groups, i, 1))} onRemove={() => confirm("Remove this group?") && setGroups(groups.filter((_, j) => j !== i))} />
            </div>
            <ul className="mt-4 space-y-4 border-l-2 border-azulejo-tint pl-4">
              {g.items.map((q, k) => (
                <li key={k} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <LField label={`Question ${k + 1}`} value={q.q} onChange={(v) => setGroup(i, { ...g, items: g.items.map((x, m) => (m === k ? { ...x, q: v } : x)) })} />
                    <LField label="Answer" value={q.a} multiline rows={2} onChange={(v) => setGroup(i, { ...g, items: g.items.map((x, m) => (m === k ? { ...x, a: v } : x)) })} />
                  </div>
                  <RowTools label="question" onUp={() => setGroup(i, { ...g, items: move(g.items, k, -1) })} onDown={() => setGroup(i, { ...g, items: move(g.items, k, 1) })} onRemove={() => setGroup(i, { ...g, items: g.items.filter((_, m) => m !== k) })} />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setGroup(i, { ...g, items: [...g.items, { q: emptyL(), a: emptyL() }] })} className="btn-outline mt-3 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Question</button>
          </div>
        ))}
        <button type="button" onClick={() => setGroups([...groups, { title: emptyL(), items: [{ q: emptyL(), a: emptyL() }] }])} className="btn-outline min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Group</button>
      </div>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => savePage("faq", groups))} label="Save FAQ" />
    </Card>
  );
}

export function PageEditor({ slug, initial, customised }: { slug: string; initial: ContentPage; customised: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const s = useSave();
  const setSection = (i: number, sec: Section) => setP({ ...p, sections: p.sections.map((x, j) => (j === i ? sec : x)) });
  // Paragraphs and bullet lists are edited as plain text: one paragraph per blank line, one bullet per line.
  const paras = (sec: Section, l: "en" | "pt") => sec.p.map((x) => x[l]).join("\n\n");
  const setParas = (i: number, sec: Section, l: "en" | "pt", text: string) => {
    const parts = text.split(/\n\s*\n/);
    const n = Math.max(parts.length, sec.p.length);
    const next = Array.from({ length: n }, (_, k) => ({ ...(sec.p[k] ?? emptyL()), [l]: parts[k] ?? "" }));
    setSection(i, { ...sec, p: next.filter((x) => x.en || x.pt) });
  };
  const bullets = (sec: Section, l: "en" | "pt") => (sec.list ?? []).map((x) => x[l]).join("\n");
  const setBullets = (i: number, sec: Section, l: "en" | "pt", text: string) => {
    const parts = text.split("\n");
    const cur = sec.list ?? [];
    const n = Math.max(parts.length, cur.length);
    const next = Array.from({ length: n }, (_, k) => ({ ...(cur[k] ?? emptyL()), [l]: parts[k] ?? "" })).filter((x) => x.en || x.pt);
    setSection(i, { ...sec, list: next.length ? next : undefined });
  };

  return (
    <div className="space-y-4">
      <Card title="Page">
        <div className="space-y-4">
          <LField label="Title" value={p.title} onChange={(title) => setP({ ...p, title })} />
          <LField label="Introduction" value={p.intro} onChange={(intro) => setP({ ...p, intro })} multiline rows={3} />
        </div>
      </Card>
      {p.sections.map((sec, i) => (
        <Card key={i} title={`Section ${i + 1}`} action={<RowTools label="section" onUp={() => setP({ ...p, sections: move(p.sections, i, -1) })} onDown={() => setP({ ...p, sections: move(p.sections, i, 1) })} onRemove={() => confirm("Remove this section?") && setP({ ...p, sections: p.sections.filter((_, j) => j !== i) })} />}>
          <div className="space-y-4">
            <LField label="Heading" value={sec.h ?? emptyL()} onChange={(h) => setSection(i, { ...sec, h })} />
            <fieldset>
              <legend className="label">Paragraphs <span className="font-normal text-ink-soft">(leave a blank line between paragraphs)</span></legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["en", "pt"] as const).map((l) => (
                  <textarea key={l} aria-label={`Paragraphs (${l})`} lang={l} rows={6} value={paras(sec, l)} onChange={(e) => setParas(i, sec, l, e.target.value)} className="field text-sm" />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Bullet list <span className="font-normal text-ink-soft">(one per line, optional)</span></legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["en", "pt"] as const).map((l) => (
                  <textarea key={l} aria-label={`Bullets (${l})`} lang={l} rows={3} value={bullets(sec, l)} onChange={(e) => setBullets(i, sec, l, e.target.value)} className="field text-sm" />
                ))}
              </div>
            </fieldset>
          </div>
        </Card>
      ))}
      <button type="button" onClick={() => setP({ ...p, sections: [...p.sections, { h: emptyL(), p: [emptyL()] }] })} className="btn-outline min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Add section</button>
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-wrap items-center gap-3 py-3">
          <button type="button" onClick={() => s.run(() => savePage(slug, { ...p, updated: new Date().toISOString().slice(0, 10) }), () => router.refresh())} disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm">Save page</button>
          {customised && (
            <button type="button" onClick={() => confirm("Discard your edits and restore the original text?") && s.run(() => resetPage(slug), () => router.refresh())} className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">Restore original</button>
          )}
          <a href={`/en/${["terms", "privacy", "cookies"].includes(slug) ? `legal/${slug}` : slug}`} target="_blank" className="text-sm text-ink-soft underline">View page</a>
          <s.Status />
        </div>
      </div>
    </div>
  );
}
