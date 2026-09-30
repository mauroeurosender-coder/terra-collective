"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, Eye, FlaskConical, Pencil, Square, Trash2, Trophy } from "lucide-react";
import type { HomeDesigns } from "@/lib/home-layout";
import type { AbResults, VariantStats } from "@/lib/admin/ab-results";
import { saveSetting } from "@/app/admin/(app)/content/actions";
import { HomeBuilder } from "./home-builder";
import { useSave } from "./fields";
import { Card, eur } from "./ui";

type Product = { slug: string; name: string };

export function HomeDesignsManager({ initial, products, results }: { initial: HomeDesigns; products: Product[]; results: AbResults | null }) {
  const router = useRouter();
  const [d, setD] = useState<HomeDesigns>(initial);
  const [editing, setEditing] = useState(initial.live);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [ab, setAb] = useState({ a: initial.live, b: initial.designs.find((x) => x.id !== initial.live)?.id ?? initial.live, split: 50 });
  const save = useSave();

  const persist = async (next: HomeDesigns, message?: string) => {
    setD(next);
    const r = await saveSetting("home_designs", next);
    return r.ok && message ? { ...r, message } : r;
  };
  const run = (next: HomeDesigns, message: string) => save.run(() => persist(next, message), () => router.refresh());
  const name = (id: string) => d.designs.find((x) => x.id === id)?.name ?? id;
  const inTest = (id: string) => !!d.test && (d.test.a === id || d.test.b === id);
  const current = d.designs.find((x) => x.id === editing) ?? d.designs[0];

  return (
    <div className="space-y-4">
      <Card title="Homepage designs">
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.designs.map((x) => {
            const live = d.live === x.id && !d.test;
            return (
              <li key={x.id} className={clsx("rounded-2xl border p-4", editing === x.id ? "border-azulejo ring-2 ring-azulejo/20" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  {renaming === x.id ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = String(new FormData(e.currentTarget).get("n") ?? "").trim();
                        if (v) run({ ...d, designs: d.designs.map((y) => (y.id === x.id ? { ...y, name: v } : y)) }, "Renamed.");
                        setRenaming(null);
                      }}
                    >
                      <input name="n" defaultValue={x.name} autoFocus aria-label="Design name" className="field py-1.5 text-sm" />
                      <button className="btn-outline min-h-9 px-3 py-1 text-sm">OK</button>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setRenaming(x.id)} className="group flex items-center gap-1.5 text-left font-semibold" title="Rename">
                      {x.name} <Pencil className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
                    </button>
                  )}
                  <span className="flex shrink-0 gap-1">
                    {live && <span className="inline-flex items-center gap-1 rounded-full bg-olive-tint px-2 py-0.5 text-xs font-semibold text-olive"><Check className="h-3 w-3" /> Live</span>}
                    {inTest(x.id) && <span className="rounded-full bg-mustard-tint px-2 py-0.5 text-xs font-semibold">Testing {d.test?.a === x.id ? "A" : "B"}</span>}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{x.sections.filter((s) => s.enabled).length} sections</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setEditing(x.id)} className={clsx("min-h-8 py-1 text-xs", editing === x.id ? "btn-primary" : "btn-outline")}>{editing === x.id ? "Editing" : "Edit"}</button>
                  <a href={`/en?preview-home=${x.id}`} target="_blank" rel="noopener" className="btn-outline min-h-8 py-1 text-xs"><Eye className="h-3.5 w-3.5" /> Preview</a>
                  {!live && !d.test && <button type="button" onClick={() => run({ ...d, live: x.id }, `${x.name} is now live.`)} className="btn-outline min-h-8 py-1 text-xs">Make live</button>}
                  <button
                    type="button"
                    onClick={() => {
                      const id = `design-${Math.random().toString(36).slice(2, 8)}`;
                      run({ ...d, designs: [...d.designs, { id, name: `${x.name} (copy)`, sections: structuredClone(x.sections) }] }, "Copy created.");
                      setEditing(id);
                    }}
                    className="btn min-h-8 px-2 py-1 text-xs hover:bg-ink/5"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {d.live !== x.id && !inTest(x.id) && d.designs.length > 1 && (
                    <button type="button" onClick={() => confirm(`Delete the “${x.name}” design?`) && (run({ ...d, designs: d.designs.filter((y) => y.id !== x.id) }, "Deleted."), setEditing(d.live))} aria-label={`Delete ${x.name}`} className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3"><save.Status /></div>
      </Card>

      <Card title="A/B test">
        {d.test ? (
          <RunningTest d={d} results={results} name={name} onStop={(winner) => {
            const stopped = { ...d.test!, stoppedAt: new Date().toISOString() };
            run({ ...d, test: null, live: winner ?? d.live, pastTests: [...(d.pastTests ?? []), stopped].slice(-10) }, winner ? `Test stopped. ${name(winner)} is now live for everyone.` : "Test stopped.");
          }} />
        ) : (
          <div>
            <p className="text-sm text-ink-soft">Show two designs to different visitors and compare which one sells more. Each visitor always sees the same design. Only visitors who accept analytics cookies take part; everyone else sees the live design.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <div>
                <label htmlFor="ab-a" className="label">Design A</label>
                <select id="ab-a" value={ab.a} onChange={(e) => setAb({ ...ab, a: e.target.value })} className="field">{d.designs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </div>
              <div>
                <label htmlFor="ab-b" className="label">Design B</label>
                <select id="ab-b" value={ab.b} onChange={(e) => setAb({ ...ab, b: e.target.value })} className="field">{d.designs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </div>
              <div>
                <label htmlFor="ab-split" className="label">Share seeing A</label>
                <select id="ab-split" value={ab.split} onChange={(e) => setAb({ ...ab, split: Number(e.target.value) })} className="field w-auto">{[50, 60, 70, 80, 90].map((n) => <option key={n} value={n}>{n}% / {100 - n}%</option>)}</select>
              </div>
              <button
                type="button"
                disabled={ab.a === ab.b || save.pending}
                onClick={() => run({ ...d, test: { id: `t${Date.now().toString(36)}`, a: ab.a, b: ab.b, split: ab.split, startedAt: new Date().toISOString() } }, "A/B test started.")}
                className="btn-primary min-h-12"
              >
                <FlaskConical className="h-4 w-4" /> Start test
              </button>
            </div>
            {ab.a === ab.b && <p className="mt-2 text-xs text-coral-ink">Pick two different designs.</p>}
            <p className="mt-4 text-xs text-ink-soft">Tip: run a test for at least 2–4 weeks and include a weekend. Don’t change the two designs while it runs, or the results get mixed up.</p>
          </div>
        )}
        {!!d.pastTests?.length && (
          <details className="mt-5 border-t border-line pt-4 text-sm">
            <summary className="cursor-pointer text-ink-soft">Past tests ({d.pastTests.length})</summary>
            <ul className="mt-2 space-y-1">
              {[...d.pastTests].reverse().map((t) => (
                <li key={t.id}>{name(t.a)} vs {name(t.b)} · {new Date(t.startedAt).toLocaleDateString("en-GB")} → {t.stoppedAt ? new Date(t.stoppedAt).toLocaleDateString("en-GB") : "—"}</li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <HomeBuilder
        key={current.id}
        title={`Sections of “${current.name}”${d.live === current.id && !d.test ? " (live)" : ""}`}
        initial={current.sections}
        products={products}
        onSave={(sections) => persist({ ...d, designs: d.designs.map((x) => (x.id === current.id ? { ...x, sections } : x)) }, "Design saved.")}
      />
    </div>
  );
}

function RunningTest({ d, results, name, onStop }: { d: HomeDesigns; results: AbResults | null; name: (id: string) => string; onStop: (winner: string | null) => void }) {
  const t = d.test!;
  const [now] = useState(() => Date.now());
  const days = Math.max(1, Math.round((now - new Date(t.startedAt).getTime()) / 86_400_000));
  const rate = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1)}%` : "—");
  const row = (label: string, pick: (s: VariantStats) => string) => (
    <tr>
      <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-soft">{label}</th>
      <td className="py-2 text-right tabular-nums">{results ? pick(results.a) : "—"}</td>
      <td className="py-2 text-right tabular-nums">{results ? pick(results.b) : "—"}</td>
    </tr>
  );
  const verdict = !results
    ? "Collecting data…"
    : results.verdict === "too-early"
      ? `Too early to tell. Aim for at least ${Math.max(results.neededPerVariant, 100).toLocaleString("en-IE")} visitors per design; results so far can swing either way.`
      : results.verdict === "winner"
        ? `${name(results.leader === "a" ? t.a : t.b)} converts ${(results.lift * 100).toFixed(0)}% better, and we’re ${(results.confidence * 100).toFixed(0)}% confident it’s a real difference.`
        : results.verdict === "leaning"
          ? `${name(results.leader === "a" ? t.a : t.b)} is ahead by ${(results.lift * 100).toFixed(0)}%, but it isn’t certain yet (${(results.confidence * 100).toFixed(0)}% confidence). Keep it running.`
          : "No meaningful difference so far. Both designs sell about the same.";
  const winnerId = results?.verdict === "winner" && results.leader ? (results.leader === "a" ? t.a : t.b) : null;

  return (
    <div>
      <p className="text-sm">
        Running for <b>{days} day{days === 1 ? "" : "s"}</b>: <b>A · {name(t.a)}</b> ({t.split}%) vs <b>B · {name(t.b)}</b> ({100 - t.split}%)
      </p>
      <div className="-mx-2 mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-xs text-ink-soft">
            <tr><th className="pb-2 text-left font-medium" /><th className="pb-2 text-right font-medium">A · {name(t.a)}</th><th className="pb-2 text-right font-medium">B · {name(t.b)}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {row("Visitors", (s) => s.visitors.toLocaleString("en-IE"))}
            {row("Added to cart", (s) => `${s.carts} · ${rate(s.carts, s.visitors)}`)}
            {row("Started checkout", (s) => `${s.checkouts} · ${rate(s.checkouts, s.visitors)}`)}
            {row("Orders", (s) => `${s.orders}`)}
            <tr className="font-semibold">
              <th scope="row" className="py-2 pr-4 text-left">Conversion</th>
              <td className="py-2 text-right tabular-nums">{results ? rate(results.a.orders, results.a.visitors) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{results ? rate(results.b.orders, results.b.visitors) : "—"}</td>
            </tr>
            {row("Revenue", (s) => eur(s.revenue))}
            {row("Revenue per visitor", (s) => (s.visitors ? eur(Math.round(s.revenue / s.visitors), 2) : "—"))}
          </tbody>
        </table>
      </div>
      <p className={clsx("mt-4 flex items-start gap-2 rounded-xl px-3 py-2 text-sm", winnerId ? "bg-olive-tint" : "bg-cream")}>
        {winnerId && <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-olive" />} {verdict}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {winnerId && <button type="button" onClick={() => onStop(winnerId)} className="btn-primary min-h-10 py-2 text-sm"><Trophy className="h-4 w-4" /> Make {name(winnerId)} live & stop</button>}
        <button type="button" onClick={() => confirm("Stop the test? Everyone will see the live design again.") && onStop(null)} className="btn-outline min-h-10 py-2 text-sm"><Square className="h-4 w-4" /> Stop test</button>
      </div>
    </div>
  );
}
