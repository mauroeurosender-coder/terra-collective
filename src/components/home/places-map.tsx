"use client";

import { useState } from "react";
import clsx from "clsx";
import type { L } from "@/lib/types";

type Pin = { id: string; name: string; lon: number; lat: number; craft: L; note: L };

// Simplified outline of mainland Portugal (lon, lat), clockwise from Caminha.
const outline: [number, number][] = [
  [-8.87, 41.87], [-8.2, 42.12], [-7.9, 41.87], [-7.2, 41.9], [-6.55, 41.95], [-6.2, 41.6], [-6.9, 41.0], [-6.85, 40.6], [-6.9, 40.2],
  [-7.5, 39.7], [-7.0, 39.6], [-7.4, 39.4], [-7.1, 38.9], [-7.3, 38.5], [-7.1, 38.2], [-7.5, 37.8], [-7.45, 37.5], [-7.41, 37.19],
  [-7.65, 37.12], [-7.93, 37.01], [-8.53, 37.12], [-8.67, 37.1], [-8.95, 37.0], [-8.8, 37.4], [-8.87, 37.95], [-8.8, 38.1],
  [-8.9, 38.52], [-9.2, 38.66], [-9.42, 38.69], [-9.5, 38.78], [-9.42, 38.96], [-9.38, 39.36], [-9.07, 39.6], [-8.87, 40.15],
  [-8.75, 40.64], [-8.67, 41.15], [-8.78, 41.5],
];
const W = 220;
const H = 400;
const x = (lon: number) => 30 + ((lon + 9.6) / 3.5) * 160;
const y = (lat: number) => 20 + ((42.2 - lat) / 5.3) * 360;
const path = outline.map(([lo, la], i) => `${i ? "L" : "M"}${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join("") + "Z";

export function PlacesMap({ pins, lang }: { pins: Pin[]; lang: "en" | "pt" }) {
  const [active, setActive] = useState(pins[0].id);
  const current = pins.find((p) => p.id === active) ?? pins[0];
  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-14">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[260px]" role="img" aria-label={lang === "pt" ? "Mapa de Portugal com os locais de origem" : "Map of Portugal showing where our pieces are made"}>
        <path d={path} fill="var(--color-azulejo-tint)" stroke="var(--color-azulejo)" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="1 0" />
        <path d={path} fill="none" stroke="var(--color-azulejo)" strokeWidth=".8" strokeDasharray="2 5" transform="translate(4 3)" opacity=".45" />
        {/* the sea, hand-drawn waves */}
        {[120, 200, 280].map((yy) => (
          <path key={yy} d={`M4 ${yy}c6-5 12-5 18 0s12 5 18 0`} fill="none" stroke="var(--color-azulejo)" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
        ))}
        <text x="10" y="345" className="hand fill-azulejo text-[15px]">{lang === "pt" ? "Atlântico" : "Atlantic"}</text>
        {pins.map((p) => {
          const on = p.id === active;
          return (
            <g key={p.id} transform={`translate(${x(p.lon)} ${y(p.lat)})`} className="cursor-pointer" onClick={() => setActive(p.id)}>
              {on && <circle r="14" fill="var(--color-coral)" opacity=".18" />}
              <path d="M0 0c-6-7-9-11-9-15a9 9 0 0 1 18 0c0 4-3 8-9 15Z" fill={on ? "var(--color-coral)" : "var(--color-paper)"} stroke="var(--color-ink)" strokeWidth="1.3" />
              <circle cy="-15" r="3" fill={on ? "var(--color-paper)" : "var(--color-coral)"} />
            </g>
          );
        })}
      </svg>
      <div>
        <ul className="flex flex-wrap gap-2" role="tablist" aria-label={lang === "pt" ? "Locais" : "Places"}>
          {pins.map((p) => (
            <li key={p.id}>
              <button role="tab" aria-selected={p.id === active} onClick={() => setActive(p.id)} className={clsx("rounded-full border px-4 py-2 text-sm font-medium transition", p.id === active ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink-soft hover:text-ink")}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        <div role="tabpanel" className="mt-6 rounded-[var(--radius-card)] bg-paper p-6 shadow-[var(--shadow-soft)] md:p-8">
          <p className="hand text-2xl text-coral-ink">{current.craft[lang]}</p>
          <p className="headline mt-1 text-3xl">{current.name}</p>
          <p className="mt-3 max-w-md text-ink-soft">{current.note[lang]}</p>
        </div>
      </div>
    </div>
  );
}
