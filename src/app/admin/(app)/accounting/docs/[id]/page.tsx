import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { AccountingDocEditor } from "@/components/admin/accounting-doc-editor";
import type { DocInput } from "../../actions";

export const metadata = { title: "Documento" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function AccountingDocPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin({ owner: true });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseServer();
  const [{ data: doc }, { data: vs }, { data: invItems }] = await Promise.all([
    sb.from("accounting_docs").select("*, accounting_doc_lines(*)").eq("id", id).maybeSingle(),
    sb.from("variants").select("id, sku, options, products!inner(name, status)").neq("products.status", "archived"),
    sb.from("inventory_items").select("id, name").order("name"),
  ]);
  if (!doc) notFound();
  const variants = (vs ?? [])
    .map((v: any) => ({ id: v.id, label: `${v.products.name.en}${Object.values(v.options ?? {}).length ? ` · ${Object.values(v.options).join(" · ")}` : ""} (${v.sku})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const initial: DocInput = {
    kind: doc.kind,
    party_name: doc.party_name ?? "",
    party_nif: doc.party_nif ?? "",
    party_country: doc.party_country ?? "PT",
    number: doc.number ?? "",
    date: doc.date ?? "",
    net: doc.net,
    vat: doc.vat,
    total: doc.total,
    vat_lines: doc.vat_lines ?? [],
    category: doc.category,
    deductible: doc.deductible,
    notes: doc.notes ?? "",
    lines: [...(doc.accounting_doc_lines ?? [])]
      .sort((a: any, b: any) => a.position - b.position)
      .map((l: any) => ({ description: l.description, quantity: Number(l.quantity), unit_net: l.unit_net, vat_rate: Number(l.vat_rate), variant_id: l.variant_id, item_id: l.item_id ?? null, apply_stock: l.apply_stock })),
  };
  const title = `${doc.kind === "credit_note" ? "Nota de crédito" : "Fatura"}${doc.party_name ? ` · ${doc.party_name}` : ""}`;
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader back={{ href: "/admin/accounting", label: "Contabilidade" }} title={title} subtitle={doc.direction === "sale" ? "Documento de venda" : "Documento de compra"} />
      <AccountingDocEditor
        id={doc.id}
        direction={doc.direction}
        initial={initial}
        confirmed={doc.status === "confirmed"}
        stockApplied={doc.stock_applied}
        fileUrl={doc.file_path ? `/admin/accounting/file/${doc.id}` : null}
        isPdf={/\.pdf$/i.test(doc.file_name ?? doc.file_path ?? "")}
        variants={variants}
        items={(invItems ?? []) as { id: string; name: string }[]}
        vies={{ valid: doc.vies_valid ?? null, name: doc.vies_name ?? null, checkedAt: doc.vies_checked_at ?? null }}
      />
    </div>
  );
}
