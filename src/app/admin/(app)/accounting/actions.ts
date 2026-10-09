"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { extractInvoice, geminiConfigured } from "@/lib/server/gemini";
import { checkVies } from "@/lib/server/vies";
import { cleanVatNumber, purchaseRegime } from "@/lib/vat-regime";

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };
const c = (euros: number) => Math.round((Number(euros) || 0) * 100);

async function owner() {
  await requireAdmin({ owner: true });
  return supabaseServer();
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9 ]/g, " ");
/** Best product variant for an invoice line, by shared words with the product/variant name (or exact SKU). */
function suggestVariant(desc: string, variants: { id: string; sku: string; label: string }[]) {
  const d = norm(desc);
  const words = new Set(d.split(/\s+/).filter((w) => w.length > 2));
  let best: { id: string; score: number } | null = null;
  for (const v of variants) {
    if (v.sku && d.includes(norm(v.sku).trim())) return v.id;
    const vw = norm(v.label).split(/\s+/).filter((w) => w.length > 2);
    if (!vw.length) continue;
    const score = vw.filter((w) => words.has(w)).length / vw.length;
    if (!best || score > best.score) best = { id: v.id, score };
  }
  return best && best.score >= 0.5 ? best.id : null;
}

/** Inventory item whose keywords appear in the invoice line (accent/case-insensitive). */
function matchItem(desc: string, items: { id: string; keywords: string[] }[]) {
  const d = ` ${norm(desc)} `;
  let best: { id: string; len: number } | null = null;
  for (const it of items) {
    for (const k of it.keywords) {
      const kw = norm(k).trim();
      if (kw && d.includes(kw) && (!best || kw.length > best.len)) best = { id: it.id, len: kw.length };
    }
  }
  return best?.id ?? null;
}

/** Creates a draft document for an uploaded file and, when Gemini is configured, fills it in. */
export async function registerUpload(input: { path: string; fileName: string; mime: string; direction: "purchase" | "sale"; kind: "invoice" | "credit_note" }): Promise<Result> {
  const sb = await owner();
  const { data: doc, error } = await sb
    .from("accounting_docs")
    .insert({ direction: input.direction, kind: input.kind, file_path: input.path, file_name: input.fileName.slice(0, 200), category: input.direction === "purchase" ? "goods" : "other", date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error || !doc) return { ok: false, error: error?.message ?? "Não foi possível guardar." };
  if (!geminiConfigured()) return { ok: true, id: doc.id, message: "Ficheiro guardado. Preencha os dados." };

  try {
    const { data: file, error: dlErr } = await sb.storage.from("accounting").download(input.path);
    if (dlErr || !file) throw new Error(dlErr?.message ?? "download failed");
    const x = await extractInvoice(file, input.mime);
    const [{ data: vs }, { data: invItems }] = await Promise.all([
      sb.from("variants").select("id, sku, options, products!inner(name, status)").neq("products.status", "archived"),
      sb.from("inventory_items").select("id, keywords"),
    ]);
    const variants = (vs ?? []).map((v) => ({ id: v.id as string, sku: v.sku as string, label: `${(v.products as unknown as { name: { en: string } }).name.en} ${Object.values((v.options as Record<string, string>) ?? {}).join(" ")}` }));
    await sb
      .from("accounting_docs")
      .update({
        kind: x.kind === "credit_note" ? "credit_note" : input.kind,
        party_name: x.supplier_name || null,
        party_nif: cleanVatNumber(x.supplier_nif, x.supplier_country) || null,
        party_country: (x.supplier_country || "PT").slice(0, 2).toUpperCase(),
        number: x.number || null,
        date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : new Date().toISOString().slice(0, 10),
        net: c(x.net),
        vat: c(x.vat),
        total: c(x.total),
        vat_lines: (x.vat_lines ?? []).map((l) => ({ rate: Number(l.rate) || 0, base: c(l.base), vat: c(l.vat) })),
        extraction: x,
      })
      .eq("id", doc.id);
    if (x.lines?.length) {
      await sb.from("accounting_doc_lines").insert(
        x.lines.map((l, i) => ({
          doc_id: doc.id,
          position: i,
          description: (l.description || "").slice(0, 300),
          quantity: Number(l.quantity) || 1,
          unit_net: c(l.unit_net),
          vat_rate: Number(l.vat_rate) || 0,
          item_id: input.direction === "purchase" ? matchItem(l.description || "", (invItems ?? []) as { id: string; keywords: string[] }[]) : null,
          variant_id: input.direction === "purchase" && !matchItem(l.description || "", (invItems ?? []) as { id: string; keywords: string[] }[]) ? suggestVariant(l.description || "", variants) : null,
          apply_stock: input.direction === "purchase",
        })),
      );
    }
    const country = (x.supplier_country || "PT").slice(0, 2).toUpperCase();
    if (input.direction === "purchase" && country !== "PT" && x.supplier_nif) await runVies(sb, doc.id, country, x.supplier_nif);
    return { ok: true, id: doc.id, message: "Documento lido automaticamente. Confirme os dados." };
  } catch (e) {
    return { ok: true, id: doc.id, message: `Ficheiro guardado, mas a leitura automática falhou (${(e as Error).message}). Preencha os dados.` };
  }
}

async function runVies(sb: Awaited<ReturnType<typeof supabaseServer>>, id: string, country: string, nif: string) {
  if (purchaseRegime(country, 0) === "import") return null;
  const r = await checkVies(country, nif);
  if (r) await sb.from("accounting_docs").update({ vies_valid: r.valid, vies_name: r.name, vies_checked_at: new Date().toISOString() }).eq("id", id);
  return r;
}

/** Re-checks the supplier’s VAT number in VIES. */
export async function checkDocVies(id: string): Promise<Result> {
  const sb = await owner();
  const { data: d } = await sb.from("accounting_docs").select("party_country, party_nif").eq("id", id).single();
  if (!d?.party_nif || !d.party_country) return { ok: false, error: "Indique o país e o número de IVA do fornecedor." };
  const r = await runVies(sb, id, d.party_country, d.party_nif);
  revalidatePath(`/admin/accounting/docs/${id}`);
  if (!r) return { ok: false, error: "O serviço VIES não respondeu (acontece com frequência). Tente daqui a pouco." };
  return { ok: true, message: r.valid ? `Número de IVA válido${r.name ? `: ${r.name}` : ""}.` : "Número de IVA NÃO válido no VIES." };
}

export type DocInput = {
  kind: "invoice" | "credit_note" | "receipt" | "other";
  party_name: string;
  party_nif: string;
  party_country: string;
  number: string;
  date: string;
  net: number;
  vat: number;
  total: number;
  vat_lines: { rate: number; base: number; vat: number }[];
  category: string;
  deductible: boolean;
  notes: string;
  lines: { description: string; quantity: number; unit_net: number; vat_rate: number; variant_id: string | null; item_id?: string | null; apply_stock: boolean }[];
};

export async function saveDoc(id: string, d: DocInput): Promise<Result> {
  const sb = await owner();
  const { data: cur } = await sb.from("accounting_docs").select("status").eq("id", id).single();
  if (cur?.status === "confirmed") return { ok: false, error: "Documento confirmado. Anule a confirmação para editar." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return { ok: false, error: "Indique a data do documento." };
  const { error } = await sb
    .from("accounting_docs")
    .update({ kind: d.kind, party_name: d.party_name || null, party_nif: cleanVatNumber(d.party_nif, d.party_country) || null, party_country: d.party_country || "PT", number: d.number || null, date: d.date, net: d.net, vat: d.vat, total: d.total, vat_lines: d.vat_lines, category: d.category, deductible: d.deductible, notes: d.notes || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await sb.from("accounting_doc_lines").delete().eq("doc_id", id);
  if (d.lines.length) await sb.from("accounting_doc_lines").insert(d.lines.map((l, i) => ({ ...l, item_id: l.item_id ?? null, variant_id: l.item_id ? null : l.variant_id, doc_id: id, position: i })));
  revalidatePath(`/admin/accounting/docs/${id}`);
  revalidatePath("/admin/accounting");
  return { ok: true, message: "Guardado." };
}

/** Confirms a document. Purchases of goods add to stock and update the product cost (weighted average). */
export async function confirmDoc(id: string): Promise<Result> {
  const sb = await owner();
  const { data: doc } = await sb.from("accounting_docs").select("*, accounting_doc_lines(*)").eq("id", id).single();
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (!doc.date || !doc.total) return { ok: false, error: "Preencha a data e o total antes de confirmar." };
  let moved = 0;
  const vatIsCost = doc.direction === "purchase" && (!doc.deductible || purchaseRegime(doc.party_country, doc.vat) === "foreign_vat");
  if (doc.direction === "purchase" && doc.category === "goods" && !doc.stock_applied) {
    const sign = doc.kind === "credit_note" ? -1 : 1;
    for (const l of doc.accounting_doc_lines as { variant_id: string | null; item_id: string | null; apply_stock: boolean; quantity: number; unit_net: number; vat_rate: number }[]) {
      if (l.item_id && l.apply_stock) {
        const qty = Math.round(Number(l.quantity)) * sign;
        const unit = vatIsCost ? Math.round(l.unit_net * (1 + Number(l.vat_rate) / 100)) : l.unit_net;
        const { error } = await sb.rpc("receive_item", { p_item: l.item_id, p_qty: qty, p_unit_cost: unit, p_ref: doc.number ?? doc.id });
        if (error) return { ok: false, error: error.message };
        moved += Math.abs(qty);
        continue;
      }
      if (!l.variant_id || !l.apply_stock) continue;
      const qty = Math.round(Number(l.quantity)) * sign;
      if (!qty) continue;
      if (sign > 0) {
        const { data: v } = await sb.from("variants").select("stock, cost").eq("id", l.variant_id).single();
        const oldStock = Math.max(0, v?.stock ?? 0);
        const unit = vatIsCost ? Math.round(l.unit_net * (1 + Number(l.vat_rate) / 100)) : l.unit_net;
        const cost = v?.cost != null && oldStock > 0 ? Math.round((oldStock * v.cost + qty * unit) / (oldStock + qty)) : unit;
        await sb.from("variants").update({ cost }).eq("id", l.variant_id);
      }
      const { error } = await sb.rpc("adjust_stock", { p_variant: l.variant_id, p_qty: qty });
      if (error) return { ok: false, error: error.message };
      moved += Math.abs(qty);
    }
  }
  await sb.from("accounting_docs").update({ status: "confirmed", stock_applied: doc.stock_applied || moved > 0 }).eq("id", id);
  if (moved) invalidateCatalog();
  revalidatePath("/admin/accounting");
  revalidatePath(`/admin/accounting/docs/${id}`);
  return { ok: true, message: moved ? `Confirmado. Stock atualizado (${moved} unidade${moved === 1 ? "" : "s"}) e custos dos produtos recalculados.` : "Confirmado." };
}

/** Confirms several documents, one after the other; documents that fail are left as drafts and reported. */
export async function confirmDocs(ids: string[]): Promise<Result> {
  await owner();
  let ok = 0;
  const failed: string[] = [];
  for (const id of ids) {
    const r = await confirmDoc(id);
    if (r.ok) ok++;
    else failed.push(r.error);
  }
  revalidatePath("/admin/accounting");
  if (!failed.length) return { ok: true, message: `${ok} documento${ok === 1 ? "" : "s"} confirmado${ok === 1 ? "" : "s"}.` };
  const reasons = [...new Set(failed)].join(" ");
  return { ok: false, error: `${ok} confirmado${ok === 1 ? "" : "s"}, ${failed.length} por confirmar: ${reasons}` };
}

/** Back to draft; reverses the stock movement (product costs keep their last value). */
export async function unconfirmDoc(id: string): Promise<Result> {
  const sb = await owner();
  const { data: doc } = await sb.from("accounting_docs").select("*, accounting_doc_lines(*)").eq("id", id).single();
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (doc.stock_applied) {
    const sign = doc.kind === "credit_note" ? 1 : -1;
    for (const l of doc.accounting_doc_lines as { variant_id: string | null; item_id: string | null; apply_stock: boolean; quantity: number }[]) {
      if (l.item_id && l.apply_stock) await sb.rpc("receive_item", { p_item: l.item_id, p_qty: Math.round(Number(l.quantity)) * sign, p_unit_cost: null, p_ref: `anulação ${doc.number ?? ""}`.trim() });
      else if (l.variant_id && l.apply_stock) await sb.rpc("adjust_stock", { p_variant: l.variant_id, p_qty: Math.round(Number(l.quantity)) * sign });
    }
    invalidateCatalog();
  }
  await sb.from("accounting_docs").update({ status: "draft", stock_applied: false }).eq("id", id);
  revalidatePath("/admin/accounting");
  revalidatePath(`/admin/accounting/docs/${id}`);
  return { ok: true, message: doc.stock_applied ? "Voltou a rascunho e o stock foi revertido." : "Voltou a rascunho." };
}

export async function deleteDoc(id: string): Promise<Result> {
  const sb = await owner();
  const { data: doc } = await sb.from("accounting_docs").select("file_path, stock_applied").eq("id", id).single();
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (doc.stock_applied) {
    const r = await unconfirmDoc(id);
    if (!r.ok) return r;
  }
  if (doc.file_path) await sb.storage.from("accounting").remove([doc.file_path]);
  const { error } = await sb.from("accounting_docs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/accounting");
  return { ok: true, message: "Documento apagado." };
}

export async function setObligationDone(key: string, done: boolean): Promise<Result> {
  const sb = await owner();
  const { data } = await sb.from("settings").select("value").eq("key", "tax_done").maybeSingle();
  const cur = (data?.value ?? {}) as Record<string, string>;
  if (done) cur[key] = new Date().toISOString().slice(0, 10);
  else delete cur[key];
  await sb.from("settings").upsert({ key: "tax_done", value: cur, updated_at: new Date().toISOString() });
  revalidatePath("/admin/accounting");
  return { ok: true };
}
