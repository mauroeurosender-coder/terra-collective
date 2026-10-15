"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Check, FileText, Loader2, Trash2 } from "lucide-react";
import { confirmDocs, deleteDocs } from "@/app/admin/(app)/accounting/actions";
import { eur } from "./ui";

export type DocRow = {
  id: string;
  date: string;
  kind: string;
  party: string | null;
  fileName: string | null;
  badge: { text: string; foreign: boolean } | null;
  number: string | null;
  net: number;
  vat: number;
  total: number;
  confirmed: boolean;
  stockApplied: boolean;
  /** Purchase invoices only: paid on, or due on. */
  payment: { paid: boolean; date: string | null } | null;
};
const today = () => new Date().toISOString().slice(0, 10);
const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });

export function AccountingDocsTable({ docs }: { docs: DocRow[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"confirm" | "delete" | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const drafts = docs.filter((d) => !d.confirmed);
  // Only drafts can be selected; confirmed ones drop out after a refresh.
  const selected = drafts.filter((d) => picked.has(d.id)).map((d) => d.id);
  const allPicked = drafts.length > 0 && selected.length === drafts.length;

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function confirm(ids: string[]) {
    setBusy("confirm");
    setMsg(null);
    const res = await confirmDocs(ids);
    setBusy(null);
    setMsg(res.ok ? { ok: true, text: res.message ?? "Confirmado." } : { ok: false, text: res.error });
    router.refresh();
  }

  async function remove(ids: string[]) {
    setBusy("delete");
    setAskDelete(false);
    setMsg(null);
    const res = await deleteDocs(ids);
    setBusy(null);
    setPicked(new Set());
    setMsg(res.ok ? { ok: true, text: res.message ?? "Apagado." } : { ok: false, text: res.error });
    router.refresh();
  }

  return (
    <>
      {drafts.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(drafts.map((d) => d.id)))} className="h-4 w-4 accent-azulejo" />
            Selecionar todos os rascunhos ({drafts.length})
          </label>
          <button disabled={busy !== null || selected.length === 0} onClick={() => setAskDelete(true)} className="btn-outline ml-auto min-h-10 py-2 text-sm text-coral-ink">
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {busy === "delete" ? "A apagar…" : `Apagar selecionados (${selected.length})`}
          </button>
          <button disabled={busy !== null || selected.length === 0} onClick={() => confirm(selected)} className="btn-primary min-h-10 py-2 text-sm">
            {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy === "confirm" ? "A confirmar…" : `Confirmar selecionados (${selected.length})`}
          </button>
        </div>
      )}
      {askDelete && (
        <div role="alertdialog" aria-label="Confirmar apagar" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-coral/50 bg-coral-tint/40 px-3 py-2 text-sm">
          <span className="flex-1">Apagar {selected.length} documento{selected.length === 1 ? "" : "s"} e o{selected.length === 1 ? "" : "s"} ficheiro{selected.length === 1 ? "" : "s"}? Não dá para desfazer.</span>
          <button type="button" onClick={() => remove(selected)} className="btn-primary min-h-9 py-1.5 text-sm">Sim, apagar</button>
          <button type="button" onClick={() => setAskDelete(false)} className="btn-outline min-h-9 py-1.5 text-sm">Cancelar</button>
        </div>
      )}
      {msg && <p role="status" className={clsx("mb-3 rounded-xl px-3 py-2 text-sm", msg.ok ? "bg-olive-tint text-olive" : "bg-coral-tint text-coral-ink")}>{msg.text}</p>}
      {drafts.length > 0 && <p className="mb-3 text-xs text-ink-soft">Confirme só os documentos que já reviu: ao confirmar, as compras de mercadoria entram em stock e atualizam os custos.</p>}

      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-ink-soft">
            <tr>
              <th className="w-8 px-2 pb-2"><span className="sr-only">Selecionar</span></th>
              <th className="px-2 pb-2 font-medium">Data</th>
              <th className="px-2 pb-2 font-medium">Tipo</th>
              <th className="px-2 pb-2 font-medium">Entidade</th>
              <th className="px-2 pb-2 font-medium">N.º</th>
              <th className="px-2 pb-2 text-right font-medium">Base</th>
              <th className="px-2 pb-2 text-right font-medium">IVA</th>
              <th className="px-2 pb-2 text-right font-medium">Total</th>
              <th className="px-2 pb-2 font-medium">Estado</th>
              <th className="px-2 pb-2 font-medium">Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {docs.map((d) => (
              <tr key={d.id} className={clsx("relative hover:bg-cream/70", picked.has(d.id) && !d.confirmed && "bg-cream/60")}>
                <td className="relative z-10 px-2 py-2.5">
                  {!d.confirmed && (
                    <input type="checkbox" aria-label={`Selecionar ${d.party ?? d.fileName ?? "documento"} ${d.number ?? ""}`} checked={picked.has(d.id)} onChange={() => toggle(d.id)} className="h-4 w-4 accent-azulejo" />
                  )}
                </td>
                <td className="px-2 py-2.5 whitespace-nowrap">{d.date}</td>
                <td className="px-2 py-2.5"><Link href={`/admin/accounting/docs/${d.id}`} className="after:absolute after:inset-0"><FileText className="mr-1 inline h-4 w-4 text-ink-soft" />{d.kind}</Link></td>
                <td className="px-2 py-2.5">
                  {d.party ?? <span className="text-ink-soft">{d.fileName}</span>}
                  {d.badge && (
                    <span className={clsx("ml-1.5 rounded px-1.5 py-0.5 align-middle text-[0.6rem] font-bold", d.badge.foreign ? "bg-coral-tint text-coral-ink" : "bg-azulejo-tint text-azulejo-deep")}>{d.badge.text}</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-ink-soft">{d.number ?? "—"}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.net, 2)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.vat, 2)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.total, 2)}</td>
                <td className="px-2 py-2.5">
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", d.confirmed ? "bg-olive-tint text-olive" : "bg-mustard-tint text-ink")}>
                    {d.confirmed ? (d.stockApplied ? "Confirmado · stock" : "Confirmado") : "Por confirmar"}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-xs whitespace-nowrap">
                  {!d.payment ? <span className="text-ink-soft">—</span> : d.payment.paid ? <span className="text-olive">✓ Paga {d.payment.date ? short(d.payment.date) : ""}</span> : d.payment.date && d.payment.date < today() ? <span className="font-semibold text-coral-ink">Em atraso</span> : <span>Vence {d.payment.date ? short(d.payment.date) : "—"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
