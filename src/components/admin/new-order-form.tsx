"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createManualOrder, type ManualOrderInput } from "@/app/admin/(app)/orders/new/actions";
import { Card, eur } from "./ui";

export type PickerProduct = { id: string; name: string; image?: string; variants: { id: string; label: string; price: number; stock: number }[] };

const toCents = (s: string) => Math.round((parseFloat(s.replace(",", ".")) || 0) * 100);
const payments = [
  ["card", "Card"],
  ["mbway", "MB WAY"],
  ["multibanco", "Multibanco"],
  ["transfer", "Bank transfer"],
  ["cash", "Cash"],
  ["paypal", "PayPal"],
  ["other", "Other"],
];

export function NewOrderForm({ products, countries, initialChannel = "manual" }: { products: PickerProduct[]; countries: { code: string; name: string }[]; initialChannel?: "manual" | "faire" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Omit<ManualOrderInput, "lines" | "shipping" | "discount">>({
    email: "", noEmail: false, firstName: "", lastName: "", phone: "", country: "PT", address1: "", postal: "", city: "", nif: "", locale: "pt",
    paymentMethod: "mbway", paid: true, giftMessage: "", note: "", test: false,
    channel: initialChannel, company: "", faireOrder: "", commissionPct: 15,
  });
  const faire = f.channel === "faire";
  const [lines, setLines] = useState<{ productId: string; variantId: string; quantity: number; price: string }[]>([{ productId: "", variantId: "", quantity: 1, price: "" }]);
  const [shipping, setShipping] = useState("0");
  const [discount, setDiscount] = useState("0");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const variantOf = (l: (typeof lines)[number]) => products.find((p) => p.id === l.productId)?.variants.find((v) => v.id === l.variantId);
  const subtotal = useMemo(() => lines.reduce((n, l) => n + (l.price ? toCents(l.price) : variantOf(l)?.price ?? 0) * l.quantity, 0), [lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Math.max(0, subtotal - toCents(discount)) + toCents(shipping);

  const field = (k: "email" | "firstName" | "lastName" | "phone" | "address1" | "postal" | "city" | "nif", label: string, type = "text") => (
    <div>
      <label htmlFor={`no-${k}`} className="label">{label}</label>
      <input id={`no-${k}`} type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} disabled={k === "email" && f.noEmail} className="field" />
    </div>
  );

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await createManualOrder({
        ...f,
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.price ? toCents(l.price) : null })),
        shipping: toCents(shipping),
        discount: toCents(discount),
      });
      if (!r.ok) return setError(r.error);
      router.push(`/admin/orders/${r.id}`);
    });

  return (
    <div className="grid gap-4 pb-10 lg:grid-cols-[1.6fr_1fr]">
      <div className="min-w-0 space-y-4">
        <Card title="Channel">
          <div role="radiogroup" aria-label="Channel" className="grid grid-cols-2 gap-1.5">
            <button type="button" role="radio" aria-checked={!faire} onClick={() => set("channel", "manual")} className="chip min-h-10 text-sm">Direct sale (market, DM, transfer…)</button>
            <button type="button" role="radio" aria-checked={faire} onClick={() => { set("channel", "faire"); set("locale", "en"); set("paid", true); }} className="chip min-h-10 text-sm">Faire (wholesale, B2B)</button>
          </div>
          {faire && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
              <div><label htmlFor="no-fo" className="label">Faire order number</label><input id="no-fo" value={f.faireOrder} onChange={(e) => set("faireOrder", e.target.value)} placeholder="e.g. BNXYZ12345" className="field" /></div>
              <div><label htmlFor="no-co" className="label">Retailer (company)</label><input id="no-co" value={f.company} onChange={(e) => set("company", e.target.value)} className="field" /></div>
              <div><label htmlFor="no-cm" className="label">Faire commission %</label><input id="no-cm" type="number" min={0} max={100} step={0.5} value={f.commissionPct} onChange={(e) => set("commissionPct", Number(e.target.value))} className="field tabular-nums" /></div>
              <p className="text-xs text-ink-soft sm:col-span-3">Enter wholesale prices. The commission counts as a cost in profit (usually 15%; higher on a retailer’s first order). EU retailers: the VAT number is checked with VIES; if valid, the sale is an intra-EU supply without Portuguese VAT.</p>
            </div>
          )}
        </Card>

        <Card title="Products">
          <ul className="space-y-3">
            {lines.map((l, i) => {
              const p = products.find((x) => x.id === l.productId);
              const v = variantOf(l);
              const update = (patch: Partial<typeof l>) => setLines(lines.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <li key={i} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[48px_1.4fr_1fr_80px_96px_auto] sm:items-end">
                  <span className="relative hidden h-14 w-12 overflow-hidden rounded-lg bg-cream-deep sm:block">{p?.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                  <div>
                    <label className="label" htmlFor={`p-${i}`}>Product</label>
                    <select id={`p-${i}`} value={l.productId} onChange={(e) => { const np = products.find((x) => x.id === e.target.value); update({ productId: e.target.value, variantId: np?.variants[0]?.id ?? "", price: "" }); }} className="field py-2 text-sm">
                      <option value="">Choose…</option>
                      {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`v-${i}`}>Variant</label>
                    <select id={`v-${i}`} value={l.variantId} onChange={(e) => update({ variantId: e.target.value, price: "" })} disabled={!p} className="field py-2 text-sm">
                      {p?.variants.map((x) => <option key={x.id} value={x.id} disabled={x.stock <= 0}>{x.label || "Default"} · {x.stock > 0 ? `${x.stock} left` : "sold out"}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`q-${i}`}>Qty</label>
                    <input id={`q-${i}`} type="number" min={1} max={v?.stock ?? 99} value={l.quantity} onChange={(e) => update({ quantity: Math.max(1, Number(e.target.value) || 1) })} className="field py-2 text-sm" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`pr-${i}`}>Price €</label>
                    <input id={`pr-${i}`} inputMode="decimal" placeholder={v ? (v.price / 100).toFixed(2) : ""} value={l.price} onChange={(e) => update({ price: e.target.value })} className="field py-2 text-sm tabular-nums" />
                  </div>
                  <button type="button" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines)} aria-label="Remove line" className="grid h-10 w-10 place-items-center self-end rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setLines([...lines, { productId: "", variantId: "", quantity: 1, price: "" }])} className="btn-outline mt-3 min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> Add product</button>
          <p className="mt-2 text-xs text-ink-soft">{faire ? "Type the wholesale price per unit (as on the Faire order)." : "Leave the price empty to use the catalogue price."} Stock goes down when the order is created.</p>
        </Card>

        <Card title={faire ? "Retailer contact & shipping address" : "Customer"}>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("firstName", "First name")}
            {field("lastName", "Last name")}
            <div className="sm:col-span-2">
              {field("email", "Email", "email")}
              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.noEmail} onChange={(e) => set("noEmail", e.target.checked)} className="h-4 w-4 accent-azulejo" /> No email (e.g. sold in person)</label>
            </div>
            {field("phone", "Phone")}
            <div>
              <label htmlFor="no-country" className="label">Country</label>
              <select id="no-country" value={f.country} onChange={(e) => { set("country", e.target.value); set("locale", e.target.value === "PT" ? "pt" : "en"); }} className="field">
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">{field("address1", "Address (optional for pickup)")}</div>
            {field("postal", "Postal code")}
            {field("city", "City")}
            {field("nif", faire ? "VAT number (e.g. ESB12345678; checked with VIES)" : "NIF (for the invoice, optional)")}
            <div>
              <label htmlFor="no-locale" className="label">Emails in</label>
              <select id="no-locale" value={f.locale} onChange={(e) => set("locale", e.target.value as "en" | "pt")} className="field"><option value="pt">Português</option><option value="en">English</option></select>
            </div>
          </div>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card title="Payment">
          <div className="space-y-3">
            {faire ? <p className="rounded-xl bg-cream px-3 py-2 text-sm text-ink-soft">Paid through Faire. Faire pays you the order minus its commission.</p> : <>
            <div>
              <label htmlFor="no-pay" className="label">Payment method</label>
              <select id="no-pay" value={f.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className="field">
                {payments.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div role="radiogroup" aria-label="Payment status" className="grid grid-cols-2 gap-1.5">
              <button type="button" role="radio" aria-checked={f.paid} onClick={() => set("paid", true)} className="chip min-h-10 text-sm">Paid</button>
              <button type="button" role="radio" aria-checked={!f.paid} onClick={() => set("paid", false)} className="chip min-h-10 text-sm">Awaiting payment</button>
            </div>
            </>}
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="no-ship" className="label">Shipping €</label><input id="no-ship" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} className="field tabular-nums" /></div>
              <div><label htmlFor="no-disc" className="label">Discount €</label><input id="no-disc" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className="field tabular-nums" /></div>
            </div>
            <dl className="space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{eur(subtotal, 2)}</dd></div>
              {toCents(discount) > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="tabular-nums">−{eur(toCents(discount), 2)}</dd></div>}
              {faire && <div className="flex justify-between"><dt className="text-ink-soft">Faire commission ({f.commissionPct}%)</dt><dd className="tabular-nums">−{eur(Math.round((Math.max(0, subtotal - toCents(discount)) * f.commissionPct) / 100), 2)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd className="tabular-nums">{toCents(shipping) ? eur(toCents(shipping), 2) : "—"}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{eur(total, 2)}</dd></div>
            </dl>
          </div>
        </Card>
        <Card title="Extras">
          <div className="space-y-3">
            <div><label htmlFor="no-gift" className="label">Gift message (optional)</label><textarea id="no-gift" rows={2} value={f.giftMessage} onChange={(e) => set("giftMessage", e.target.value)} className="field text-sm" /></div>
            <div><label htmlFor="no-note" className="label">Internal note (optional)</label><textarea id="no-note" rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Sold at LX Market" className="field text-sm" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.test} onChange={(e) => set("test", e.target.checked)} className="h-4 w-4 accent-azulejo" /> This is a test order (TEST badge, can be deleted)</label>
          </div>
        </Card>
        {error && <p role="alert" className="rounded-xl bg-coral-tint px-3 py-2 text-sm text-coral-ink">{error}</p>}
        <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full">{pending && <Loader2 className="h-4 w-4 animate-spin" />} Create order · {eur(total, 2)}</button>
      </div>
    </div>
  );
}
