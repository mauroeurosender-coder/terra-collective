"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Printer } from "lucide-react";
import type { PackOrder } from "@/lib/admin/pack-list";
import { Card, eur } from "./ui";

const flag = (c: string) => c.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const short = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
/** Calendar day in Lisbon, "YYYY-MM-DD". */
const lisbonDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(iso));

const RANGES: [number, string][] = [[7, "7 days"], [30, "30 days"], [90, "3 months"], [180, "6 months"], [365, "1 year"]];

/** "Today · 25 Nov", "Yesterday · 24 Nov", "Monday · 23 Nov", "Friday · 14 Mar 2026"… */
function dayTitle(day: string, today: string, yesterday: string) {
  const d = new Date(`${day}T12:00:00Z`);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
  if (day === today) return { label: "Today", date };
  if (day === yesterday) return { label: "Yesterday", date };
  return { label: d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }), date };
}

/** Choose orders to fulfil and/or shipped ones (grouped by the day they were shipped), then print one pack list. */
export function PackListPicker({ open, shipped, days, initialTab, today }: { open: PackOrder[]; shipped: PackOrder[]; days: number; initialTab: "open" | "shipped"; /** Lisbon date "YYYY-MM-DD", from the server. */ today: string }) {
  const [tab, setTab] = useState(initialTab);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(initialTab === "open" ? open.map((o) => o.id) : []));
  const toggle = (id: string) => setChosen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setMany = (ids: string[], on: boolean) => setChosen((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  const all = [...open, ...shipped];
  const picked = all.filter((o) => chosen.has(o.id));
  const pieces = picked.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);

  const byDay = useMemo(() => {
    const map = new Map<string, PackOrder[]>();
    for (const o of shipped) {
      const d = o.markedAt ? lisbonDay(o.markedAt) : "—";
      map.set(d, [...(map.get(d) ?? []), o]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shipped]);
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const shippedToday = byDay.find(([d]) => d === today)?.[1].length ?? 0;

  const selectButton = (list: PackOrder[], label = "") => {
    const every = list.length > 0 && list.every((o) => chosen.has(o.id));
    return (
      <button type="button" onClick={() => setMany(list.map((o) => o.id), !every)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-azulejo hover:bg-cream">
        {every ? "Unselect" : "Select"} {label || "all"}
      </button>
    );
  };

  const rows = (list: PackOrder[]) => (
    <ul className="divide-y divide-line">
      {list.map((o) => (
        <li key={o.id}>
          <label className={clsx("flex cursor-pointer items-start gap-3 py-2.5 text-sm", !chosen.has(o.id) && "opacity-60")}>
            <input type="checkbox" checked={chosen.has(o.id)} onChange={() => toggle(o.id)} className="mt-0.5 h-4 w-4 accent-azulejo" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{flag(o.country)} {o.name || "—"}</span>
              <span className="ml-2 text-xs text-ink-soft">{o.number} · ordered {short(o.createdAt)}{o.shippedAt && o.markedAt && lisbonDay(o.shippedAt) !== lisbonDay(o.markedAt) ? ` · ship date ${short(o.shippedAt)}` : ""}{o.status === "delivered" ? " · delivered" : ""}</span>
              <span className="block truncate text-ink-soft">{o.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</span>
            </span>
            <span className="shrink-0 tabular-nums">{eur(o.paid, 2)}</span>
          </label>
        </li>
      ))}
    </ul>
  );

  const tabButton = (key: "open" | "shipped", label: string, count: number, badge?: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => {
        setTab(key);
        history.replaceState(null, "", `?days=${days}${key === "shipped" ? "&tab=shipped" : ""}`);
      }}
      className={clsx("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium", tab === key ? "bg-paper shadow-sm" : "text-ink-soft hover:text-ink")}
    >
      {label} <span className="rounded-full bg-ink/10 px-2 text-xs tabular-nums">{count}</span>
      {badge && <span className="rounded-full bg-azulejo px-2 text-xs text-cream">{badge}</span>}
    </button>
  );

  return (
    <div className="space-y-4 pb-24">
      <div role="tablist" aria-label="Orders to choose from" className="inline-flex rounded-full bg-ink/5 p-1">
        {tabButton("open", "To fulfil", open.length)}
        {tabButton("shipped", "Shipped", shipped.length, shippedToday ? `${shippedToday} today` : undefined)}
      </div>

      {tab === "open" ? (
        <Card title={`To fulfil (${open.length})`} action={open.length > 0 && selectButton(open)}>
          {open.length ? rows(open) : <p className="text-sm text-ink-soft">Nothing waiting to be shipped.</p>}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-soft">Marked shipped in the last</span>
            {RANGES.map(([d, label]) => (
              <a key={d} href={`?days=${d}&tab=shipped`} className={clsx("rounded-full px-3 py-1 text-xs", d === days ? "bg-ink text-cream" : "border border-line text-ink-soft hover:bg-cream")}>
                {label}
              </a>
            ))}
          </div>
          {!byDay.length && <Card><p className="text-sm text-ink-soft">No orders shipped in this period.</p></Card>}
          {byDay.map(([day, list]) => {
            const t = day === "—" ? { label: "No shipping date", date: "" } : dayTitle(day, today, yesterday);
            const recent = day === today || day === yesterday;
            const picked = list.filter((o) => chosen.has(o.id)).length;
            return (
              <section key={day} className={clsx("rounded-2xl border bg-paper", recent ? "border-azulejo/40" : "border-line")}>
                <header className={clsx("sticky top-0 z-10 flex items-center gap-3 rounded-t-2xl border-b px-4 py-3", recent ? "border-azulejo/30 bg-azulejo/10" : "border-line bg-cream")}>
                  <h2 className="min-w-0 flex-1">
                    <span className={clsx("font-semibold", recent && "text-lg")}>{t.label}</span>
                    {t.date && <span className="ml-2 text-sm text-ink-soft">{t.date}</span>}
                    <span className="ml-2 text-sm text-ink-soft">· {list.length} order{list.length === 1 ? "" : "s"}{picked ? ` · ${picked} selected` : ""}</span>
                  </h2>
                  {selectButton(list, "day")}
                </header>
                <div className="px-4">{rows(list)}</div>
              </section>
            );
          })}
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3">
          <p className="flex-1 text-sm text-ink-soft">
            {picked.length} order{picked.length === 1 ? "" : "s"} · {pieces} piece{pieces === 1 ? "" : "s"} selected
            {picked.length > 0 && (
              <button type="button" onClick={() => setChosen(new Set())} className="ml-3 text-xs font-medium text-azulejo hover:underline">
                Clear
              </button>
            )}
          </p>
          <a
            href={`/admin/orders/pack-list/print?ids=${picked.map((o) => o.id).join(",")}`}
            target="_blank"
            rel="noopener"
            aria-disabled={!picked.length}
            className={clsx("btn-primary min-h-10 py-2 text-sm", !picked.length && "pointer-events-none opacity-50")}
          >
            <Printer className="h-4 w-4" /> Print pack list
          </a>
        </div>
      </div>
    </div>
  );
}
