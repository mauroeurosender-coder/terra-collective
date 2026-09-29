"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { CalendarPlus, Check, Eye, Lightbulb, Pencil, Trash2 } from "lucide-react";
import { resolveTheme, themes, type Theme, type ThemeSettings } from "@/lib/themes";
import type { L } from "@/lib/types";
import { saveSetting } from "@/app/admin/(app)/content/actions";
import { LField, useSave } from "./fields";
import { Card } from "./ui";

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function ThemesEditor({ initial }: { initial: ThemeSettings }) {
  const router = useRouter();
  const [s, setS] = useState<ThemeSettings>({ active: initial.active ?? "default", schedule: initial.schedule ?? [], custom: initial.custom ?? {} });
  const [editing, setEditing] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [range, setRange] = useState({ start: "", end: "" });
  const save = useSave();
  const live = resolveTheme(s);
  const persist = (next: ThemeSettings, msg?: string) => {
    setS(next);
    save.run(async () => {
      const r = await saveSetting("theme", next);
      return r.ok && msg ? { ...r, message: msg } : r;
    }, () => router.refresh());
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...s.schedule].filter((x) => x.end >= today).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-4">
      <Card title="Live now">
        <div className="flex flex-wrap items-center gap-4">
          <Swatch colors={live.swatch} />
          <div className="flex-1">
            <p className="font-semibold">{live.name}</p>
            <p className="text-sm text-ink-soft">
              {s.schedule.some((x) => x.start <= today && today <= x.end && x.id === live.id) ? "Running on its schedule." : live.id === "default" ? "The standard look." : "Switched on manually."}
            </p>
          </div>
          {s.active !== "default" && <button onClick={() => persist({ ...s, active: "default" }, "Back to the everyday theme.")} className="btn-outline min-h-10 py-2 text-sm">Back to Everyday</button>}
        </div>
        {upcoming.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <li className="text-xs font-semibold tracking-wider text-ink-soft uppercase">Schedule</li>
            {upcoming.map((x, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex-1"><b>{themes.find((t) => t.id === x.id)?.name}</b> · {fmtDate(x.start)} → {fmtDate(x.end)}</span>
                <button onClick={() => persist({ ...s, schedule: s.schedule.filter((y) => y !== x) }, "Removed from schedule.")} aria-label="Remove from schedule" className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-ink-soft">A scheduled theme takes over automatically on its dates, then the store returns to the manually chosen one. Colours, banner and homepage text change; products, prices and checkout don’t.</p>
        <div className="mt-3"><save.Status /></div>
      </Card>

      <ul className="grid gap-4 md:grid-cols-2">
        {themes.map((t) => {
          const isLive = live.id === t.id;
          const custom = s.custom[t.id];
          return (
            <li key={t.id} className={clsx("flex flex-col rounded-[var(--radius-card)] border bg-paper p-5", isLive ? "border-azulejo ring-2 ring-azulejo/20" : "border-line/70")}>
              <div className="flex items-start gap-4">
                <Swatch colors={t.swatch} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {t.name}
                    {isLive && <span className="inline-flex items-center gap-1 rounded-full bg-olive-tint px-2 py-0.5 text-xs text-olive"><Check className="h-3 w-3" /> Live</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{t.when}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{t.description}</p>
              {t.id !== "default" && (
                <div className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm">
                  <p className="truncate"><span className="text-ink-soft">Banner:</span> {(custom?.announcement?.en || t.announcement.en)}</p>
                  <p className="truncate"><span className="text-ink-soft">Headline:</span> {(custom?.hero?.title?.en || t.hero.title.en)}</p>
                </div>
              )}
              {t.promoHint && <p className="mt-3 flex gap-2 text-xs text-ink-soft"><Lightbulb className="h-4 w-4 shrink-0 text-mustard" /> {t.promoHint}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {!isLive && <button onClick={() => persist({ ...s, active: t.id }, `${t.name} is now live.`)} className="btn-primary min-h-9 py-1.5 text-sm">Activate now</button>}
                {t.id !== "default" && (
                  <>
                    <a href={`/en?preview-theme=${t.id}`} target="_blank" rel="noopener" className="btn-outline min-h-9 py-1.5 text-sm"><Eye className="h-4 w-4" /> Preview</a>
                    <button onClick={() => { setScheduling(scheduling === t.id ? null : t.id); setRange({ start: "", end: "" }); }} aria-expanded={scheduling === t.id} className="btn-outline min-h-9 py-1.5 text-sm"><CalendarPlus className="h-4 w-4" /> Schedule</button>
                    <button onClick={() => setEditing(editing === t.id ? null : t.id)} aria-expanded={editing === t.id} className="btn min-h-9 px-3 py-1.5 text-sm hover:bg-ink/5"><Pencil className="h-4 w-4" /> Edit texts</button>
                  </>
                )}
              </div>
              {scheduling === t.id && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-cream p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!range.start || !range.end || range.end < range.start) return;
                    persist({ ...s, schedule: [...s.schedule, { id: t.id, ...range }] }, `${t.name} scheduled.`);
                    setScheduling(null);
                  }}
                >
                  <div><label htmlFor={`st-${t.id}`} className="label">From</label><input id={`st-${t.id}`} type="date" required value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="field py-2 text-sm" /></div>
                  <div><label htmlFor={`en-${t.id}`} className="label">Until (inclusive)</label><input id={`en-${t.id}`} type="date" required min={range.start} value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="field py-2 text-sm" /></div>
                  <button className="btn-primary min-h-10 py-2 text-sm">Add</button>
                </form>
              )}
              {editing === t.id && <TextEditor theme={t} custom={custom} onSave={(c) => { persist({ ...s, custom: { ...s.custom, [t.id]: c } }, "Texts saved."); setEditing(null); }} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TextEditor({ theme, custom, onSave }: { theme: Theme; custom: ThemeSettings["custom"][string] | undefined; onSave: (c: ThemeSettings["custom"][string]) => void }) {
  const pickL = (a: L | undefined, b: L) => ({ en: a?.en || b.en, pt: a?.pt || b.pt });
  const [announcement, setAnnouncement] = useState(pickL(custom?.announcement, theme.announcement));
  const [eyebrow, setEyebrow] = useState(pickL(custom?.hero?.eyebrow, theme.hero.eyebrow));
  const [title, setTitle] = useState(pickL(custom?.hero?.title, theme.hero.title));
  const [body, setBody] = useState(pickL(custom?.hero?.body, theme.hero.body));
  const [cta, setCta] = useState(pickL(custom?.hero?.cta, theme.hero.cta));
  const [stamp, setStamp] = useState(pickL(custom?.stamp, theme.stamp));
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <LField label="Announcement bar" value={announcement} onChange={setAnnouncement} />
      <LField label="Small heading" value={eyebrow} onChange={setEyebrow} />
      <LField label="Headline" value={title} onChange={setTitle} hint="Last word in blue" />
      <LField label="Text" value={body} onChange={setBody} multiline rows={3} />
      <LField label="Button" value={cta} onChange={setCta} />
      <LField label="Stamp on the photo" value={stamp} onChange={setStamp} hint="Keep it to 1–3 words" />
      <button onClick={() => onSave({ announcement, stamp, hero: { eyebrow, title, body, cta } })} className="btn-primary min-h-10 py-2 text-sm">Save texts</button>
    </div>
  );
}

function Swatch({ colors }: { colors: string[] }) {
  return (
    <span className="grid h-12 w-12 shrink-0 grid-cols-2 overflow-hidden rounded-xl ring-1 ring-ink/10" aria-hidden>
      {colors.slice(0, 4).map((c) => <span key={c} style={{ background: c }} />)}
    </span>
  );
}
