"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, Plus, Trash2 } from "lucide-react";
import { countItem, deleteItem, saveItem, setComponent } from "@/app/admin/(app)/inventory/actions";
import { useSave } from "./fields";
import { Card, eur } from "./ui";

export type InvItem = {
  id: string;
  name: string;
  sku: string | null;
  keywords: string[];
  stock: number;
  unit_cost: number | null;
  low_stock: number;
  notes: string | null;
  uses: { variantId: string; label: string; qty: number; canMake: number }[];
  movements: { qty: number; reason: string; ref: string | null; at: string }[];
};
type VariantOpt = { id: string; label: string };

const reasonPt: Record<string, string> = { purchase: "Compra", credit_note: "Nota de crédito", sale: "Venda", return: "Devolução", adjust: "Ajuste" };
const toC = (s: string) => (s.trim() === "" ? null : Math.round((parseFloat(s.replace(",", ".")) || 0) * 100));

export function InventoryEditor({ items, variants, isOwner }: { items: InvItem[]; variants: VariantOpt[]; isOwner: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(items.length === 0);
  const totalValue = items.reduce((n, i) => n + (i.unit_cost ?? 0) * Math.max(0, i.stock), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Artigos" value={String(items.length)} />
        <Stat label="Valor do inventário (ao custo)" value={eur(totalValue)} />
        <Stat label="Com stock baixo" value={String(items.filter((i) => i.stock <= i.low_stock).length)} warn={items.some((i) => i.stock <= i.low_stock)} />
      </div>
      <Card title="Artigos de inventário" action={<button onClick={() => setAdding((v) => !v)} className="btn-outline min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Novo artigo</button>}>
        {adding && <ItemForm onDone={() => setAdding(false)} />}
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{i.name}</span>
                  <span className="text-xs text-ink-soft">{i.keywords.length ? `Palavras-chave: ${i.keywords.join(", ")}` : "Sem palavras-chave"}{i.uses.length ? ` · usado em ${i.uses.length} variante${i.uses.length === 1 ? "" : "s"}` : " · ainda não usado em produtos"}</span>
                </span>
                <span className="text-right text-sm tabular-nums">
                  <span className={clsx("block font-semibold", i.stock <= i.low_stock && "text-coral-ink")}>{i.stock} un.</span>
                  <span className="text-xs text-ink-soft">{i.unit_cost != null ? `${eur(i.unit_cost, 2)}/un.` : "sem custo"}</span>
                </span>
                <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ink-soft transition", open === i.id && "rotate-180")} />
              </button>
              {open === i.id && <ItemDetail item={i} variants={variants} isOwner={isOwner} />}
            </li>
          ))}
        </ul>
        {items.length === 0 && !adding && <p className="text-sm text-ink-soft">Ainda não há artigos.</p>}
      </Card>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={clsx("headline mt-1 text-2xl tabular-nums", warn && "text-coral-ink")}>{value}</p>
    </div>
  );
}

function ItemForm({ item, onDone }: { item?: InvItem; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ name: item?.name ?? "", sku: item?.sku ?? "", keywords: item?.keywords.join(", ") ?? "", cost: item?.unit_cost != null ? (item.unit_cost / 100).toFixed(2) : "", low: item?.low_stock ?? 5, notes: item?.notes ?? "" });
  const s = useSave();
  return (
    <form
      className="mb-4 grid gap-3 rounded-2xl bg-cream p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        s.run(() => saveItem({ id: item?.id, name: f.name, sku: f.sku, keywords: f.keywords, unit_cost: toC(f.cost), low_stock: Number(f.low) || 0, notes: f.notes }), () => { onDone?.(); router.refresh(); });
      }}
    >
      <div><label className="label" htmlFor={`in-${item?.id ?? "new"}`}>Nome</label><input id={`in-${item?.id ?? "new"}`} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex: Baralho de cartas (lata)" className="field py-2 text-sm" /></div>
      <div><label className="label" htmlFor={`is-${item?.id ?? "new"}`}>SKU (opcional)</label><input id={`is-${item?.id ?? "new"}`} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} className="field py-2 text-sm" /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`ik-${item?.id ?? "new"}`}>Palavras-chave nas faturas de compra</label>
        <input id={`ik-${item?.id ?? "new"}`} value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} placeholder="ex: latas, cartas, baralho, deck" className="field py-2 text-sm" />
        <p className="mt-1 text-xs text-ink-soft">Separadas por vírgulas. Se uma linha de uma fatura de compra contiver uma destas palavras, é ligada a este artigo automaticamente.</p>
      </div>
      <div><label className="label" htmlFor={`ic-${item?.id ?? "new"}`}>Custo unitário € (sem IVA)</label><input id={`ic-${item?.id ?? "new"}`} inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="atualiza sozinho com as compras" className="field py-2 text-sm tabular-nums" /></div>
      <div><label className="label" htmlFor={`il-${item?.id ?? "new"}`}>Alerta de stock baixo (unidades)</label><input id={`il-${item?.id ?? "new"}`} type="number" min={0} value={f.low} onChange={(e) => setF({ ...f, low: Number(e.target.value) })} className="field py-2 text-sm" /></div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <button disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm">{item ? "Guardar" : "Criar artigo"}</button>
        {onDone && !item && <button type="button" onClick={onDone} className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">Cancelar</button>}
        <s.Status />
      </div>
    </form>
  );
}

function ItemDetail({ item, variants, isOwner }: { item: InvItem; variants: VariantOpt[]; isOwner: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(String(item.stock));
  const [note, setNote] = useState("");
  const [newVariant, setNewVariant] = useState("");
  const [newQty, setNewQty] = useState(1);
  const s = useSave();
  const used = new Set(item.uses.map((u) => u.variantId));
  return (
    <div className="mb-4 space-y-4 rounded-2xl border border-line p-4">
      <ItemForm item={item} />

      <div>
        <p className="mb-2 text-sm font-semibold">Usado nestes produtos</p>
        {item.uses.length ? (
          <ul className="divide-y divide-line text-sm">
            {item.uses.map((u) => (
              <li key={u.variantId} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1">{u.label}<span className="block text-xs text-ink-soft">dá para vender {u.canMake}</span></span>
                <label className="flex items-center gap-1 text-xs">usa
                  <input aria-label={`Quantidade em ${u.label}`} type="number" min={1} defaultValue={u.qty} onBlur={(e) => Number(e.target.value) !== u.qty && s.run(() => setComponent(u.variantId, item.id, Number(e.target.value)), () => router.refresh())} className="field w-16 py-1 text-sm" />
                un.</label>
                <button onClick={() => s.run(() => setComponent(u.variantId, item.id, 0), () => router.refresh())} aria-label="Remover" className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Ainda não está ligado a nenhum produto. Sem isso, as vendas não descontam este artigo.</p>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1">
            <label className="label" htmlFor={`nv-${item.id}`}>Adicionar produto que usa este artigo</label>
            <select id={`nv-${item.id}`} value={newVariant} onChange={(e) => setNewVariant(e.target.value)} className="field py-2 text-sm">
              <option value="">Escolher produto / variante…</option>
              {variants.filter((v) => !used.has(v.id)).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor={`nq-${item.id}`}>Unidades</label><input id={`nq-${item.id}`} type="number" min={1} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="field w-20 py-2 text-sm" /></div>
          <button disabled={!newVariant || s.pending} onClick={() => s.run(() => setComponent(newVariant, item.id, newQty), () => { setNewVariant(""); setNewQty(1); router.refresh(); })} className="btn-outline min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Adicionar</button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <div><label className="label" htmlFor={`ct-${item.id}`}>Contagem de stock</label><input id={`ct-${item.id}`} type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} className="field w-28 py-2 text-sm tabular-nums" /></div>
        <div className="min-w-48 flex-1"><label className="label" htmlFor={`cn-${item.id}`}>Nota</label><input id={`cn-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex: inventário de outubro" className="field py-2 text-sm" /></div>
        <button disabled={s.pending || Number(count) === item.stock} onClick={() => s.run(() => countItem(item.id, Number(count), note), () => router.refresh())} className="btn-outline min-h-10 py-2 text-sm">Atualizar stock</button>
      </div>

      {item.movements.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Movimentos recentes</p>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto text-sm">
            {item.movements.map((m, k) => (
              <li key={k} className="flex items-center gap-3 py-1.5">
                <span className="w-28 shrink-0 text-xs text-ink-soft">{new Date(m.at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex-1">{reasonPt[m.reason] ?? m.reason}{m.ref ? ` · ${m.ref}` : ""}</span>
                <span className={clsx("font-semibold tabular-nums", m.qty < 0 ? "text-coral-ink" : "text-olive")}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.stock <= item.low_stock && <p className="flex items-center gap-2 text-sm text-coral-ink"><AlertTriangle className="h-4 w-4" /> Stock baixo: {item.stock} un.</p>}
      {isOwner && <button onClick={() => confirm(`Apagar "${item.name}"? Os produtos deixam de o usar.`) && s.run(() => deleteItem(item.id), () => router.refresh())} className="btn min-h-9 px-3 py-1.5 text-sm text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /> Apagar artigo</button>}
      <s.Status />
    </div>
  );
}
