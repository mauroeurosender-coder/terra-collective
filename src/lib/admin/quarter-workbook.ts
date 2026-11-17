import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeSettings } from "../settings";
import { EU_COUNTRIES, outsideEuVat } from "../continents";
import { purchaseRegime, regimeLabel, selfAssessedVat } from "../vat-regime";
import { store } from "../config";
import { loadProfitOrders, orderProfit, ossOf } from "./profit";
import { quarterRange, vatSummary } from "./tax";
import { buildXlsx, col, date, money, S, type Cell, type Sheet } from "./xlsx";

/**
 * The quarter in one Excel file, to check against the Portal das Finanças before the VAT return:
 * a summary (with the return's field numbers), every sale, VAT per country (OSS), every purchase,
 * purchases per supplier and the credit notes.
 */

type Doc = {
  id: string;
  direction: "purchase" | "sale";
  kind: string;
  status: string;
  category: string;
  deductible: boolean;
  net: number;
  vat: number;
  total: number;
  vat_lines: { rate: number; base: number; vat: number }[] | null;
  party_name: string | null;
  party_nif: string | null;
  party_country: string | null;
  number: string | null;
  date: string | null;
  vies_valid: boolean | null;
};

const lisbonDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date(iso));
const pct = (r: number) => `${String(r).replace(".", ",")}%`;
const kindLabel = (k: string) => (k === "credit_note" ? "Nota de crédito" : k === "invoice" ? "Fatura" : k === "receipt" ? "Fatura-recibo" : k === "debit_note" ? "Nota de débito" : k);
const categoryLabel: Record<string, string> = { goods: "Mercadorias (revenda)", materials: "Materiais / embalagens", services: "Serviços", other: "Outros" };
const sourceLabel: Record<string, string> = { etsy: "Etsy", web: "Site", faire: "Faire", manual: "Manual" };
const invoiceLabel: Record<string, string> = { draft: "Rascunho", pending: "Por emitir", error: "Erro", deleted: "Apagada" };

/** Totals row under a table: SUBTOTAL(9, …) so the total follows the filter. */
function totalsRow(width: number, first: number, last: number, sums: Record<number, number>, label = "TOTAL"): Cell[] {
  const row: Cell[] = Array(width).fill(null);
  row[0] = { v: label, s: S.section };
  for (let i = 1; i < width; i++) row[i] = { v: "", s: S.section };
  for (const [c, cents] of Object.entries(sums)) {
    const L = col(Number(c));
    row[Number(c)] = { f: `SUBTOTAL(9,${L}${first}:${L}${last})`, v: Math.round(cents) / 100, s: S.eurSection };
  }
  return row;
}
const header = (names: string[]): Cell[] => names.map((v) => ({ v, s: S.header }));

export async function quarterWorkbook(sb: SupabaseClient, key: string) {
  const q = quarterRange(key);
  const from = q.from.toISOString().slice(0, 10);
  const to = q.to.toISOString().slice(0, 10);
  const [{ data: sets }, orders, { data: docRows }, vat] = await Promise.all([
    sb.from("settings").select("key, value"),
    loadProfitOrders(sb, q.from, q.to),
    sb.from("accounting_docs").select("id, direction, kind, status, category, deductible, net, vat, total, vat_lines, party_name, party_nif, party_country, number, date, vies_valid").gte("date", from).lt("date", to).order("date"),
    vatSummary(sb, q.key),
  ]);
  const p = mergeSettings(sets ?? []).profit;
  const docs = (docRows ?? []) as Doc[];
  const confirmed = docs.filter((d) => d.status === "confirmed");
  const drafts = docs.filter((d) => d.status !== "confirmed");

  /* ---------------------------------------------------------------- Sales */
  type Sale = { issued: boolean; date: string; number: string; source: string; country: string; invoice: string; regime: string; rate: number | null; total: number; etsyTax: number; refunded: number; base: number; vat: number };
  const sales: Sale[] = orders.map((o) => {
    const x = orderProfit(o, p);
    const oss = ossOf(o);
    const outside = !EU_COUNTRIES.has(o.country) || outsideEuVat(o.country, o.shipping_address?.postal);
    const regime = x.vatOwed > 0 ? (oss != null ? "OSS (IVA do país do cliente)" : "IVA Portugal") : outside ? "Isenta · exportação (art. 14.º CIVA)" : o.country === "PT" ? "Isenta" : "Isenta · empresa UE (art. 14.º RITI)";
    const rate = x.vatOwed > 0 ? (oss ?? 23) : null;
    return {
      date: lisbonDay(o.created_at),
      number: o.number,
      source: sourceLabel[o.source] ?? o.source,
      country: o.country,
      // Finalised invoices keep their official number (e.g. "FR 2026/123"); otherwise show where it stands.
      invoice: o.invoice_status === "issued" && o.invoice_ref ? o.invoice_ref : (invoiceLabel[o.invoice_status ?? ""] ?? "Sem fatura"),
      issued: o.invoice_status === "issued",
      regime,
      rate,
      total: o.total,
      etsyTax: o.source === "etsy" ? o.vat : 0,
      refunded: o.refunded_amount,
      base: x.revenue,
      vat: x.vatOwed,
    };
  });
  const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0);
  const salesFirst = 2;
  const salesLast = sales.length + 1;
  const salesSheet: Sheet = {
    name: "Vendas",
    cols: [11, 18, 8, 6, 30, 34, 7, 13, 14, 13, 14, 12],
    freeze: 1,
    filter: `A1:L${Math.max(2, salesLast)}`,
    rows: [
      header(["Data", "Encomenda", "Canal", "País", "Fatura Moloni", "Regime de IVA", "Taxa", "Total cobrado", "Imposto retido pela Etsy", "Reembolsado", "Base (sem IVA)", "IVA"]),
      ...sales.map((s) => [date(s.date), s.number, s.source, s.country, s.invoice, s.regime, s.rate == null ? "0%" : pct(s.rate), money(s.total), money(s.etsyTax), money(s.refunded), money(s.base), money(s.vat)] as Cell[]),
      totalsRow(12, salesFirst, Math.max(salesFirst, salesLast), { 7: sum(sales, (s) => s.total), 8: sum(sales, (s) => s.etsyTax), 9: sum(sales, (s) => s.refunded), 10: sum(sales, (s) => s.base), 11: sum(sales, (s) => s.vat) }),
      [],
      [{ v: "Base + IVA = Total cobrado − Imposto retido pela Etsy − Reembolsado. Use os filtros do cabeçalho: o TOTAL acompanha o filtro (ex.: só OSS, só um país).", s: S.note }],
      [{ v: "Encomendas pela data em que foram feitas; no e-Fatura as faturas aparecem pela data da fatura, por isso algumas do fim do trimestre podem cair no seguinte.", s: S.note }],
    ],
  };

  /* --------------------------------------------------------- VAT by rate */
  const groups = new Map<string, { regime: string; country: string; rate: number | null; orders: number; base: number; vat: number }>();
  for (const s of sales) {
    const oss = s.regime.startsWith("OSS");
    const k = oss ? `1 ${s.country}` : s.vat > 0 ? "0 PT" : `2 ${s.regime}`;
    const g = groups.get(k) ?? { regime: oss ? "OSS" : s.vat > 0 ? "IVA Portugal" : s.regime, country: oss ? s.country : s.vat > 0 ? "PT (inclui UE antes do OSS)" : "—", rate: s.rate, orders: 0, base: 0, vat: 0 };
    g.orders++;
    g.base += s.base;
    g.vat += s.vat;
    groups.set(k, g);
  }
  const g = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]) || b[1].base - a[1].base).map(([, v]) => v);
  const ossRows = g.filter((x) => x.regime === "OSS");
  const byRateSheet: Sheet = {
    name: "IVA por país",
    cols: [36, 26, 8, 12, 15, 14],
    freeze: 1,
    rows: [
      header(["Regime", "País", "Taxa", "Encomendas", "Base (sem IVA)", "IVA"]),
      ...g.map((x) => [x.regime, x.country, x.rate == null ? "0%" : pct(x.rate), x.orders, money(x.base), money(x.vat)] as Cell[]),
      totalsRow(6, 2, g.length + 1, { 4: sum(g, (x) => x.base), 5: sum(g, (x) => x.vat) }),
      [],
      [{ v: "Declaração OSS (Balcão Único, Regime União)", s: S.bold }],
      ...(ossRows.length
        ? [...ossRows.map((x) => [`  ${x.country}`, "", pct(x.rate ?? 0), x.orders, money(x.base), money(x.vat)] as Cell[]), [{ v: "Total OSS a declarar e pagar", s: S.bold }, "", "", sum(ossRows, (x) => x.orders), money(sum(ossRows, (x) => x.base), S.eurBold), money(sum(ossRows, (x) => x.vat), S.eurBold)] as Cell[]]
        : [[{ v: store.oss.from && store.oss.from < to ? "Sem vendas OSS neste trimestre (a declaração é obrigatória mesmo a zero)." : "OSS ainda não ativo neste trimestre.", s: S.note }]]),
    ],
  };

  /* ------------------------------------------------------------ Purchases */
  const purchases = confirmed.filter((d) => d.direction === "purchase");
  const deductibleOf = (d: Doc) => {
    const regime = purchaseRegime(d.party_country, d.vat);
    if (!d.deductible || regime === "foreign_vat" || regime === "import") return 0;
    return regime === "intra_eu" ? selfAssessedVat(d.net) : d.vat;
  };
  const sign = (d: Doc) => (d.kind === "credit_note" ? -1 : 1);
  const rates = (d: Doc) => (d.vat_lines?.length ? [...new Set(d.vat_lines.map((l) => pct(Number(l.rate))))].join(" + ") : d.vat ? pct(Math.round((d.vat / Math.max(1, d.net)) * 100)) : "0%");
  const pFirst = 2;
  const pLast = purchases.length + 1;
  const purchasesSheet: Sheet = {
    name: "Compras",
    cols: [11, 30, 13, 6, 20, 15, 22, 26, 9, 13, 12, 13, 13],
    freeze: 1,
    filter: `A1:M${Math.max(2, pLast)}`,
    rows: [
      header(["Data", "Fornecedor", "NIF", "País", "N.º documento", "Tipo", "Categoria", "Regime", "Taxas", "Base (sem IVA)", "IVA", "Total", "IVA dedutível"]),
      ...purchases.map((d) => [date(d.date), d.party_name ?? "", d.party_nif ?? "", d.party_country ?? "PT", d.number ?? "", kindLabel(d.kind), categoryLabel[d.category] ?? d.category, regimeLabel[purchaseRegime(d.party_country, d.vat)], rates(d), money(sign(d) * d.net), money(sign(d) * d.vat), money(sign(d) * d.total), money(sign(d) * deductibleOf(d))] as Cell[]),
      totalsRow(13, pFirst, Math.max(pFirst, pLast), { 9: sum(purchases, (d) => sign(d) * d.net), 10: sum(purchases, (d) => sign(d) * d.vat), 11: sum(purchases, (d) => sign(d) * d.total), 12: sum(purchases, (d) => sign(d) * deductibleOf(d)) }),
      [],
      [{ v: "Notas de crédito a negativo. Só documentos confirmados; os rascunhos estão no Resumo e não entram nos totais.", s: S.note }],
      [{ v: "Aquisições intracomunitárias: o IVA dedutível é o IVA português autoliquidado (23% da base), que também entra no IVA liquidado.", s: S.note }],
    ],
  };

  /* ------------------------------------------------------- By supplier */
  const sup = new Map<string, { name: string; nif: string; country: string; invoices: number; credits: number; base: number; vat: number; total: number; deductible: number }>();
  for (const d of purchases) {
    const k = (d.party_nif || d.party_name || "?").toUpperCase().replace(/\s/g, "");
    const s = sup.get(k) ?? { name: d.party_name ?? "", nif: d.party_nif ?? "", country: d.party_country ?? "PT", invoices: 0, credits: 0, base: 0, vat: 0, total: 0, deductible: 0 };
    if (d.kind === "credit_note") s.credits++;
    else s.invoices++;
    s.base += sign(d) * d.net;
    s.vat += sign(d) * d.vat;
    s.total += sign(d) * d.total;
    s.deductible += sign(d) * deductibleOf(d);
    sup.set(k, s);
  }
  const suppliers = [...sup.values()].sort((a, b) => b.total - a.total);
  const supplierSheet: Sheet = {
    name: "Por fornecedor",
    cols: [32, 14, 6, 9, 13, 15, 13, 14, 14],
    freeze: 1,
    filter: `A1:I${Math.max(2, suppliers.length + 1)}`,
    rows: [
      header(["Fornecedor", "NIF", "País", "Faturas", "Notas de crédito", "Base (sem IVA)", "IVA", "Total", "IVA dedutível"]),
      ...suppliers.map((s) => [s.name, s.nif, s.country, s.invoices, s.credits, money(s.base), money(s.vat), money(s.total), money(s.deductible)] as Cell[]),
      totalsRow(9, 2, Math.max(2, suppliers.length + 1), { 5: sum(suppliers, (s) => s.base), 6: sum(suppliers, (s) => s.vat), 7: sum(suppliers, (s) => s.total), 8: sum(suppliers, (s) => s.deductible) }),
      [],
      [{ v: "Para comparar com o e-Fatura → Faturas e recibos → Adquirente (por NIF do emitente). Valores já líquidos das notas de crédito.", s: S.note }],
    ],
  };

  /* ------------------------------------------------------- Credit notes */
  const credits = confirmed.filter((d) => d.kind === "credit_note");
  const creditSheet: Sheet = {
    name: "Notas de crédito",
    cols: [11, 12, 30, 13, 6, 20, 15, 12, 13],
    freeze: 1,
    rows: [
      header(["Data", "Movimento", "Entidade", "NIF", "País", "N.º documento", "Base (sem IVA)", "IVA", "Total"]),
      ...credits.map((d) => [date(d.date), d.direction === "purchase" ? "Recebida" : "Emitida", d.party_name ?? "", d.party_nif ?? "", d.party_country ?? "PT", d.number ?? "", money(d.net), money(d.vat), money(d.total)] as Cell[]),
      ...(credits.length ? [] : [[{ v: "Sem notas de crédito confirmadas neste trimestre.", s: S.note }] as Cell[]]),
      [],
      [{ v: "Recebidas (de fornecedores)", s: S.bold }, "", "", "", "", "", ...(["net", "vat", "total"] as const).map((k) => money(sum(credits.filter((d) => d.direction === "purchase"), (d) => d[k]), S.eurBold))],
      [{ v: "Emitidas (a clientes)", s: S.bold }, "", "", "", "", "", ...(["net", "vat", "total"] as const).map((k) => money(sum(credits.filter((d) => d.direction === "sale"), (d) => d[k]), S.eurBold))],
    ],
  };

  /* ------------------------------------------------------------- Summary */
  const goods = (r: number) => vat.purchases.goods.find((x) => x.rate === r) ?? { base: 0, vat: 0 };
  const purchTotal = { base: sum(purchases, (d) => sign(d) * d.net), vat: sum(purchases, (d) => sign(d) * d.vat), total: sum(purchases, (d) => sign(d) * d.total) };
  const creditsIn = credits.filter((d) => d.direction === "purchase");
  const line = (label: string, base: number | null, iva: number | null, field = "", style: number = S.eur): Cell[] => [label, base == null ? "" : money(base, style), iva == null ? "" : money(iva, style), base == null || iva == null ? "" : money(base + iva, style), field];
  const section = (t: string): Cell[] => [{ v: t, s: S.section }, { v: "", s: S.section }, { v: "", s: S.section }, { v: "", s: S.section }, { v: "", s: S.section }];
  const summary: Sheet = {
    name: "Resumo",
    cols: [58, 16, 15, 16, 22],
    rows: [
      [{ v: `${store.name} — IVA ${q.label}`, s: S.title }],
      [{ v: `${from.split("-").reverse().join("/")} a ${new Date(q.to.getTime() - 86_400_000).toISOString().slice(0, 10).split("-").reverse().join("/")} · gerado em ${new Date().toLocaleDateString("pt-PT")} · estimativa para conferir; os valores oficiais são os do contabilista.`, s: S.note }],
      [],
      header(["", "Base (sem IVA)", "IVA", "Total", "Campo DP (referência)"]),
      section("VENDAS"),
      line(`Vendas com IVA português a 23% (${sales.filter((s) => s.regime === "IVA Portugal").length} encomendas)`, vat.sales.taxedBase, vat.sales.taxedVat, "Campos 3 e 4"),
      line(`Vendas UE em OSS, IVA do país do cliente (${vat.oss.orders} encomendas)`, vat.oss.base, vat.oss.vat, "Declaração OSS (à parte)"),
      line(`Vendas isentas: exportações e empresas UE (${sales.filter((s) => s.vat === 0).length} encomendas)`, vat.sales.exemptExports, 0, "Campo 7"),
      line("Notas de crédito emitidas (a abater)", -vat.sales.creditNotesBase, -vat.sales.creditNotesVat),
      line("Total de vendas", vat.revenueExVat, vat.sales.taxedVat - vat.sales.creditNotesVat + vat.oss.vat, "", S.eurBold),
      [],
      section("COMPRAS"),
      line(`Total de compras confirmadas (${purchases.length} documentos, ${suppliers.length} fornecedores)`, purchTotal.base, purchTotal.vat, "Ver Por fornecedor", S.eurBold),
      line(`  das quais notas de crédito recebidas (${creditsIn.length})`, -sum(creditsIn, (d) => d.net), -sum(creditsIn, (d) => d.vat)),
      [{ v: "IVA dedutível", s: S.bold }],
      line("  Existências (mercadorias) a 6%", goods(6).base, goods(6).vat, "Campo 21"),
      line("  Existências (mercadorias) a 13%", goods(13).base, goods(13).vat, "Campo 23"),
      line("  Existências (mercadorias) a 23%", goods(23).base, goods(23).vat, "Campo 22"),
      line("  Outros bens e serviços", vat.purchases.other.base, vat.purchases.other.vat, "Campo 24"),
      line("  das quais aquisições intracomunitárias (IVA autoliquidado 23%, já incluídas acima)", vat.intraEu.base, vat.intraEu.vat, "Confirmar com contabilista"),
      line("  IVA estrangeiro pago a fornecedores UE (não dedutível)", null, vat.foreignVat.vat),
      line("  Compras fora da UE (IVA na declaração aduaneira)", vat.imports.base, null),
      line("  IVA não dedutível", null, vat.purchases.nonDeductibleVat),
      [],
      section("APURAMENTO"),
      ["IVA liquidado (vendas 23% − notas de crédito + autoliquidação UE)", "", money(vat.output, S.eurBold)],
      ["IVA dedutível", "", money(vat.input, S.eurBold)],
      [{ v: vat.balance >= 0 ? "IVA a pagar (declaração periódica)" : "IVA a recuperar (declaração periódica)", s: S.bold }, "", money(Math.abs(vat.balance), S.eurBold)],
      [{ v: "IVA OSS a pagar (Balcão Único, à parte)", s: S.bold }, "", money(vat.oss.vat, S.eurBold)],
      [],
      ...(drafts.length
        ? [
            [{ v: `⚠ ${drafts.length} documento(s) em rascunho NÃO incluídos — confirme-os em Contabilidade:`, s: S.bold }] as Cell[],
            ...drafts.map((d) => [`  ${d.date ?? "sem data"} · ${d.party_name ?? "?"} · ${d.number ?? ""} (${kindLabel(d.kind)})`, money(d.net), money(d.vat), money(d.total)] as Cell[]),
            [] as Cell[],
          ]
        : []),
      ...(sales.some((s) => !s.issued)
        ? [[{ v: `⚠ ${sales.filter((s) => !s.issued).length} venda(s) sem fatura finalizada no Moloni — não aparecem no e-Fatura até serem finalizadas (ver coluna "Fatura Moloni" em Vendas).`, s: S.bold }] as Cell[], [] as Cell[]]
        : []),
      [{ v: "Os números de campo são uma referência ao quadro 06 da declaração periódica; confirme sempre com o contabilista.", s: S.note }],
      [{ v: "Vendas pela data da encomenda; compras pela data do documento.", s: S.note }],
    ],
  };

  return buildXlsx([summary, salesSheet, byRateSheet, purchasesSheet, supplierSheet, creditSheet]);
}
