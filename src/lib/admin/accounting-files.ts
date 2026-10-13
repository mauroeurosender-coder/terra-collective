import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stringifyCsv } from "./csv";
import { loadProfitOrders } from "./profit";
import { quarterRange, vatSummary } from "./tax";
import { purchaseRegime } from "../vat-regime";

/** Folder and file names for accounting documents, shared by the quarterly ZIP and the Google Drive copy. */

type Doc = { direction: string; kind: string; party_country: string | null; vat: number; date: string | null; party_name: string | null; number: string | null; file_name: string | null; file_path: string | null };

export const SALES_FOLDER = "5 Faturas emitidas (Moloni)";

export function docFolder(d: Doc) {
  if (d.direction === "sale") return "3 Notas de crédito emitidas";
  if (d.kind === "credit_note") return "2 Notas de crédito de fornecedores";
  if (purchaseRegime(d.party_country ?? "PT", d.vat) === "intra_eu") return "1b Aquisições intracomunitárias";
  return d.kind === "invoice" || d.kind === "receipt" ? "1 Compras" : "4 Outros";
}

export function docFileName(d: Doc) {
  const ext = (d.file_name ?? d.file_path ?? "pdf").split(".").pop()?.toLowerCase() || "pdf";
  const safe = `${d.date ?? "sem data"} ${d.party_name ?? "documento"} ${d.number ?? ""}`.replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 100);
  return `${safe}.${ext}`;
}

/** "2026-Q4" → "2026 T4 (out-dez)" */
export function quarterFolder(key: string) {
  const q = quarterRange(key);
  const months = ["jan-mar", "abr-jun", "jul-set", "out-dez"][q.n - 1];
  return `${q.year} T${q.n} (${months})`;
}
export const quarterKeyOf = (date: string) => {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The summary files of a quarter (documents list, sales list, VAT estimate). */
export async function summaryFiles(sb: SupabaseClient, key: string): Promise<{ name: string; mime: string; content: string }[]> {
  const q = quarterRange(key);
  const from = q.from.toISOString().slice(0, 10);
  const to = q.to.toISOString().slice(0, 10);
  const [{ data: docs }, orders, vat] = await Promise.all([
    sb.from("accounting_docs").select("*").gte("date", from).lt("date", to).order("date"),
    loadProfitOrders(sb, q.from, q.to),
    vatSummary(sb, q.key),
  ]);
  return [
    {
      name: "Documentos.csv",
      mime: "text/csv",
      content: stringifyCsv([
        ["Data", "Tipo", "Movimento", "Regime IVA", "Entidade", "NIF/IVA", "País", "VIES", "N.º documento", "Categoria", "Base", "IVA", "Total", "IVA dedutível", "Estado"],
        ...((docs ?? []) as any[]).map((d) => [d.date, d.kind === "credit_note" ? "Nota de crédito" : d.kind === "invoice" ? "Fatura" : d.kind, d.direction === "purchase" ? "Compra" : "Venda", d.direction === "purchase" ? purchaseRegime(d.party_country, d.vat) : "", d.party_name, d.party_nif, d.party_country, d.vies_valid == null ? "" : d.vies_valid ? "Válido" : "Inválido", d.number, d.category, eur(d.net), eur(d.vat), eur(d.total), d.deductible ? "Sim" : "Não", d.status === "confirmed" ? "Confirmado" : "Rascunho"]),
      ]),
    },
    {
      name: "Vendas.csv",
      mime: "text/csv",
      content: stringifyCsv([
        ["Data", "Encomenda", "Canal", "País", "Fatura", "Total pago", "Imposto cobrado pela Etsy", "Reembolsado"],
        ...orders.map((o) => [o.created_at.slice(0, 10), o.number, o.source, o.country, (o as unknown as { invoice_ref?: string }).invoice_ref ?? "", eur(o.total), eur(o.source === "etsy" ? o.vat : 0), eur(o.refunded_amount)]),
      ]),
    },
    {
      name: "Resumo IVA (estimativa).txt",
      mime: "text/plain",
      content: [
        `Terra Collective — ${q.label}`,
        `Estimativa para preparação da declaração periódica de IVA. Valores oficiais: contabilista.`,
        ``,
        `VENDAS`,
        `  Base tributável a 23%: ${eur(vat.sales.taxedBase)} €   IVA liquidado: ${eur(vat.sales.taxedVat)} €`,
        `  Exportações isentas (art. 14.º CIVA): ${eur(vat.sales.exemptExports)} €`,
        `  Notas de crédito emitidas: base ${eur(vat.sales.creditNotesBase)} €, IVA ${eur(vat.sales.creditNotesVat)} €`,
        ``,
        `COMPRAS (IVA dedutível)`,
        ...vat.purchases.goods.map((g) => `  Existências a ${g.rate}%: base ${eur(g.base)} €, IVA ${eur(g.vat)} €`),
        `  Outros bens e serviços: base ${eur(vat.purchases.other.base)} €, IVA ${eur(vat.purchases.other.vat)} €`,
        ``,
        `AQUISIÇÕES INTRACOMUNITÁRIAS DE BENS`,
        `  Base: ${eur(vat.intraEu.base)} €   IVA autoliquidado (23%): ${eur(vat.intraEu.vat)} € — incluído no IVA liquidado e no dedutível (existências 23%)`,
        `  IVA estrangeiro pago a fornecedores da UE (não dedutível em PT): ${eur(vat.foreignVat.vat)} €`,
        `  Compras fora da UE (IVA de importação pelo documento aduaneiro): base ${eur(vat.imports.base)} €`,
        ``,
        `IVA liquidado: ${eur(vat.output)} €`,
        `IVA dedutível: ${eur(vat.input)} €`,
        vat.balance >= 0 ? `IVA a pagar (estimativa): ${eur(vat.balance)} €` : `IVA a recuperar (estimativa): ${eur(-vat.balance)} €`,
        ``,
        `Vendas sem IVA no trimestre: ${eur(vat.revenueExVat)} €`,
        `Documentos em rascunho (não incluídos): ${vat.purchases.drafts}`,
      ].join("\n"),
    },
  ];
}
