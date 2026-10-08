import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { stringifyCsv } from "@/lib/admin/csv";
import { quarterRange, vatSummary } from "@/lib/admin/tax";
import { loadProfitOrders } from "@/lib/admin/profit";

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/** Quarterly folder for the accountant: all documents + CSV summaries + VAT estimate, as one ZIP. */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = quarterRange(new URL(req.url).searchParams.get("q") ?? "");
  const sb = await supabaseServer();
  const from = q.from.toISOString().slice(0, 10);
  const to = q.to.toISOString().slice(0, 10);
  const [{ data: docs }, orders, vat] = await Promise.all([
    sb.from("accounting_docs").select("*").gte("date", from).lt("date", to).order("date"),
    loadProfitOrders(sb, q.from, q.to),
    vatSummary(sb, q.key),
  ]);

  const zip = new JSZip();
  const root = zip.folder(`Terra Collective ${q.key}`)!;
  const folders = { purchase: root.folder("1 Compras")!, purchaseCn: root.folder("2 Notas de crédito de fornecedores")!, saleCn: root.folder("3 Notas de crédito emitidas")!, other: root.folder("4 Outros")! };
  for (const d of docs ?? []) {
    if (!d.file_path) continue;
    const { data: file } = await sb.storage.from("accounting").download(d.file_path);
    if (!file) continue;
    const folder = d.direction === "sale" ? folders.saleCn : d.kind === "credit_note" ? folders.purchaseCn : d.kind === "invoice" || d.kind === "receipt" ? folders.purchase : folders.other;
    const ext = (d.file_name ?? d.file_path).split(".").pop();
    const safe = `${d.date} ${d.party_name ?? "documento"} ${d.number ?? ""}`.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 100);
    folder.file(`${safe}.${ext}`, await file.arrayBuffer());
  }

  root.file(
    "Documentos.csv",
    stringifyCsv([
      ["Data", "Tipo", "Movimento", "Entidade", "NIF", "País", "N.º documento", "Categoria", "Base", "IVA", "Total", "IVA dedutível", "Estado"],
      ...(docs ?? []).map((d) => [d.date, d.kind === "credit_note" ? "Nota de crédito" : d.kind === "invoice" ? "Fatura" : d.kind, d.direction === "purchase" ? "Compra" : "Venda", d.party_name, d.party_nif, d.party_country, d.number, d.category, eur(d.net), eur(d.vat), eur(d.total), d.deductible ? "Sim" : "Não", d.status === "confirmed" ? "Confirmado" : "Rascunho"]),
    ]),
  );
  root.file(
    "Vendas.csv",
    stringifyCsv([
      ["Data", "Encomenda", "Canal", "País", "Fatura", "Total pago", "Imposto cobrado pela Etsy", "Reembolsado"],
      ...orders.map((o) => [o.created_at.slice(0, 10), o.number, o.source, o.country, (o as unknown as { invoice_ref?: string }).invoice_ref ?? "", eur(o.total), eur(o.source === "etsy" ? o.vat : 0), eur(o.refunded_amount)]),
    ]),
  );
  root.file(
    "Resumo IVA (estimativa).txt",
    [
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
      `IVA liquidado: ${eur(vat.output)} €`,
      `IVA dedutível: ${eur(vat.input)} €`,
      vat.balance >= 0 ? `IVA a pagar (estimativa): ${eur(vat.balance)} €` : `IVA a recuperar (estimativa): ${eur(-vat.balance)} €`,
      ``,
      `Vendas sem IVA no trimestre: ${eur(vat.revenueExVat)} €`,
      `Documentos em rascunho (não incluídos): ${vat.purchases.drafts}`,
    ].join("\n"),
  );

  const body = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(body as unknown as BodyInit, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="terra-collective-${q.key}.zip"` },
  });
}
