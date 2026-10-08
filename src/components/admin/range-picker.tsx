"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { CalendarDays } from "lucide-react";

const options = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function RangePicker({ current, from, to }: { current: string; from: string; to: string }) {
  const sp = useSearchParams();
  const [custom, setCustom] = useState(current === "custom");
  const keep = Object.fromEntries(["view", "section"].map((k) => [k, sp.get(k)]).filter(([, v]) => v) as [string, string][]);
  const withRange = (range: string) => `?${new URLSearchParams({ ...keep, range })}`;
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <div role="group" aria-label="Date range" className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-paper p-1 scrollbar-none">
        {options.map((o) => (
          <Link
            key={o.key}
            href={withRange(o.key)}
            aria-current={current === o.key ? "true" : undefined}
            onClick={() => setCustom(false)}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition sm:px-3.5",
              current === o.key ? "bg-ink text-cream" : "text-ink-soft hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          aria-expanded={custom}
          className={clsx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition sm:px-3.5", current === "custom" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink")}
        >
          <CalendarDays className="h-4 w-4" /> Custom
        </button>
      </div>
      {custom && (
        <form className="flex flex-wrap items-center gap-2" action="">
          <input type="hidden" name="range" value="custom" />
          {Object.entries(keep).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={sp.get("from") ?? from} max={to} className="field w-auto rounded-full py-1.5 text-sm" required />
          <span aria-hidden className="text-ink-soft">–</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={sp.get("to") ?? to} className="field w-auto rounded-full py-1.5 text-sm" required />
          <button type="submit" className="btn-primary min-h-9 px-4 py-1.5 text-sm">Apply</button>
        </form>
      )}
    </div>
  );
}
