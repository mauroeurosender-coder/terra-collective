import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Download, FileText, Info } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { geminiConfigured } from "@/lib/server/gemini";
import { obligations, quarterOf, quarterRange, shiftQuarter, vatSummary } from "@/lib/admin/tax";
import { Card, NotConnected, PageHeader, eur } from "@/components/admin/ui";
import { AccountingUpload } from "@/components/admin/accounting-upload";
import { TaxCalendar } from "@/components/admin/tax-calendar";
import { purchaseRegime, regimeLabel } from "@/lib/vat-regime";

export const metadata = { title: "Contabilidade" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin({ owner: true });
  if (!supabaseConfigured) return <><PageHeader title="Contabilidade" /><NotConnected /></>;
  const sp = await searchParams;
  const q = quarterRange(sp.q ?? quarterOf(new Date()));
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const [vat, { data: docs }, { data: doneRow }] = await Promise.all([
    vatSummary(sb, q.key),
    sb.from("accounting_docs").select("id, direction, kind, status, party_name, party_country, number, date, net, vat, total, category, stock_applied, file_name, vies_valid").gte("date", q.from.toISOString().slice(0, 10)).lt("date", q.to.toISOString().slice(0, 10)).order("date", { ascending: false }),
    sb.from("settings").select("value").eq("key", "tax_done").maybeSingle(),
  ]);
  const year = new Date().getFullYear();
  const cal = [...obligations(year), ...obligations(year + 1).filter((o) => o.date < `${year + 1}-03-01`)];
  const kindLabel = (d: any) => (d.kind === "credit_note" ? (d.direction === "sale" ? "Nota de crédito emitida" : "Nota de crédito fornecedor") : d.kind === "invoice" ? "Fatura de compra" : d.kind === "receipt" ? "Recibo" : "Outro");

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <PageHeader
        title="Contabilidade"
        subtitle="IVA trimestral · trabalhador independente (categoria B, regime simplificado)"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`?q=${shiftQuarter(q.key, -1)}`} aria-label="Trimestre anterior" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper hover:bg-cream"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-36 text-center font-semibold">{q.label}</span>
            <Link href={`?q=${shiftQuarter(q.key, 1)}`} aria-label="Trimestre seguinte" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-paper hover:bg-cream"><ChevronRight className="h-4 w-4" /></Link>
            <a download href={`/admin/accounting/export?q=${q.key}`} className="btn-primary min-h-10 py-2 text-sm"><Download className="h-4 w-4" /> Pasta do trimestre (ZIP)</a>
          </div>
        }
      />

      <p className="flex items-start gap-2 rounded-2xl bg-cream-deep px-4 py-3 text-sm text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> Valores estimados para planear e preparar a documentação. As declarações oficiais são entregues pelo seu contabilista, e os prazos podem mudar com a lei ou feriados: confirme sempre com ele.
      </p>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card title={`IVA · ${q.label}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-cream p-4"><p className="text-xs text-ink-soft">IVA liquidado</p><p className="headline mt-1 text-2xl tabular-nums">{eur(vat.output, 2)}</p></div>
            <div className="rounded-2xl bg-cream p-4"><p className="text-xs text-ink-soft">IVA dedutível</p><p className="headline mt-1 text-2xl tabular-nums">{eur(vat.input, 2)}</p></div>
            <div className={clsx("rounded-2xl p-4", vat.balance >= 0 ? "bg-coral-tint" : "bg-olive-tint")}><p className="text-xs text-ink-soft">{vat.balance >= 0 ? "A pagar" : "A recuperar"}</p><p className="headline mt-1 text-2xl tabular-nums">{eur(Math.abs(vat.balance), 2)}</p></div>
          </div>
          <dl className="mt-5 space-y-1.5 text-sm tabular-nums">
            <p className="text-xs font-semibold tracking-wider text-ink-soft uppercase">Vendas ({vat.sales.orders} encomendas)</p>
            <Row label="Base tributável a 23%" value={vat.sales.taxedBase} sub={`IVA ${eur(vat.sales.taxedVat, 2)}`} />
            <Row label="Exportações isentas (art. 14.º CIVA)" value={vat.sales.exemptExports} />
            {vat.sales.creditNotesBase > 0 && <Row label="Notas de crédito emitidas" value={-vat.sales.creditNotesBase} sub={`IVA −${eur(vat.sales.creditNotesVat, 2)}`} />}
            <p className="pt-3 text-xs font-semibold tracking-wider text-ink-soft uppercase">Compras ({vat.purchases.docs} documentos confirmados)</p>
            {vat.purchases.goods.map((g) => <Row key={g.rate} label={`Existências a ${g.rate}%`} value={g.base} sub={`IVA ${eur(g.vat, 2)}`} />)}
            <Row label="Outros bens e serviços" value={vat.purchases.other.base} sub={`IVA ${eur(vat.purchases.other.vat, 2)}`} />
            {vat.intraEu.docs > 0 && (
              <>
                <p className="pt-3 text-xs font-semibold tracking-wider text-ink-soft uppercase">Aquisições intracomunitárias ({vat.intraEu.docs})</p>
                <Row label="Base (compras a fornecedores da UE sem IVA)" value={vat.intraEu.base} sub={`IVA autoliquidado 23%: ${eur(vat.intraEu.vat, 2)}`} />
                <p className="text-xs text-ink-soft">Este IVA entra como liquidado <b>e</b> como dedutível (já incluído acima nas existências a 23%), por isso o efeito é zero, mas tem de constar na declaração.</p>
              </>
            )}
            {vat.foreignVat.docs > 0 && <p className="mt-2 rounded-xl bg-coral-tint px-3 py-2 text-sm text-coral-ink">{eur(vat.foreignVat.vat, 2)} de IVA estrangeiro em {vat.foreignVat.docs} fatura{vat.foreignVat.docs === 1 ? "" : "s"} da UE não é dedutível em Portugal (conta como custo). Peça faturas sem IVA com o seu NIF PT.</p>}
            {vat.imports.docs > 0 && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm">{vat.imports.docs} compra{vat.imports.docs === 1 ? "" : "s"} fora da UE: o IVA de importação deduz-se pelo documento da alfândega/transportadora, que também deve carregar.</p>}
          </dl>
          {vat.purchases.drafts > 0 && <p className="mt-3 rounded-xl bg-mustard-tint px-3 py-2 text-sm">{vat.purchases.drafts} documento{vat.purchases.drafts === 1 ? "" : "s"} por confirmar não {vat.purchases.drafts === 1 ? "está" : "estão"} incluído{vat.purchases.drafts === 1 ? "" : "s"}.</p>}
          <p className="mt-3 text-xs text-ink-soft">Vendas a partir das encomendas (site, Etsy e manuais), sem o imposto cobrado pela Etsy. Taxas de IVA de outros países (OSS) e autoliquidação de serviços estrangeiros (ex.: taxas Etsy) não estão incluídas: o contabilista trata.</p>
        </Card>

        <Card title="Rendimentos e Segurança Social (estimativa)">
          <dl className="space-y-2 text-sm tabular-nums">
            <Row label="Vendas sem IVA no trimestre" value={vat.revenueExVat} strong />
            <Row label="Rendimento relevante para a Segurança Social (20%)" value={vat.ss.relevant} />
            <Row label="Contribuição mensal estimada (21,4%)" value={vat.ss.monthly} sub="a partir do trimestre seguinte" />
            <Row label="Rendimento tributável em IRS (coeficiente 0,15)" value={vat.irsTaxable} sub="regime simplificado, venda de mercadorias" />
          </dl>
          <p className="mt-4 text-xs text-ink-soft">O imposto final de IRS depende do seu agregado e de outros rendimentos. Isenções do 1.º ano de atividade e outras regras não estão consideradas.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card title="Prazos fiscais">
          <TaxCalendar items={cal} done={(doneRow?.value ?? {}) as Record<string, string>} today={today} />
        </Card>
        <Card title="Carregar documentos">
          <AccountingUpload gemini={geminiConfigured()} />
          {!geminiConfigured() && <p className="mt-3 text-xs text-ink-soft">Leitura automática desligada: adicione <code>GEMINI_API_KEY</code> nas variáveis de ambiente do Hostinger para os dados serem lidos dos PDFs.</p>}
        </Card>
      </div>

      <Card title={`Documentos · ${q.label}`} action={<span className="text-xs text-ink-soft">As faturas de venda estão no Moloni / e-Fatura</span>}>
        {!docs?.length ? (
          <p className="text-sm text-ink-soft">Ainda não há documentos neste trimestre.</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-ink-soft"><tr><th className="px-2 pb-2 font-medium">Data</th><th className="px-2 pb-2 font-medium">Tipo</th><th className="px-2 pb-2 font-medium">Entidade</th><th className="px-2 pb-2 font-medium">N.º</th><th className="px-2 pb-2 text-right font-medium">Base</th><th className="px-2 pb-2 text-right font-medium">IVA</th><th className="px-2 pb-2 text-right font-medium">Total</th><th className="px-2 pb-2 font-medium">Estado</th></tr></thead>
              <tbody className="divide-y divide-line">
                {docs.map((d: any) => (
                  <tr key={d.id} className="relative hover:bg-cream/70">
                    <td className="px-2 py-2.5 whitespace-nowrap">{d.date ? new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-PT") : "—"}</td>
                    <td className="px-2 py-2.5"><Link href={`/admin/accounting/docs/${d.id}`} className="after:absolute after:inset-0"><FileText className="mr-1 inline h-4 w-4 text-ink-soft" />{kindLabel(d)}</Link></td>
                    <td className="px-2 py-2.5">
                      {d.party_name ?? <span className="text-ink-soft">{d.file_name}</span>}
                      {d.direction === "purchase" && purchaseRegime(d.party_country, d.vat) !== "domestic" && (
                        <span className={clsx("ml-1.5 rounded px-1.5 py-0.5 align-middle text-[0.6rem] font-bold", purchaseRegime(d.party_country, d.vat) === "foreign_vat" ? "bg-coral-tint text-coral-ink" : "bg-azulejo-tint text-azulejo-deep")}>
                          {d.party_country} · {regimeLabel[purchaseRegime(d.party_country, d.vat)]}{d.vies_valid === false ? " · VIES ✗" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-ink-soft">{d.number ?? "—"}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.net, 2)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.vat, 2)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{eur(d.total, 2)}</td>
                    <td className="px-2 py-2.5"><span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", d.status === "confirmed" ? "bg-olive-tint text-olive" : "bg-mustard-tint text-ink")}>{d.status === "confirmed" ? (d.stock_applied ? "Confirmado · stock" : "Confirmado") : "Por confirmar"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, sub, strong }: { label: string; value: number; sub?: string; strong?: boolean }) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-4", strong && "font-semibold")}>
      <dt className={strong ? "" : "text-ink-soft"}>{label}</dt>
      <dd className="text-right">{value < 0 ? `−${eur(-value, 2)}` : eur(value, 2)}{sub && <span className="block text-xs font-normal text-ink-soft">{sub}</span>}</dd>
    </div>
  );
}
