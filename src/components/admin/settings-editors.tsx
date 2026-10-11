"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import type { PaymentKey, RateRow, Settings, ZoneSettings } from "@/lib/settings";
import type { ZoneId } from "@/lib/geo";
import { saveSetting } from "@/app/admin/(app)/content/actions";
import { inviteStaff, removeStaff, setStaffRole } from "@/app/admin/(app)/settings/actions";
import { LField, SaveRow, useSave } from "./fields";
import { Card } from "./ui";

const toEuros = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
const toCents = (s: string) => (s.trim() === "" ? null : Math.round(parseFloat(s.replace(",", ".")) * 100) || 0);

export function StoreEditor({ initial }: { initial: Settings["store"] }) {
  const [v, setV] = useState(initial);
  const s = useSave();
  const field = (k: keyof Settings["store"], label: string, type = "text") => (
    <div>
      <label htmlFor={`store-${k}`} className="label">{label}</label>
      <input id={`store-${k}`} type={type} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="field" />
    </div>
  );
  return (
    <Card title="Store details">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Store name")}
        {field("email", "Contact email", "email")}
        {field("nif", "NIF / VAT number")}
        {field("instagram", "Instagram URL", "url")}
        <div className="sm:col-span-2">{field("address", "Business address (shown on invoices, packing slips and legal pages)")}</div>
      </div>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("store", v))} />
    </Card>
  );
}

const zoneNames: Record<ZoneId, string> = { PT: "Portugal", EU: "European Union", UK: "United Kingdom", US: "United States", ROW: "Rest of the world" };
const profiles: [keyof ZoneSettings["rates"], string][] = [["small", "Small"], ["standard", "Standard"], ["statement", "Statement"], ["textile", "Bags"]];

export function ShippingEditor({ initial }: { initial: Settings["shipping"] }) {
  const [z, setZ] = useState(initial);
  const s = useSave();
  const set = (id: ZoneId, patch: Partial<ZoneSettings>) => setZ({ ...z, [id]: { ...z[id], ...patch } });
  return (
    <Card title="Shipping zones & rates" action={<span className="text-xs text-ink-soft">What customers pay at checkout</span>}>
      <h3 className="mb-1 text-sm font-semibold">Price by parcel weight</h3>
      <p className="mb-3 text-xs text-ink-soft">Used when every product in the cart has a weight (Analytics → Revenue & profit → Costs & weights), plus the box weight from Shipping & defaults. Started from the CTT price list: change any price, e.g. the US.</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(z) as ZoneId[]).map((id) => (
          <WeightTable key={id} label={zoneNames[id]} rows={z[id].weightRates ?? []} onChange={(rows) => set(id, { weightRates: rows })} />
        ))}
      </div>
      <h3 className="mb-1 text-sm font-semibold">Zones</h3>
      <p className="mb-3 text-xs text-ink-soft">Size-category prices are the fallback for carts with a product that has no weight yet (each extra item adds €1.50). Empty weight table = always size categories.</p>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-ink-soft">
            <tr>
              <th className="px-2 pb-2 font-medium">Zone</th>
              {profiles.map(([, l]) => <th key={l} className="px-2 pb-2 font-medium">{l}</th>)}
              <th className="px-2 pb-2 font-medium">Free over</th>
              <th className="px-2 pb-2 font-medium">Days</th>
              <th className="px-2 pb-2 font-medium">Carrier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(Object.keys(z) as ZoneId[]).map((id) => (
              <tr key={id}>
                <td className="px-2 py-2 font-medium whitespace-nowrap">{zoneNames[id]}</td>
                {profiles.map(([k, l]) => (
                  <td key={k} className="px-2 py-2">
                    <input aria-label={`${zoneNames[id]} ${l} rate`} inputMode="decimal" defaultValue={toEuros(z[id].rates[k])} onBlur={(e) => set(id, { rates: { ...z[id].rates, [k]: toCents(e.target.value) ?? 0 } })} className="field w-20 py-1.5 text-sm tabular-nums" />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <input aria-label={`${zoneNames[id]} free shipping threshold`} inputMode="decimal" placeholder="never" defaultValue={toEuros(z[id].freeOver)} onBlur={(e) => set(id, { freeOver: toCents(e.target.value) })} className="field w-24 py-1.5 text-sm tabular-nums" />
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <input aria-label={`${zoneNames[id]} min days`} type="number" min={0} value={z[id].days[0]} onChange={(e) => set(id, { days: [Number(e.target.value), z[id].days[1]] })} className="field inline w-14 py-1.5 text-sm" />
                  <span className="mx-1">–</span>
                  <input aria-label={`${zoneNames[id]} max days`} type="number" min={0} value={z[id].days[1]} onChange={(e) => set(id, { days: [z[id].days[0], Number(e.target.value)] })} className="field inline w-14 py-1.5 text-sm" />
                </td>
                <td className="px-2 py-2"><input aria-label={`${zoneNames[id]} carrier`} value={z[id].carrier} onChange={(e) => set(id, { carrier: e.target.value })} className="field w-32 py-1.5 text-sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-soft">Shipping profiles are set on each product (Products → Shipping & care). Express next-day in Portugal adds €5.</p>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("shipping", z))} />
    </Card>
  );
}

function WeightTable({ label, rows, onChange }: { label: string; rows: RateRow[]; onChange: (rows: RateRow[]) => void }) {
  return (
    <fieldset className="rounded-2xl bg-cream p-3">
      <legend className="sr-only">{label} price by weight</legend>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="mb-1 grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-ink-soft"><span>Up to g</span><span>Price €</span><span className="w-7" /></div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={`${i}-${r.upTo}-${r.price}`} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input aria-label={`${label} weight ${i + 1}`} inputMode="numeric" defaultValue={r.upTo} onBlur={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, upTo: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 } : x)).sort((a, b) => a.upTo - b.upTo))} className="field w-full py-1.5 text-right text-sm tabular-nums" />
            <input aria-label={`${label} price ${i + 1}`} inputMode="decimal" defaultValue={toEuros(r.price)} onBlur={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, price: toCents(e.target.value) ?? 0 } : x)))} className="field w-full py-1.5 text-right text-sm tabular-nums" />
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove ${label} row ${i + 1}`} className="grid h-7 w-7 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-ink-soft">No weight prices: size categories are used.</p>}
      </div>
      <button type="button" onClick={() => onChange([...rows, { upTo: (rows[rows.length - 1]?.upTo ?? 0) * 2 || 100, price: rows[rows.length - 1]?.price ?? 0 }])} className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-azulejo hover:bg-azulejo-tint"><Plus className="h-3.5 w-3.5" /> Add weight</button>
    </fieldset>
  );
}

export function VatEditor({ initial, countries }: { initial: Settings["vat"]; countries: { code: string; name: string; zone: string }[] }) {
  const [v, setV] = useState(initial);
  const s = useSave();
  return (
    <Card title="Taxes (VAT)">
      <p className="mb-4 text-sm text-ink-soft">
        Catalogue prices include Portuguese VAT (23%). EU shoppers pay the same price and the VAT is declared at their country’s rate through the <b>OSS</b> scheme. UK orders add UK VAT; the US and the rest of the world are exports with 0% EU VAT. Check these rates with your accountant.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((c) => (
          <li key={c.code} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span>{c.name} <span className="text-xs text-ink-soft">{c.zone}</span></span>
            <label className="flex items-center gap-1">
              <span className="sr-only">{c.name} VAT %</span>
              <input type="number" min={0} max={30} step={0.5} value={Math.round((v[c.code] ?? 0) * 1000) / 10} onChange={(e) => setV({ ...v, [c.code]: Number(e.target.value) / 100 })} className="field w-16 py-1 text-right text-sm tabular-nums" />%
            </label>
          </li>
        ))}
      </ul>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("vat", v))} />
    </Card>
  );
}

const paymentLabels: Record<PaymentKey, string> = { card: "Cards (Visa, Mastercard, Amex)", applepay: "Apple Pay", googlepay: "Google Pay", mbway: "MB WAY (Portugal)", multibanco: "Multibanco (Portugal)", paypal: "PayPal", klarna: "Klarna" };

export function PaymentsEditor({ initial, stripe }: { initial: Settings["payments"]; stripe: boolean }) {
  const [v, setV] = useState(initial);
  const s = useSave();
  return (
    <Card title="Payment methods">
      <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${stripe ? "bg-olive-tint" : "bg-mustard-tint"}`}>
        {stripe ? "Stripe is connected." : "Stripe isn’t connected yet, so checkout runs in demo mode. Add STRIPE_SECRET_KEY to .env.local to take real payments."}
      </p>
      <ul className="space-y-2">
        {(Object.keys(paymentLabels) as PaymentKey[]).map((k) => (
          <li key={k}>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              {paymentLabels[k]}
              <input type="checkbox" role="switch" checked={v[k]} disabled={k === "card"} onChange={(e) => setV({ ...v, [k]: e.target.checked })} className="h-5 w-5 accent-azulejo" />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-soft">Cards are always on. Each method must also be enabled in your Stripe dashboard.</p>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("payments", v))} />
    </Card>
  );
}

const emailNames: Record<keyof Settings["emails"], string> = { confirmation: "Order confirmation", shipped: "Order shipped", refund: "Refund issued" };

export function EmailsEditor({ initial, resend }: { initial: Settings["emails"]; resend: boolean }) {
  const [v, setV] = useState(initial);
  const s = useSave();
  return (
    <Card title="Email templates">
      <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${resend ? "bg-olive-tint" : "bg-mustard-tint"}`}>
        {resend ? "Resend is connected; emails are sent." : "Emails aren’t sent yet. Add RESEND_API_KEY to .env.local to send them."} Use <code>{"{number}"}</code> for the order number.
      </p>
      <div className="space-y-6">
        {(Object.keys(emailNames) as (keyof Settings["emails"])[]).map((k) => (
          <div key={k} className="space-y-3 rounded-2xl border border-line p-4">
            <p className="font-medium">{emailNames[k]}</p>
            <LField label="Subject" value={v[k].subject} onChange={(subject) => setV({ ...v, [k]: { ...v[k], subject } })} />
            <LField label="Opening text" value={v[k].intro} onChange={(intro) => setV({ ...v, [k]: { ...v[k], intro } })} multiline rows={2} />
          </div>
        ))}
      </div>
      <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSetting("emails", v))} />
    </Card>
  );
}

type Staff = { user_id: string; email: string; name: string | null; role: "owner" | "staff" };

export function StaffEditor({ staff, me }: { staff: Staff[]; me: string | null }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const s = useSave();
  return (
    <Card title="Staff & roles">
      <p className="mb-4 text-sm text-ink-soft"><b>Owner</b>: everything, including settings, refunds, deleting products and erasing customer data. <b>Staff</b>: orders, products, customers, content, journal and marketing.</p>
      <ul className="divide-y divide-line">
        {staff.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-azulejo text-white">{(m.name ?? m.email)[0].toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block font-medium">{m.name ?? m.email}{m.user_id === me && " (you)"}</span><span className="text-ink-soft">{m.email}</span></span>
            <select aria-label={`Role for ${m.email}`} value={m.role} disabled={m.user_id === me} onChange={(e) => s.run(() => setStaffRole(m.user_id, e.target.value as Staff["role"]))} className="field w-auto py-1.5 text-sm">
              <option value="staff">Staff</option><option value="owner">Owner</option>
            </select>
            {m.user_id !== me && <button onClick={() => confirm(`Remove admin access for ${m.email}?`) && s.run(() => removeStaff(m.user_id))} className="btn min-h-9 px-3 py-1 text-sm text-coral-ink hover:bg-coral-tint">Remove</button>}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid gap-2 rounded-2xl bg-cream p-4 sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); s.run(() => inviteStaff(email, name, role), () => { setEmail(""); setName(""); }); }}
      >
        <div><label htmlFor="inv-email" className="label">Email</label><input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field py-2 text-sm" /></div>
        <div><label htmlFor="inv-name" className="label">Name</label><input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} className="field py-2 text-sm" /></div>
        <div><label htmlFor="inv-role" className="label">Role</label><select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Staff["role"])} className="field py-2 text-sm"><option value="staff">Staff</option><option value="owner">Owner</option></select></div>
        <button disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm"><UserPlus className="h-4 w-4" /> Invite</button>
      </form>
      <div className="mt-3"><s.Status /></div>
    </Card>
  );
}
