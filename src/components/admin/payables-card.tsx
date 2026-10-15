"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import { markDocsPaid } from "@/app/admin/(app)/accounting/actions";
import type { Payable } from "@/lib/admin/payables";
import { Card, eur } from "./ui";

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "2-digit" });
const today = () => new Date().toISOString().slice(0, 10);

/** Every unpaid supplier invoice, soonest due first. Tick the ones paid and choose the payment date. */
export function PayablesCard({ rows }: { rows: Payable[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState<"invoice" | "today" | "date">("invoice");
  const [date, setDate] = useState(today());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const late = rows.filter((r) => r.daysLate > 0).length;
  const sel = rows.filter((r) => picked.has(r.id));
  const all = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const pay = () =>
    start(async () => {
      const r = await markDocsPaid(sel.map((x) => x.id), when === "invoice" ? "invoice" : when === "today" ? today() : date);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Feito." } : { ok: false, text: r.error });
      setPicked(new Set());
      router.refresh();
    });

  return (
    <Card title="Faturas por pagar" action={<span className="text-xs text-ink-soft tabular-nums">{rows.length ? `${eur(total, 2)} em ${rows.length} fatura${rows.length === 1 ? "" : "s"}${late ? ` · ${late} em atraso` : ""}` : "Tudo pago"}</span>}>
      <span id="payables" className="block scroll-mt-24" />
      {!rows.length ? (
        <p className="text-sm text-ink-soft">Não há faturas de fornecedores por pagar.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-azulejo" />
              Selecionar todas
            </label>
            {sel.length > 0 && (
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-ink-soft">Pagas</span>
                <select aria-label="Data do pagamento" value={when} onChange={(e) => setWhen(e.target.value as typeof when)} className="field w-auto py-1.5 text-sm">
                  <option value="invoice">na data de cada fatura</option>
                  <option value="today">hoje</option>
                  <option value="date">noutra data…</option>
                </select>
                {when === "date" && <input type="date" aria-label="Data" value={date} onChange={(e) => setDate(e.target.value)} className="field w-auto py-1.5 text-sm" />}
                <button type="button" disabled={pending} onClick={pay} className="btn-primary min-h-9 py-1.5 text-sm">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Marcar {sel.length} como paga{sel.length === 1 ? "" : "s"} · {eur(sel.reduce((n, r) => n + r.total, 0), 2)}
                </button>
              </span>
            )}
          </div>
          <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto text-sm">
            {rows.map((r) => (
              <li key={r.id} className={clsx("flex flex-wrap items-center gap-3 py-2.5", picked.has(r.id) && "bg-cream/60")}>
                <input type="checkbox" aria-label={`Selecionar ${r.party} ${r.number ?? ""}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-azulejo" />
                <Link href={`/admin/accounting/docs/${r.id}`} className="min-w-0 flex-1 hover:text-azulejo">
                  <span className="font-medium">{r.party}</span>
                  <span className="block text-xs text-ink-soft">{r.number ?? "sem número"} · emitida {fmt(r.date)}</span>
                </Link>
                <span className={clsx("w-36 text-right text-xs", r.daysLate > 0 ? "font-semibold text-coral-ink" : r.daysLate >= -7 ? "text-ink" : "text-ink-soft")}>
                  {r.daysLate > 0 ? `atraso de ${r.daysLate} dia${r.daysLate === 1 ? "" : "s"}` : r.daysLate === 0 ? "vence hoje" : `vence ${fmt(r.due)}`}
                </span>
                <span className="w-24 text-right tabular-nums">{eur(r.total, 2)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && <p role="status" className={clsx("mt-3 rounded-xl px-3 py-2 text-sm", msg.ok ? "bg-olive-tint text-olive" : "bg-coral-tint text-coral-ink")}>{msg.text}</p>}
      <p className="mt-3 text-xs text-ink-soft">Os prazos de pagamento de cada fornecedor (pago no momento, 30 dias…) definem-se dentro de cada fatura e ficam guardados para as seguintes.</p>
    </Card>
  );
}
