"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Search, Trash2 } from "lucide-react";
import type { ProfitSettings } from "@/lib/settings";
import { addExpense, deleteExpense, saveOrderCosts, saveVariantCosts } from "@/app/admin/(app)/analytics/actions";
import { saveSetting } from "@/app/admin/(app)/content/actions";
import { useSave } from "./fields";
import { Card, eur } from "./ui";

const toCents = (s: string) => (s.trim() === "" ? null : Math.round((parseFloat(s.replace(",", ".")) || 0) * 100));
const euros = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

function Money({ label, value, onChange, placeholder, className }: { label: string; value: number | null; onChange: (c: number | null) => void; placeholder?: string; className?: string }) {
  const [text, setText] = useState(euros(value));
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const c = toCents(text);
        onChange(c);
        setText(euros(c));
      }}
      className={clsx("field py-1.5 text-sm tabular-nums", className)}
    />
  );
}

/* ------------------------------------------------------------------ Product costs */

export type CostRow = { id: string; product: string; variant: string; sku: string; price: number; cost: number | null; image?: string };

export function ProductCosts({ rows }: { rows: CostRow[] }) {
  const router = useRouter();
  const [costs, setCosts] = useState<Record<string, number | null>>(() => Object.fromEntries(rows.map((r) => [r.id, r.cost])));
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(rows.some((r) => r.cost == null));
  const s = useSave();
  const changed = rows.filter((r) => costs[r.id] !== r.cost);
  const shown = useMemo(
    () => rows.filter((r) => (!onlyMissing || r.cost == null) && (!q || `${r.product} ${r.variant} ${r.sku}`.toLowerCase().includes(q.toLowerCase()))),
    [rows, onlyMissing, q],
  );
  const setProduct = (product: string, cost: number | null) => setCosts((c) => ({ ...c, ...Object.fromEntries(rows.filter((r) => r.product === product).map((r) => [r.id, cost])) }));

  return (
    <Card title="Product costs" action={<span className="text-xs text-ink-soft">What one unit costs you (materials or purchase price)</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="field rounded-full py-2 pl-9 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4 accent-azulejo" /> Only without a cost ({rows.filter((r) => r.cost == null).length})</label>
      </div>
      <div className="-mx-2 max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="sticky top-0 bg-paper text-left text-xs text-ink-soft">
            <tr><th className="px-2 pb-2 font-medium">Product</th><th className="px-2 pb-2 font-medium">Variant</th><th className="px-2 pb-2 text-right font-medium">Price</th><th className="px-2 pb-2 font-medium">Cost €</th><th className="px-2 pb-2 text-right font-medium">Margin</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.slice(0, 300).map((r, i) => {
              const c = costs[r.id];
              const net = r.price / 1.23;
              const first = i === 0 || shown[i - 1].product !== r.product;
              return (
                <tr key={r.id}>
                  <td className="px-2 py-2">
                    {first && (
                      <span className="flex items-center gap-2">
                        {r.image && <span className="relative h-9 w-8 shrink-0 overflow-hidden rounded bg-cream-deep"><Image src={r.image} alt="" fill sizes="32px" className="object-cover" /></span>}
                        <span className="line-clamp-2 font-medium">{r.product}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-ink-soft">{r.variant || "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{eur(r.price, 2)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <Money key={`${r.id}-${c}`} label={`Cost of ${r.product} ${r.variant}`} value={c} onChange={(v) => setCosts((x) => ({ ...x, [r.id]: v }))} className={clsx("w-24", c == null && "border-coral/50")} />
                      {first && rows.filter((x) => x.product === r.product).length > 1 && (
                        <button type="button" onClick={() => setProduct(r.product, c)} title="Use this cost for every variant of this product" className="rounded-full px-2 py-1 text-xs text-azulejo hover:bg-azulejo-tint">all</button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-ink-soft">{c != null && net ? `${Math.round(((net - c) / net) * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-soft">Margin = price without VAT minus cost (before shipping and fees). “all” copies a cost to every variant of that product.</p>
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <button disabled={!changed.length || s.pending} onClick={() => s.run(() => saveVariantCosts(changed.map((r) => ({ id: r.id, cost: costs[r.id] }))), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">Save {changed.length || ""} cost{changed.length === 1 ? "" : "s"}</button>
        <s.Status />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ Default costs */

export function DefaultCosts({ initial, isOwner }: { initial: ProfitSettings; isOwner: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const s = useSave();
  const pct = (label: string, value: number, on: (n: number) => void) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1"><input aria-label={label} type="number" step="0.1" min={0} max={50} value={value} disabled={!isOwner} onChange={(e) => on(Number(e.target.value))} className="field w-20 py-1.5 text-right text-sm tabular-nums" />%</span>
    </label>
  );
  const money = (label: string, value: number, on: (n: number) => void) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1">€<Money label={label} value={value} onChange={(c) => on(c ?? 0)} className="w-20 text-right" /></span>
    </label>
  );
  return (
    <Card title="Default costs" action={<span className="text-xs text-ink-soft">Used when an order has no real cost entered</span>}>
      <div className="grid gap-6 md:grid-cols-3">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Shipping (CTT) per order</legend>
          {money("Portugal", p.shipping.PT, (n) => setP({ ...p, shipping: { ...p.shipping, PT: n } }))}
          {money("Rest of EU", p.shipping.EU, (n) => setP({ ...p, shipping: { ...p.shipping, EU: n } }))}
          {money("Outside the EU", p.shipping.ROW, (n) => setP({ ...p, shipping: { ...p.shipping, ROW: n } }))}
          <div className="pt-2">{money("Packaging per order", p.packaging, (n) => setP({ ...p, packaging: n }))}</div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Etsy fees</legend>
          {pct("Transaction fee", p.etsy.transactionPct, (n) => setP({ ...p, etsy: { ...p.etsy, transactionPct: n } }))}
          {pct("Payment processing", p.etsy.processingPct, (n) => setP({ ...p, etsy: { ...p.etsy, processingPct: n } }))}
          {money("+ fixed per order", p.etsy.processingFixed, (n) => setP({ ...p, etsy: { ...p.etsy, processingFixed: n } }))}
          {money("Listing renewal per item sold", p.etsy.listingFee, (n) => setP({ ...p, etsy: { ...p.etsy, listingFee: n } }))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Website payments (Stripe)</legend>
          {pct("Card fee", p.stripe.pct, (n) => setP({ ...p, stripe: { ...p.stripe, pct: n } }))}
          {money("+ fixed per order", p.stripe.fixed, (n) => setP({ ...p, stripe: { ...p.stripe, fixed: n } }))}
          <p className="pt-2 text-xs text-ink-soft">Etsy rates shown are typical for a Portuguese shop. Check your Etsy payment account and adjust. Offsite Ads aren’t included; add them under expenses.</p>
        </fieldset>
      </div>
      {isOwner && (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <button disabled={s.pending} onClick={() => s.run(() => saveSetting("profit", p), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">Save defaults</button>
          <s.Status />
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Expenses */

const categories = [["materials", "Materials & supplies"], ["subscriptions", "Subscriptions (Moloni, hosting…)"], ["marketing", "Marketing & ads"], ["packaging", "Packaging stock"], ["shipping", "Shipping not linked to an order"], ["other", "Other"]];

export type ExpenseRow = { id: string; date: string; description: string; category: string; amount: number };

export function Expenses({ rows, defaultDate }: { rows: ExpenseRow[]; defaultDate: string }) {
  const router = useRouter();
  const [f, setF] = useState({ date: defaultDate, description: "", category: "subscriptions", amount: "" });
  const s = useSave();
  const label = (c: string) => categories.find(([k]) => k === c)?.[1] ?? c;
  return (
    <Card title="Other expenses" action={<span className="text-xs text-ink-soft">In this period · {eur(rows.reduce((n, r) => n + r.amount, 0), 2)}</span>}>
      <form
        className="mb-4 grid gap-2 rounded-2xl bg-cream p-3 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          s.run(() => addExpense({ ...f, amount: toCents(f.amount) ?? 0 }), () => { setF({ ...f, description: "", amount: "" }); router.refresh(); });
        }}
      >
        <div><label htmlFor="ex-date" className="label">Date</label><input id="ex-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="field py-2 text-sm" /></div>
        <div><label htmlFor="ex-desc" className="label">Description</label><input id="ex-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Moloni subscription" className="field py-2 text-sm" /></div>
        <div><label htmlFor="ex-cat" className="label">Category</label><select id="ex-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="field w-auto py-2 text-sm">{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label htmlFor="ex-amt" className="label">Amount €</label><input id="ex-amt" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="field w-28 py-2 text-sm tabular-nums" /></div>
        <button disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> Add</button>
      </form>
      {rows.length ? (
        <ul className="divide-y divide-line text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span className="w-24 shrink-0 text-ink-soft">{new Date(`${r.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span className="flex-1">{r.description}<span className="block text-xs text-ink-soft">{label(r.category)}</span></span>
              <span className="tabular-nums">{eur(r.amount, 2)}</span>
              <button onClick={() => confirm("Delete this expense?") && s.run(() => deleteExpense(r.id), () => router.refresh())} aria-label="Delete expense" className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No other expenses in this period.</p>
      )}
      <div className="mt-2"><s.Status /></div>
    </Card>
  );
}

/* ------------------------------------------------------------------ Order costs (order page) */

export function OrderCosts({ orderId, real, estimate, profit }: { orderId: string; real: { shipping: number | null; packaging: number | null; fees: number | null }; estimate: { shipping: number; packaging: number; fees: number }; profit: { revenue: number; cogs: number; profit: number; missingCost: number } }) {
  const router = useRouter();
  const [c, setC] = useState(real);
  const s = useSave();
  const row = (k: "shipping" | "packaging" | "fees", label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Money label={label} value={c[k]} placeholder={(estimate[k] / 100).toFixed(2)} onChange={(v) => setC({ ...c, [k]: v })} className="w-24 text-right" />
    </label>
  );
  return (
    <div className="space-y-2">
      {row("shipping", "Shipping label (CTT)")}
      {row("packaging", "Packaging")}
      {row("fees", "Fees (Etsy / payment)")}
      <p className="text-xs text-ink-soft">Grey values are estimates from your defaults. Type the real amount to replace them.</p>
      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Revenue (excl. VAT & Etsy tax)</dt><dd className="tabular-nums">{eur(profit.revenue, 2)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Product cost</dt><dd className="tabular-nums">{profit.missingCost ? <span className="text-coral-ink">not set</span> : `−${eur(profit.cogs, 2)}`}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Shipping, packaging & fees</dt><dd className="tabular-nums">−{eur((c.shipping ?? estimate.shipping) + (c.packaging ?? estimate.packaging) + (c.fees ?? estimate.fees), 2)}</dd></div>
        <div className="flex justify-between pt-1 font-semibold"><dt>Profit</dt><dd className={clsx("tabular-nums", profit.profit < 0 && "text-coral-ink")}>{eur(profit.revenue - profit.cogs - ((c.shipping ?? estimate.shipping) + (c.packaging ?? estimate.packaging) + (c.fees ?? estimate.fees)), 2)}</dd></div>
      </dl>
      <div className="flex items-center gap-3 pt-2">
        <button disabled={s.pending} onClick={() => s.run(() => saveOrderCosts(orderId, c), () => router.refresh())} className="btn-outline min-h-9 py-1.5 text-sm">Save costs</button>
        <s.Status />
      </div>
    </div>
  );
}
