import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeSettings } from "../settings";
import { loadProfitOrders, orderProfit } from "./profit";
import { purchaseRegime, selfAssessedVat } from "../vat-regime";

/**
 * Portuguese tax helpers for a self-employed seller (Category B, simplified regime)
 * in the normal VAT regime with QUARTERLY returns. Estimates to plan with — the
 * accountant files the official returns.
 */

export type QuarterKey = `${number}-Q${1 | 2 | 3 | 4}`;
export const quarterOf = (d: Date): QuarterKey => `${d.getFullYear()}-Q${(Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4}`;
export function quarterRange(q: string) {
  const m = /^(\d{4})-Q([1-4])$/.exec(q);
  const y = m ? Number(m[1]) : new Date().getFullYear();
  const n = m ? Number(m[2]) : Math.floor(new Date().getMonth() / 3) + 1;
  const from = new Date(Date.UTC(y, (n - 1) * 3, 1));
  const to = new Date(Date.UTC(y, n * 3, 1));
  return { key: `${y}-Q${n}` as QuarterKey, year: y, n, from, to, label: `${n}.º trimestre ${y}` };
}
export const shiftQuarter = (q: string, by: number) => {
  const r = quarterRange(q);
  const idx = r.year * 4 + (r.n - 1) + by;
  return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
};

export type VatSummary = {
  sales: { taxedBase: number; taxedVat: number; exemptExports: number; orders: number; creditNotesBase: number; creditNotesVat: number };
  purchases: { goods: { rate: number; base: number; vat: number }[]; other: { base: number; vat: number }; nonDeductibleVat: number; docs: number; drafts: number };
  /** Intra-EU acquisitions: base and self-assessed PT VAT (declared as charged AND deductible → neutral). */
  intraEu: { base: number; vat: number; docs: number };
  /** VAT charged by EU suppliers in their country — not deductible in Portugal. */
  foreignVat: { vat: number; docs: number };
  imports: { base: number; docs: number };
  output: number; // IVA liquidado
  input: number; // IVA dedutível
  balance: number; // > 0 to pay, < 0 credit
  revenueExVat: number; // vendas sem IVA (para IRS / Segurança Social)
  ss: { relevant: number; monthly: number }; // Segurança Social estimate
  irsTaxable: number; // 15% of sales of goods (simplified regime coefficient)
};

type Doc = { direction: "purchase" | "sale"; kind: string; status: string; category: string; deductible: boolean; net: number; vat: number; vat_lines: { rate: number; base: number; vat: number }[]; party_country: string | null };

export async function vatSummary(sb: SupabaseClient, q: string): Promise<VatSummary> {
  const r = quarterRange(q);
  const [{ data: sets }, orders, { data: docs }] = await Promise.all([
    sb.from("settings").select("key, value"),
    loadProfitOrders(sb, r.from, r.to),
    sb.from("accounting_docs").select("direction, kind, status, category, deductible, net, vat, vat_lines, party_country").gte("date", r.from.toISOString().slice(0, 10)).lt("date", r.to.toISOString().slice(0, 10)),
  ]);
  const p = mergeSettings(sets ?? []).profit;

  const sales = { taxedBase: 0, taxedVat: 0, exemptExports: 0, orders: 0, creditNotesBase: 0, creditNotesVat: 0 };
  for (const o of orders) {
    const x = orderProfit(o, p);
    sales.orders++;
    if (x.vatOwed > 0) {
      sales.taxedBase += x.revenue;
      sales.taxedVat += x.vatOwed;
    } else sales.exemptExports += x.revenue;
  }

  const byRate = new Map<number, { base: number; vat: number }>();
  const other = { base: 0, vat: 0 };
  let nonDeductibleVat = 0;
  let count = 0;
  let drafts = 0;
  const intraEu = { base: 0, vat: 0, docs: 0 };
  const foreignVat = { vat: 0, docs: 0 };
  const imports = { base: 0, docs: 0 };
  for (const d of (docs ?? []) as Doc[]) {
    if (d.status !== "confirmed") {
      drafts++;
      continue;
    }
    const sign = d.kind === "credit_note" ? -1 : 1;
    if (d.direction === "sale") {
      if (d.kind === "credit_note") {
        sales.creditNotesBase += d.net;
        sales.creditNotesVat += d.vat;
      }
      continue;
    }
    count++;
    const regime = purchaseRegime(d.party_country, d.vat);
    if (regime === "intra_eu") {
      // Self-assess 23% PT VAT: it is both charged (output) and deducted (input).
      const vat = selfAssessedVat(d.net);
      intraEu.base += sign * d.net;
      intraEu.vat += sign * vat;
      intraEu.docs++;
      if (d.deductible) {
        const target = d.category === "goods" || d.category === "materials" ? (byRate.get(23) ?? { base: 0, vat: 0 }) : other;
        target.base += sign * d.net;
        target.vat += sign * vat;
        if (d.category === "goods" || d.category === "materials") byRate.set(23, target);
      }
      continue;
    }
    if (regime === "foreign_vat") {
      foreignVat.vat += sign * d.vat;
      foreignVat.docs++;
      nonDeductibleVat += sign * d.vat;
      continue;
    }
    if (regime === "import") {
      imports.base += sign * d.net;
      imports.docs++;
      continue; // import VAT is deducted from the customs/courier document, not the supplier invoice
    }
    if (!d.deductible) {
      nonDeductibleVat += sign * d.vat;
      continue;
    }
    const lines = d.vat_lines?.length ? d.vat_lines : [{ rate: 23, base: d.net, vat: d.vat }];
    for (const l of lines) {
      if (d.category === "goods" || d.category === "materials") {
        const cur = byRate.get(Number(l.rate)) ?? { base: 0, vat: 0 };
        cur.base += sign * l.base;
        cur.vat += sign * l.vat;
        byRate.set(Number(l.rate), cur);
      } else {
        other.base += sign * l.base;
        other.vat += sign * l.vat;
      }
    }
  }
  const goods = [...byRate.entries()].sort((a, b) => b[0] - a[0]).map(([rate, v]) => ({ rate, ...v }));
  const output = sales.taxedVat - sales.creditNotesVat + intraEu.vat;
  const input = goods.reduce((n, g) => n + g.vat, 0) + other.vat;
  const revenueExVat = sales.taxedBase + sales.exemptExports - sales.creditNotesBase;
  // Self-employed selling goods: relevant income = 20% of sales; contribution 21.4% per month of 1/3 of the quarter.
  const relevant = Math.round(revenueExVat * 0.2);
  return {
    sales,
    purchases: { goods, other, nonDeductibleVat, docs: count, drafts },
    intraEu,
    foreignVat,
    imports,
    output,
    input,
    balance: output - input,
    revenueExVat,
    ss: { relevant, monthly: Math.max(2000, Math.round((relevant / 3) * 0.214)) },
    irsTaxable: Math.round(revenueExVat * 0.15),
  };
}

/* ------------------------------------------------------------------ Calendar */

export type Obligation = { key: string; date: string; title: string; detail: string; kind: "iva" | "ss" | "irs" | "efatura"; auto?: boolean };

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Deadlines for a self-employed seller, VAT normal quarterly. Typical legal dates — confirm with the accountant (holidays and law changes move them). */
export function obligations(year: number): Obligation[] {
  const out: Obligation[] = [];
  // VAT periodic return + payment: 20th / 25th of the 2nd month after the quarter.
  const vat: [number, number, number][] = [[year - 1, 4, 2], [year, 1, 5], [year, 2, 8], [year, 3, 11]];
  for (const [y, n, month] of vat) {
    const dy = n === 4 ? year : y;
    out.push({ key: `iva-dp-${y}-Q${n}`, date: iso(dy, month, 20), kind: "iva", title: `Declaração periódica de IVA · ${n}.º trimestre ${y}`, detail: "Entregar no Portal das Finanças (normalmente feito pelo contabilista)." });
    out.push({ key: `iva-pag-${y}-Q${n}`, date: iso(dy, month, 25), kind: "iva", title: `Pagamento do IVA · ${n}.º trimestre ${y}`, detail: "Se houver IVA a pagar, pagar com a referência da declaração." });
  }
  // Social Security quarterly declaration: last day of Jan, Apr, Jul, Oct.
  for (const [m, prevQ, qy] of [[1, 4, year - 1], [4, 1, year], [7, 2, year], [10, 3, year]] as [number, number, number][]) {
    out.push({ key: `ss-dt-${qy}-Q${prevQ}`, date: iso(year, m, lastDay(year, m)), kind: "ss", title: `Declaração trimestral Segurança Social · ${prevQ}.º trimestre ${qy}`, detail: "Declarar as vendas do trimestre na Segurança Social Direta." });
  }
  // Social Security monthly contribution: by the 20th.
  for (let m = 1; m <= 12; m++) out.push({ key: `ss-pag-${year}-${m}`, date: iso(year, m, 20), kind: "ss", title: `Contribuição Segurança Social · ${monthsPt[m - 1]}`, detail: "Pagamento mensal (entre os dias 10 e 20)." });
  // e-Fatura: invoices communicated to the AT (automatic via Moloni).
  for (let m = 1; m <= 12; m++) {
    const pm = m === 1 ? 12 : m - 1;
    out.push({ key: `efatura-${year}-${m}`, date: iso(year, m, 5), kind: "efatura", auto: true, title: `Comunicação de faturas de ${monthsPt[pm - 1]}`, detail: "Automática pelo Moloni (subutilizador WFA). Só confirme que as faturas aparecem no e-Fatura." });
  }
  // IRS annual return (Modelo 3 with Anexo B): 1 April – 30 June.
  out.push({ key: `irs-${year - 1}`, date: iso(year, 6, 30), kind: "irs", title: `Declaração de IRS (Modelo 3 + Anexo B) · rendimentos de ${year - 1}`, detail: "Prazo de 1 de abril a 30 de junho." });
  // IRS payments on account, when the previous year's assessment requires them.
  for (const [m, n] of [[7, 1], [9, 2], [12, 3]]) out.push({ key: `irs-pc-${year}-${n}`, date: iso(year, m, 20), kind: "irs", title: `Pagamento por conta de IRS (${n}.º)`, detail: "Só se a AT o tiver indicado na nota de liquidação do ano anterior." });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
