"use client";

import { useEffect, useId, useRef, useState } from "react";

type Point = { t: string; revenue: number; orders: number };

const eur = (cents: number, compact = false) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: compact || cents % 100 === 0 ? 0 : 2, notation: compact && cents >= 100_000_00 ? "compact" : "standard" }).format(cents / 100);

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Single-series revenue over time. One hue (azulejo), 2px line with a light
 * area, recessive grid, crosshair + tooltip on hover/focus, table view toggle.
 */
export function RevenueChart({ data, bucket }: { data: Point[]; bucket: "hour" | "day" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const gid = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 260;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => d.revenue)) * 1.08);
  const x = (i: number) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const label = (iso: string, long = false) => {
    const d = new Date(iso);
    return bucket === "hour"
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  };

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 90))));
  const total = data.reduce((n, d) => n + d.revenue, 0);

  const onMove = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const rel = clientX - r.left - pad.l;
    const i = Math.round((rel / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setTable((v) => !v)} className="text-xs font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline" aria-pressed={table}>
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>
      {table ? (
        <div className="max-h-[260px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">Revenue by {bucket}</caption>
            <thead className="sticky top-0 bg-paper text-left text-xs text-ink-soft">
              <tr><th className="px-3 py-2 font-medium">{bucket === "hour" ? "Hour" : "Day"}</th><th className="px-3 py-2 text-right font-medium">Orders</th><th className="px-3 py-2 text-right font-medium">Revenue</th></tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {data.map((d) => (
                <tr key={d.t}><td className="px-3 py-1.5">{label(d.t, true)}</td><td className="px-3 py-1.5 text-right">{d.orders}</td><td className="px-3 py-1.5 text-right">{eur(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrap} className="relative select-none" onMouseLeave={() => setHover(null)}>
          <svg
            width={w}
            height={H}
            role="img"
            aria-label={`Revenue by ${bucket}: ${eur(total)} total over ${data.length} ${bucket}s. Use left and right arrow keys to inspect values.`}
            tabIndex={0}
            className="block rounded-lg focus-visible:outline-2 focus-visible:outline-azulejo"
            onMouseMove={(e) => onMove(e.clientX)}
            onTouchMove={(e) => onMove(e.touches[0].clientX)}
            onFocus={() => setHover((v) => v ?? data.length - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? data.length) - 1));
              if (e.key === "ArrowRight") setHover((v) => Math.min(data.length - 1, (v ?? -1) + 1));
            }}
          >
            <defs>
              <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-azulejo)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--color-azulejo)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeDasharray={v === 0 ? undefined : "2 4"} />
                <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-ink-soft text-[11px] tabular-nums">
                  {eur(v, true)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % every === 0 ? (
                <text key={d.t} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : x(i) > w - pad.r - 30 ? "end" : "middle"} className="fill-ink-soft text-[11px]">
                  {label(d.t)}
                </text>
              ) : null,
            )}
            <path d={area} fill={`url(#${gid}-a)`} />
            <path d={line} fill="none" stroke="var(--color-azulejo)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {h && hover != null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--color-ink)" strokeOpacity="0.25" />
                <circle cx={x(hover)} cy={y(h.revenue)} r={5} fill="var(--color-azulejo)" stroke="var(--color-paper)" strokeWidth={2} />
              </g>
            )}
          </svg>
          {h && hover != null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-line bg-paper px-3 py-2 text-sm shadow-[var(--shadow-soft)]"
              style={{ left: Math.min(Math.max(x(hover) - 72, 0), w - 150) }}
            >
              <p className="text-xs text-ink-soft">{label(h.t, true)}</p>
              <p className="font-semibold tabular-nums">{eur(h.revenue)}</p>
              <p className="text-xs text-ink-soft tabular-nums">{h.orders} {h.orders === 1 ? "order" : "orders"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
