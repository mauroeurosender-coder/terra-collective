"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Search, Trash2 } from "lucide-react";
import type { CarrierRates, DutyRule, ProfitSettings, RateRow, RateZone } from "@/lib/settings";
import type { OrderProfit } from "@/lib/admin/profit";
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

function Grams({ label, value, onChange, className }: { label: string; value: number | null; onChange: (g: number | null) => void; className?: string }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => onChange(text === "" ? null : Number(text))}
      className={clsx("field py-1.5 text-sm tabular-nums", className)}
    />
  );
}

/* ------------------------------------------------------------------ Product costs */

export type CostRow = { id: string; product: string; variant: string; sku: string; price: number; cost: number | null; weight: number | null; image?: string };

export function ProductCosts({ rows }: { rows: CostRow[] }) {
  const router = useRouter();
  const [costs, setCosts] = useState<Record<string, number | null>>(() => Object.fromEntries(rows.map((r) => [r.id, r.cost])));
  const [weights, setWeights] = useState<Record<string, number | null>>(() => Object.fromEntries(rows.map((r) => [r.id, r.weight])));
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(rows.some((r) => r.cost == null || r.weight == null));
  const s = useSave();
  const changed = rows.filter((r) => costs[r.id] !== r.cost || weights[r.id] !== r.weight);
  const shown = useMemo(
    () => rows.filter((r) => (!onlyMissing || r.cost == null || r.weight == null) && (!q || `${r.product} ${r.variant} ${r.sku}`.toLowerCase().includes(q.toLowerCase()))),
    [rows, onlyMissing, q],
  );
  const ofProduct = (product: string) => rows.filter((r) => r.product === product).map((r) => r.id);
  const setProduct = (product: string, cost: number | null) => setCosts((c) => ({ ...c, ...Object.fromEntries(ofProduct(product).map((id) => [id, cost])) }));
  const setProductWeight = (product: string, w: number | null) => setWeights((c) => ({ ...c, ...Object.fromEntries(ofProduct(product).map((id) => [id, w])) }));

  return (
    <Card title="Product costs & weights" action={<span className="text-xs text-ink-soft">What one unit costs you, and what it weighs packed</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="field rounded-full py-2 pl-9 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4 accent-azulejo" /> Only missing cost or weight ({rows.filter((r) => r.cost == null || r.weight == null).length})</label>
      </div>
      <div className="-mx-2 max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="sticky top-0 bg-paper text-left text-xs text-ink-soft">
            <tr><th className="px-2 pb-2 font-medium">Product</th><th className="px-2 pb-2 font-medium">Variant</th><th className="px-2 pb-2 text-right font-medium">Price</th><th className="px-2 pb-2 font-medium">Cost €</th><th className="px-2 pb-2 font-medium">Weight g</th><th className="px-2 pb-2 text-right font-medium">Margin</th></tr>
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
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <Grams key={`${r.id}-w-${weights[r.id]}`} label={`Weight of ${r.product} ${r.variant}`} value={weights[r.id]} onChange={(v) => setWeights((x) => ({ ...x, [r.id]: v }))} className={clsx("w-20", weights[r.id] == null && "border-coral/50")} />
                      {first && rows.filter((x) => x.product === r.product).length > 1 && (
                        <button type="button" onClick={() => setProductWeight(r.product, weights[r.id])} title="Use this weight for every variant of this product" className="rounded-full px-2 py-1 text-xs text-azulejo hover:bg-azulejo-tint">all</button>
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
      <p className="mt-2 text-xs text-ink-soft">Margin = price without VAT minus cost (before shipping and fees). Weight = one unit ready to ship, in grams (e.g. a sardine 50). It picks the price bracket in your CTT/FedEx tables. “all” copies a value to every variant of that product.</p>
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <button disabled={!changed.length || s.pending} onClick={() => s.run(() => saveVariantCosts(changed.map((r) => ({ id: r.id, cost: costs[r.id], weight: weights[r.id] }))), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">Save {changed.length || ""} change{changed.length === 1 ? "" : "s"}</button>
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
          <legend className="mb-2 text-sm font-semibold">Flat shipping (when weight is unknown)</legend>
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
      <RateTables p={p} setP={setP} disabled={!isOwner} />
      {isOwner && (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <button disabled={s.pending} onClick={() => s.run(() => saveSetting("profit", p), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">Save shipping & defaults</button>
          <s.Status />
        </div>
      )}
    </Card>
  );
}

const ZONES: [RateZone, string][] = [["PT", "Portugal"], ["EUROPE", "Europe"], ["US", "USA"], ["ROW", "Rest of the world"]];

function RateTables({ p, setP, disabled }: { p: ProfitSettings; setP: (p: ProfitSettings) => void; disabled: boolean }) {
  const [carrier, setCarrier] = useState<"ctt" | "fedex">("ctt");
  const c = p.carriers[carrier];
  const setRows = (z: RateZone, rows: RateRow[]) => setP({ ...p, carriers: { ...p.carriers, [carrier]: { ...c, zones: { ...c.zones, [z]: rows } } as CarrierRates } });
  const setDuty = (i: number, d: Partial<DutyRule>) => setP({ ...p, duties: p.duties.map((x, j) => (j === i ? { ...x, ...d } : x)) });
  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">Shipping price tables</h3>
        <div className="flex gap-1 rounded-full bg-cream p-1 text-sm" role="tablist">
          {(["ctt", "fedex"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={carrier === k} onClick={() => setCarrier(k)} className={clsx("rounded-full px-3 py-1", carrier === k ? "bg-ink text-cream" : "text-ink-soft")}>{p.carriers[k].name}</button>
          ))}
        </div>
        <span className="text-xs text-ink-soft">Weight up to (g) → price you pay (€). Empty table = flat amount above.</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ZONES.map(([z, label]) => {
          const rows = c.zones[z] ?? [];
          return (
            <fieldset key={`${carrier}-${z}`} className="rounded-2xl bg-cream p-3">
              <legend className="sr-only">{c.name} {label}</legend>
              <p className="mb-2 text-sm font-medium">{label}</p>
              <div className="mb-1 grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-ink-soft"><span>Up to g</span><span>Price €</span><span className="w-7" /></div>
              <div className="space-y-1.5">
                {rows.map((r, i) => (
                  <div key={`${i}-${r.upTo}-${r.price}`} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <Grams label={`${label} weight ${i + 1}`} value={r.upTo} onChange={(g) => setRows(z, rows.map((x, j) => (j === i ? { ...x, upTo: g ?? 0 } : x)).sort((a, b) => a.upTo - b.upTo))} className="w-full text-right" />
                    <Money label={`${label} price ${i + 1}`} value={r.price} onChange={(v) => setRows(z, rows.map((x, j) => (j === i ? { ...x, price: v ?? 0 } : x)))} className="w-full text-right" />
                    <button type="button" disabled={disabled} onClick={() => setRows(z, rows.filter((_, j) => j !== i))} aria-label={`Remove ${label} row ${i + 1}`} className="grid h-7 w-7 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <button type="button" disabled={disabled} onClick={() => setRows(z, [...rows, { upTo: (rows[rows.length - 1]?.upTo ?? 0) * 2 || 100, price: rows[rows.length - 1]?.price ?? 0 }])} className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-azulejo hover:bg-azulejo-tint"><Plus className="h-3.5 w-3.5" /> Add weight</button>
            </fieldset>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Parcels heavier than the last row are counted as several parcels. Europe = EU plus UK, Switzerland, Norway and the rest of Europe.</p>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Parcel</legend>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Box & filling weight added to every order</span>
            <span className="flex items-center gap-1"><Grams label="Packaging weight" value={p.packagingWeight} onChange={(g) => setP({ ...p, packagingWeight: g ?? 0 })} className="w-20 text-right" />g</span>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Use FedEx for orders heavier than (empty = always CTT)</span>
            <span className="flex items-center gap-1"><Grams label="FedEx above" value={p.bulkAboveGrams} onChange={(g) => setP({ ...p, bulkAboveGrams: g })} className="w-20 text-right" />g</span>
          </label>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Import duties you pay up front</legend>
          {p.duties.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <input aria-label="Country code" value={d.country} maxLength={2} disabled={disabled} onChange={(e) => setDuty(i, { country: e.target.value.toUpperCase() })} className="field w-14 py-1.5 text-center text-sm uppercase" />
              <input aria-label="Description" value={d.label} disabled={disabled} onChange={(e) => setDuty(i, { label: e.target.value })} className="field min-w-32 flex-1 py-1.5 text-sm" />
              <span className="flex items-center gap-1"><input aria-label="Duty %" type="number" step="0.1" min={0} max={100} value={d.pct} disabled={disabled} onChange={(e) => setDuty(i, { pct: Number(e.target.value) })} className="field w-16 py-1.5 text-right text-sm tabular-nums" />%</span>
              <span className="flex items-center gap-1">+ €<Money label="Fixed fee per order" value={d.fixed} onChange={(c) => setDuty(i, { fixed: c ?? 0 })} className="w-16 text-right" /></span>
              <button type="button" disabled={disabled} onClick={() => setP({ ...p, duties: p.duties.filter((_, j) => j !== i) })} aria-label="Remove duty rule" className="grid h-7 w-7 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button type="button" disabled={disabled} onClick={() => setP({ ...p, duties: [...p.duties, { country: "", pct: 0, fixed: 0, label: "Import duties" }] })} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-azulejo hover:bg-azulejo-tint"><Plus className="h-3.5 w-3.5" /> Add country</button>
          <p className="text-xs text-ink-soft">% of the products’ value (after discounts, without shipping), for every order shipped to that country. Real amounts can be typed on each order.</p>
        </fieldset>
      </div>
    </div>
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

export function OrderCosts({ orderId, real, estimate, profit, ship }: { orderId: string; real: { shipping: number | null; packaging: number | null; fees: number | null; duties: number | null }; estimate: { shipping: number; packaging: number; fees: number; duties: number }; profit: { revenue: number; cogs: number; profit: number; missingCost: number }; ship: OrderProfit["ship"] }) {
  const router = useRouter();
  const [c, setC] = useState(real);
  const s = useSave();
  const other = (c.shipping ?? estimate.shipping) + (c.packaging ?? estimate.packaging) + (c.fees ?? estimate.fees) + (c.duties ?? estimate.duties);
  const row = (k: "shipping" | "packaging" | "fees" | "duties", label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Money label={label} value={c[k]} placeholder={(estimate[k] / 100).toFixed(2)} onChange={(v) => setC({ ...c, [k]: v })} className="w-24 text-right" />
    </label>
  );
  return (
    <div className="space-y-2">
      {row("shipping", "Shipping label")}
      <p className="-mt-1 text-xs text-ink-soft">
        {ship.basis === "table" && ship.grams != null ? `Estimate: ${ship.grams} g → ${ship.carrier} up to ${ship.bracket} g${ship.grams > (ship.bracket ?? 0) ? " (several parcels)" : ""}` : ship.missingWeight ? `Estimate is the flat amount: ${ship.missingWeight} item${ship.missingWeight === 1 ? " has" : "s have"} no weight yet` : ship.basis === "flat" ? "Estimate is the flat amount: no price table for this destination" : null}
      </p>
      {row("packaging", "Packaging")}
      {row("fees", "Fees (Etsy / payment)")}
      {(estimate.duties > 0 || c.duties != null) && row("duties", "Import duties (Zonos)")}
      <p className="text-xs text-ink-soft">Grey values are estimates from your defaults. Type the real amount to replace them.</p>
      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Revenue (excl. VAT & Etsy tax)</dt><dd className="tabular-nums">{eur(profit.revenue, 2)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Product cost</dt><dd className="tabular-nums">{profit.missingCost ? <span className="text-coral-ink">not set</span> : `−${eur(profit.cogs, 2)}`}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Shipping, packaging, fees & duties</dt><dd className="tabular-nums">−{eur(other, 2)}</dd></div>
        <div className="flex justify-between pt-1 font-semibold"><dt>Profit</dt><dd className={clsx("tabular-nums", profit.revenue - profit.cogs - other < 0 && "text-coral-ink")}>{eur(profit.revenue - profit.cogs - other, 2)}</dd></div>
      </dl>
      <div className="flex items-center gap-3 pt-2">
        <button disabled={s.pending} onClick={() => s.run(() => saveOrderCosts(orderId, c), () => router.refresh())} className="btn-outline min-h-9 py-1.5 text-sm">Save costs</button>
        <s.Status />
      </div>
    </div>
  );
}
