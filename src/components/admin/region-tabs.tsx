"use client";

import { useState } from "react";
import clsx from "clsx";
import { OSS_THRESHOLD, regionLabel, type Region } from "@/lib/continents";
import { BarList, eur } from "./ui";

type Rows = { key: string; label: string; value: number; sub: string }[];
type Oss = { year: number; current: number; previous: number; orders: number };

export function RegionTabs({ countries, regions, oss }: { countries: Rows; regions: { region: Region; revenue: number; orders: number }[]; oss: Oss | null }) {
  const [tab, setTab] = useState<"country" | "continent">("country");
  const rows = tab === "country" ? countries : regions.map((r) => ({ key: r.region, label: regionLabel[r.region], value: r.revenue, sub: `${r.orders}` }));

  return (
    <div>
      <div role="tablist" aria-label="Group revenue by" className="mb-4 inline-flex rounded-full bg-ink/5 p-1 text-sm">
        {(["country", "continent"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("rounded-full px-3 py-1 font-medium", tab === t ? "bg-paper shadow-sm" : "text-ink-soft hover:text-ink")}>
            {t === "country" ? "Countries" : "Continents"}
          </button>
        ))}
      </div>

      {rows.length ? <BarList rows={rows} format={(v) => eur(v)} /> : <p className="text-sm text-ink-soft">No sales in this period yet.</p>}
      <p className="mt-4 text-xs text-ink-soft">Small numbers are order counts. {tab === "continent" && "Canary Islands, Ceuta and Melilla count as outside the EU (no EU VAT)."}</p>

      {tab === "continent" && oss && <OssMeter oss={oss} />}
    </div>
  );
}

function OssMeter({ oss }: { oss: Oss }) {
  const pct = Math.min(100, (oss.current / OSS_THRESHOLD) * 100);
  const over = oss.current > OSS_THRESHOLD;
  const lastYearOver = oss.previous > OSS_THRESHOLD;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">OSS threshold {oss.year}</span>
        <span className="tabular-nums">
          {eur(oss.current)} <span className="text-ink-soft">of {eur(OSS_THRESHOLD)}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="OSS threshold used">
        <div className={clsx("h-full rounded-full", over ? "bg-coral" : "bg-azulejo")} style={{ width: `${Math.max(1, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {lastYearOver || over
          ? `Threshold passed${lastYearOver ? ` in ${oss.year - 1}` : ""}: charge the buyer's country VAT on EU sales and declare them in the OSS. Talk to your accountant.`
          : `${pct.toFixed(0)}% used · ${eur(OSS_THRESHOLD - oss.current)} left this year.`}{" "}
        EU sales to consumers outside Portugal, without VAT, all channels ({oss.orders} orders). {oss.year - 1}: {eur(oss.previous)}.
      </p>
    </div>
  );
}
