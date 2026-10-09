"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { checkDocVies, confirmDoc, deleteDoc, saveDoc, unconfirmDoc, type DocInput } from "@/app/admin/(app)/accounting/actions";
import { EU_COUNTRIES, purchaseRegime, regimeLabel, selfAssessedVat } from "@/lib/vat-regime";
import { Card, eur } from "./ui";

type Variant = { id: string; label: string };
const toC = (s: string) => Math.round((parseFloat(String(s).replace(",", ".")) || 0) * 100);
const fromC = (c: number) => (c / 100).toFixed(2);

function MoneyField({ label, value, onChange, disabled, className }: { label: string; value: number; onChange: (c: number) => void; disabled?: boolean; className?: string }) {
  const [t, setT] = useState(fromC(value));
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setT(fromC(value));
  }
  return <input aria-label={label} inputMode="decimal" disabled={disabled} value={t} onChange={(e) => setT(e.target.value)} onBlur={() => { const c = toC(t); setLast(c); onChange(c); setT(fromC(c)); }} className={clsx("field py-1.5 text-sm tabular-nums", className)} />;
}

export function AccountingDocEditor({ id, direction, initial, confirmed, stockApplied, fileUrl, isPdf, variants, vies }: { id: string; direction: "purchase" | "sale"; initial: DocInput; confirmed: boolean; stockApplied: boolean; fileUrl: string | null; isPdf: boolean; variants: Variant[]; vies: { valid: boolean | null; name: string | null; checkedAt: string | null } }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const locked = confirmed;
  const set = <K extends keyof DocInput>(k: K, v: DocInput[K]) => setD((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, patch: Partial<DocInput["lines"][number]>) => setD((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const linesNet = d.lines.reduce((n, l) => n + Math.round(l.quantity * l.unit_net), 0);
  const linesVat = d.lines.reduce((n, l) => n + Math.round((l.quantity * l.unit_net * l.vat_rate) / 100), 0);
  const mismatch = d.lines.length > 0 && (Math.abs(linesNet - d.net) > 2 || Math.abs(linesVat - d.vat) > 2);
  const totalMismatch = Math.abs(d.net + d.vat - d.total) > 2;
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Feito." : r.error ?? "Erro." });
      if (!r.ok) return;
      if (after) after();
      else router.refresh();
    });
  const recalcFromLines = () => {
    const byRate = new Map<number, { base: number; vat: number }>();
    for (const l of d.lines) {
      const base = Math.round(l.quantity * l.unit_net);
      const cur = byRate.get(l.vat_rate) ?? { base: 0, vat: 0 };
      cur.base += base;
      cur.vat += Math.round((base * l.vat_rate) / 100);
      byRate.set(l.vat_rate, cur);
    }
    const vat_lines = [...byRate.entries()].map(([rate, v]) => ({ rate, ...v }));
    const net = vat_lines.reduce((n, v) => n + v.base, 0);
    const vat = vat_lines.reduce((n, v) => n + v.vat, 0);
    setD((p) => ({ ...p, vat_lines, net, vat, total: net + vat }));
  };

  return (
    <div className="grid gap-4 pb-24 xl:grid-cols-[1fr_1.15fr]">
      <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        {fileUrl ? (
          <Card title="Documento" action={<a href={fileUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-azulejo hover:underline">Abrir <ExternalLink className="h-3.5 w-3.5" /></a>}>
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not optimisable */}
            {isPdf ? <iframe src={fileUrl} title="Documento" className="h-[70vh] w-full rounded-xl border border-line bg-white" /> : <img src={fileUrl} alt="Documento carregado" className="max-h-[70vh] w-full rounded-xl border border-line object-contain" />}
          </Card>
        ) : (
          <Card title="Documento"><p className="text-sm text-ink-soft">Sem ficheiro.</p></Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {confirmed && (
          <p className="flex items-center gap-2 rounded-2xl bg-olive-tint px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-olive" /> Confirmado{stockApplied ? " · stock e custos atualizados" : ""}. Para alterar, volte a rascunho.</p>
        )}
        <Card title={direction === "purchase" ? "Fornecedor e documento" : "Cliente e documento"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="dk">Tipo</label>
              <select id="dk" disabled={locked} value={d.kind} onChange={(e) => set("kind", e.target.value as DocInput["kind"])} className="field py-2 text-sm">
                <option value="invoice">Fatura / Fatura-recibo</option>
                <option value="credit_note">Nota de crédito</option>
                <option value="receipt">Recibo</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div><label className="label" htmlFor="dn">N.º do documento</label><input id="dn" disabled={locked} value={d.number} onChange={(e) => set("number", e.target.value)} className="field py-2 text-sm" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="dp">{direction === "purchase" ? "Fornecedor" : "Cliente"}</label><input id="dp" disabled={locked} value={d.party_name} onChange={(e) => set("party_name", e.target.value)} className="field py-2 text-sm" /></div>
            <div>
              <label className="label" htmlFor="dcountry">País</label>
              <select id="dcountry" disabled={locked} value={d.party_country || "PT"} onChange={(e) => set("party_country", e.target.value)} className="field py-2 text-sm">
                {[...EU_COUNTRIES].sort().map((c) => <option key={c} value={c}>{c}{c === "PT" ? " · Portugal" : " · UE"}</option>)}
                {["GB", "CH", "NO", "US", "CN", "IN", "TR", "MA", "BR"].map((c) => <option key={c} value={c}>{c} · fora da UE</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="dnif">{d.party_country && d.party_country !== "PT" ? "N.º de IVA (sem prefixo do país)" : "NIF"}</label><input id="dnif" disabled={locked} value={d.party_nif} onChange={(e) => set("party_nif", e.target.value)} className="field py-2 text-sm" /></div>
            <div><label className="label" htmlFor="dd">Data</label><input id="dd" type="date" disabled={locked} value={d.date} onChange={(e) => set("date", e.target.value)} className="field py-2 text-sm" /></div>
            {direction === "purchase" && (
              <>
                <div>
                  <label className="label" htmlFor="dc">Categoria</label>
                  <select id="dc" disabled={locked} value={d.category} onChange={(e) => set("category", e.target.value)} className="field py-2 text-sm">
                    <option value="goods">Mercadorias para revenda (entra em stock)</option>
                    <option value="materials">Materiais e embalagens</option>
                    <option value="services">Serviços (CTT, software, publicidade…)</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" disabled={locked} checked={d.deductible} onChange={(e) => set("deductible", e.target.checked)} className="h-4 w-4 accent-azulejo" /> IVA dedutível</label>
              </>
            )}
          </div>
        </Card>

        {direction === "purchase" && <RegimeCard country={d.party_country} vat={d.vat} net={d.net} vies={vies} onRecheck={() => run(() => checkDocVies(id))} pending={pending} />}

        <Card title="Linhas" action={!locked && <button type="button" onClick={recalcFromLines} className="text-xs font-medium text-azulejo hover:underline">Recalcular totais a partir das linhas</button>}>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr><th className="px-2 pb-2 font-medium">Descrição</th><th className="px-2 pb-2 font-medium">Qtd.</th><th className="px-2 pb-2 font-medium">Preço s/ IVA</th><th className="px-2 pb-2 font-medium">IVA %</th>{direction === "purchase" && d.category === "goods" && <th className="px-2 pb-2 font-medium">Produto (stock)</th>}<th /></tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {d.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2"><input aria-label="Descrição" disabled={locked} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className="field py-1.5 text-sm" /></td>
                    <td className="px-2 py-2"><input aria-label="Quantidade" type="number" min={0} step="1" disabled={locked} value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })} className="field w-20 py-1.5 text-sm tabular-nums" /></td>
                    <td className="px-2 py-2"><MoneyField label="Preço sem IVA" disabled={locked} value={l.unit_net} onChange={(c) => setLine(i, { unit_net: c })} className="w-24" /></td>
                    <td className="px-2 py-2">
                      <select aria-label="Taxa de IVA" disabled={locked} value={l.vat_rate} onChange={(e) => setLine(i, { vat_rate: Number(e.target.value) })} className="field w-20 py-1.5 text-sm">{[23, 13, 6, 0].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
                    </td>
                    {direction === "purchase" && d.category === "goods" && (
                      <td className="px-2 py-2">
                        <select aria-label="Produto" disabled={locked} value={l.variant_id ?? ""} onChange={(e) => setLine(i, { variant_id: e.target.value || null })} className={clsx("field py-1.5 text-sm", !l.variant_id && "border-mustard")}>
                          <option value="">— não entra em stock —</option>
                          {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-2 py-2">{!locked && <button type="button" onClick={() => set("lines", d.lines.filter((_, j) => j !== i))} aria-label="Remover linha" className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!locked && <button type="button" onClick={() => set("lines", [...d.lines, { description: "", quantity: 1, unit_net: 0, vat_rate: 23, variant_id: null, apply_stock: true }])} className="btn-outline mt-3 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Linha</button>}
          {direction === "purchase" && d.category === "goods" && <p className="mt-2 text-xs text-ink-soft">Ao confirmar, as linhas com produto escolhido somam ao stock e o custo do produto é atualizado (média ponderada). Linhas sem produto não mexem no stock.</p>}
        </Card>

        <Card title="Totais">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Base (s/ IVA)</label><MoneyField label="Base" disabled={locked} value={d.net} onChange={(c) => set("net", c)} /></div>
            <div><label className="label">IVA</label><MoneyField label="IVA" disabled={locked} value={d.vat} onChange={(c) => set("vat", c)} /></div>
            <div><label className="label">Total</label><MoneyField label="Total" disabled={locked} value={d.total} onChange={(c) => set("total", c)} /></div>
          </div>
          {d.vat_lines.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">{d.vat_lines.map((v) => <li key={v.rate}>IVA {v.rate}%: base {eur(v.base, 2)} · IVA {eur(v.vat, 2)}</li>)}</ul>
          )}
          {(mismatch || totalMismatch) && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-mustard-tint px-3 py-2 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {totalMismatch ? "Base + IVA não dá o total." : `As linhas somam ${eur(linesNet, 2)} + IVA ${eur(linesVat, 2)}, diferente dos totais.`} Compare com o documento.</p>
          )}
          <label className="label mt-4" htmlFor="dnotes">Notas</label>
          <textarea id="dnotes" rows={2} disabled={locked} value={d.notes} onChange={(e) => set("notes", e.target.value)} className="field text-sm" />
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <p role={msg?.ok === false ? "alert" : "status"} className={clsx("min-w-0 text-sm", msg?.ok === false ? "text-coral-ink" : "text-ink-soft")}>{msg?.text ?? (confirmed ? "Confirmado" : "Rascunho: reveja e confirme")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => confirm("Apagar este documento e o ficheiro?") && run(() => deleteDoc(id), () => router.push("/admin/accounting"))} className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /> Apagar</button>
            {confirmed ? (
              <button type="button" disabled={pending} onClick={() => run(() => unconfirmDoc(id))} className="btn-outline min-h-10 py-2 text-sm"><RotateCcw className="h-4 w-4" /> Voltar a rascunho</button>
            ) : (
              <>
                <button type="button" disabled={pending} onClick={() => run(() => saveDoc(id, d))} className="btn-outline min-h-10 py-2 text-sm">Guardar</button>
                <button type="button" disabled={pending} onClick={() => run(async () => { const s = await saveDoc(id, d); return s.ok ? confirmDoc(id) : s; })} className="btn-primary min-h-10 py-2 text-sm">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RegimeCard({ country, vat, net, vies, onRecheck, pending }: { country: string; vat: number; net: number; vies: { valid: boolean | null; name: string | null; checkedAt: string | null }; onRecheck: () => void; pending: boolean }) {
  const regime = purchaseRegime(country, vat);
  if (regime === "domestic") return null;
  return (
    <Card title="IVA desta compra">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-bold", regime === "foreign_vat" ? "bg-coral-tint text-coral-ink" : regime === "intra_eu" ? "bg-azulejo-tint text-azulejo-deep" : "bg-cream-deep text-ink")}>{regimeLabel[regime]}</span>
        {regime !== "import" && (
          <span className="text-ink-soft">
            VIES:{" "}
            {vies.valid === true ? <b className="text-olive">✓ válido{vies.name ? ` · ${vies.name}` : ""}</b> : vies.valid === false ? <b className="text-coral-ink">✗ número de IVA não válido</b> : "não verificado"}
            {" · "}
            <button type="button" disabled={pending} onClick={onRecheck} className="font-medium text-azulejo hover:underline">Verificar de novo</button>
          </span>
        )}
      </p>
      {regime === "intra_eu" && (
        <p className="mt-3 text-sm text-ink-soft">
          Fatura de outro país da UE sem IVA: autoliquida o IVA português. Entra na declaração <b>{eur(selfAssessedVat(net), 2)}</b> (23% de {eur(net, 2)}) como IVA liquidado <b>e</b> como IVA dedutível, ou seja, efeito zero.
        </p>
      )}
      {regime === "foreign_vat" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-coral-tint px-3 py-2 text-sm text-coral-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Este fornecedor cobrou IVA do país dele ({eur(vat, 2)}). <b>Não é dedutível em Portugal</b>, por isso conta como custo do produto. Para as próximas compras, dê-lhe o seu número de IVA (PT + NIF) e peça fatura sem IVA (entrega intracomunitária).</span>
        </p>
      )}
      {regime === "import" && (
        <p className="mt-3 text-sm text-ink-soft">Compra fora da UE: o IVA e os direitos são pagos na importação. Carregue também o documento da alfândega ou da transportadora (DHL, UPS, CTT…) com o IVA de importação, que é esse que se deduz.</p>
      )}
      {vies.valid === false && regime !== "import" && <p className="mt-2 text-sm text-coral-ink">Com o número inválido no VIES, a compra pode não ser aceite como intracomunitária. Confirme o número com o fornecedor.</p>}
    </Card>
  );
}
