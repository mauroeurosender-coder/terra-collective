"use client";

import { useState } from "react";
import clsx from "clsx";
import { Printer } from "lucide-react";
import type { PackOrder } from "@/lib/admin/pack-list";
import { Card, eur } from "./ui";

const flag = (c: string) => c.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

/** Choose orders to fulfil and/or shipped ones, then print one pack list for all of them. */
export function PackListPicker({ open, shipped, days }: { open: PackOrder[]; shipped: PackOrder[]; days: number }) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(open.map((o) => o.id)));
  const toggle = (id: string) => setChosen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setMany = (ids: string[], on: boolean) => setChosen((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  const ordered = [...open, ...shipped].filter((o) => chosen.has(o.id)).map((o) => o.id);
  const pieces = [...open, ...shipped].filter((o) => chosen.has(o.id)).reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);

  const group = (title: string, list: PackOrder[], extra?: React.ReactNode) => {
    const all = list.length > 0 && list.every((o) => chosen.has(o.id));
    return (
      <Card title={`${title} (${list.length})`} action={<div className="flex items-center gap-3">{extra}{list.length > 0 && <button type="button" onClick={() => setMany(list.map((o) => o.id), !all)} className="text-xs font-medium text-azulejo hover:underline">{all ? "Select none" : "Select all"}</button>}</div>}>
        {!list.length ? <p className="text-sm text-ink-soft">No orders here.</p> : (
          <ul className="divide-y divide-line">
            {list.map((o) => (
              <li key={o.id}>
                <label className={clsx("flex cursor-pointer items-start gap-3 py-2.5 text-sm", !chosen.has(o.id) && "opacity-60")}>
                  <input type="checkbox" checked={chosen.has(o.id)} onChange={() => toggle(o.id)} className="mt-0.5 h-4 w-4 accent-azulejo" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{flag(o.country)} {o.name || "—"}</span>
                    <span className="ml-2 text-xs text-ink-soft">{o.number} · {o.status === "shipped" ? `shipped ${day(o.shippedAt)}` : `ordered ${day(o.createdAt)}`}</span>
                    <span className="block truncate text-ink-soft">{o.items.map((i) => `${i.qty}× ${i.name}${i.variant ? ` (${i.variant})` : ""}`).join(", ")}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{eur(o.paid, 2)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {group("To fulfil", open)}
      {group(`Shipped in the last ${days} days`, shipped, (
        <span className="flex gap-1 text-xs">
          {[7, 30, 90].map((d) => <a key={d} href={`?days=${d}`} className={clsx("rounded-full px-2 py-0.5", d === days ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream")}>{d}d</a>)}
        </span>
      ))}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3">
          <p className="flex-1 text-sm text-ink-soft">{ordered.length} order{ordered.length === 1 ? "" : "s"} · {pieces} piece{pieces === 1 ? "" : "s"} selected</p>
          <a
            href={`/admin/orders/pack-list/print?ids=${ordered.join(",")}`}
            target="_blank"
            rel="noopener"
            aria-disabled={!ordered.length}
            className={clsx("btn-primary min-h-10 py-2 text-sm", !ordered.length && "pointer-events-none opacity-50")}
          >
            <Printer className="h-4 w-4" /> Print pack list
          </a>
        </div>
      </div>
    </div>
  );
}
