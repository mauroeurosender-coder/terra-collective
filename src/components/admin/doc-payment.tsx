"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { setDocPayment } from "@/app/admin/(app)/accounting/actions";

const TERMS = [0, 15, 30, 45, 60, 90];
const today = () => new Date().toISOString().slice(0, 10);
const plus = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });

/** Paid / to pay for a purchase invoice, with the supplier’s usual payment terms. Works after confirming too. */
export function DocPayment({ id, docDate, paidOn, dueDate, supplierDays, supplierName }: { id: string; docDate: string; paidOn: string | null; dueDate: string | null; supplierDays: number | null; supplierName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState(Boolean(paidOn));
  const [paidDate, setPaidDate] = useState(paidOn ?? today());
  const [due, setDue] = useState(dueDate ?? docDate);
  const [terms, setTerms] = useState<number | null>(supplierDays);
  const [remember, setRemember] = useState(supplierDays == null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const late = !paid && due < today();

  const save = () =>
    start(async () => {
      const r = await setDocPayment(id, { paidOn: paid ? paidDate : null, dueDate: due, rememberDays: remember && terms != null ? terms : null });
      setMsg(r.ok ? { ok: true, text: r.message ?? "Guardado." } : { ok: false, text: r.error });
      router.refresh();
    });

  return (
    <section aria-label="Pagamento" className={clsx("mb-4 rounded-[var(--radius-card)] border bg-paper p-5", late ? "border-coral/60" : "border-line/70")}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[0.95rem] font-semibold">Pagamento</h2>
        <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", paidOn ? "bg-olive-tint text-olive" : late ? "bg-coral-tint text-coral-ink" : "bg-mustard-tint text-ink")}>
          {paidOn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {paidOn ? `Paga a ${fmt(paidOn)}` : late ? `Em atraso desde ${fmt(dueDate ?? docDate)}` : `Por pagar · vence a ${fmt(dueDate ?? docDate)}`}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr_1fr] md:items-end">
        <div role="radiogroup" aria-label="Estado do pagamento" className="grid grid-cols-2 gap-1.5">
          <button type="button" role="radio" aria-checked={!paid} onClick={() => setPaid(false)} className="chip min-h-10 text-sm">Por pagar</button>
          <button type="button" role="radio" aria-checked={paid} onClick={() => setPaid(true)} className="chip min-h-10 text-sm">Paga</button>
        </div>
        {paid ? (
          <label className="block text-sm">
            <span className="label">Data do pagamento</span>
            <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="field py-2 text-sm" />
          </label>
        ) : (
          <label className="block text-sm">
            <span className="label">Vence a</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field py-2 text-sm" />
          </label>
        )}
        <label className="block text-sm">
          <span className="label">Prazo habitual {supplierName ? `de ${supplierName}` : "deste fornecedor"}</span>
          <select
            value={terms ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              setTerms(v);
              setRemember(true);
              if (v != null) {
                setDue(plus(docDate, v));
                if (v === 0) { setPaid(true); setPaidDate(docDate); }
              }
            }}
            className="field py-2 text-sm"
          >
            <option value="">— não definido —</option>
            {TERMS.map((d) => <option key={d} value={d}>{d === 0 ? "Pago no momento" : `${d} dias`}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {terms != null && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-azulejo" />
            Usar este prazo nas próximas faturas deste fornecedor
          </label>
        )}
        <button type="button" disabled={pending} onClick={save} className="btn-primary ml-auto min-h-10 py-2 text-sm">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar pagamento</button>
      </div>
      {msg && <p role="status" className={clsx("mt-3 rounded-xl px-3 py-2 text-sm", msg.ok ? "bg-olive-tint text-olive" : "bg-coral-tint text-coral-ink")}>{msg.text}</p>}
    </section>
  );
}
