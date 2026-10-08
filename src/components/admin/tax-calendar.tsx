"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { CalendarClock, Check } from "lucide-react";
import type { Obligation } from "@/lib/admin/tax";
import { setObligationDone } from "@/app/admin/(app)/accounting/actions";

const kindStyle = { iva: "bg-azulejo-tint text-azulejo-deep", ss: "bg-rose-tint text-coral-ink", irs: "bg-mustard-tint text-ink", efatura: "bg-olive-tint text-olive" } as const;
const kindLabel = { iva: "IVA", ss: "Seg. Social", irs: "IRS", efatura: "e-Fatura" } as const;

export function TaxCalendar({ items, done, today }: { items: Obligation[]; done: Record<string, string>; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const soon = new Date(new Date(today).getTime() + 75 * 86_400_000).toISOString().slice(0, 10);
  const list = items.filter((o) => showAll || (!done[o.key] && !o.auto && o.date <= soon) || (o.date >= today && o.date <= soon));
  return (
    <div>
      <ul className="divide-y divide-line">
        {list.map((o) => {
          const isDone = !!done[o.key];
          const overdue = !isDone && !o.auto && o.date < today;
          const days = Math.round((new Date(o.date).getTime() - new Date(today).getTime()) / 86_400_000);
          return (
            <li key={o.key} className={clsx("flex items-start gap-3 py-3", isDone && "opacity-60")}>
              <span className={clsx("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold", kindStyle[o.kind])}>{kindLabel[o.kind]}</span>
              <div className="min-w-0 flex-1 text-sm">
                <p className={clsx("font-medium", isDone && "line-through")}>{o.title}</p>
                <p className="text-xs text-ink-soft">{o.detail}</p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className={clsx("tabular-nums", overdue ? "font-semibold text-coral-ink" : "text-ink")}>{new Date(`${o.date}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</p>
                <p className="text-xs text-ink-soft">{isDone ? `feito ${new Date(`${done[o.key]}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}` : o.auto ? "automático" : overdue ? "em atraso" : days === 0 ? "hoje" : `daqui a ${days} dia${days === 1 ? "" : "s"}`}</p>
              </div>
              {!o.auto && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(async () => { await setObligationDone(o.key, !isDone); router.refresh(); })}
                  aria-label={isDone ? "Marcar como por fazer" : "Marcar como feito"}
                  title={isDone ? "Marcar como por fazer" : "Marcar como feito"}
                  className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full border", isDone ? "border-olive bg-olive text-white" : "border-line hover:border-olive hover:text-olive")}
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
        {list.length === 0 && <li className="flex items-center gap-2 py-3 text-sm text-ink-soft"><CalendarClock className="h-4 w-4" /> Nada a fazer nas próximas semanas.</li>}
      </ul>
      <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-azulejo hover:underline">{showAll ? "Mostrar só os próximos" : "Ver o ano completo"}</button>
    </div>
  );
}
