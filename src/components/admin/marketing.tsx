"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Gift, Plus, Trash2 } from "lucide-react";
import { deleteDiscount, issueGiftCard, notifyWaitlist, saveDiscount, setGiftCardBalance, type DiscountInput } from "@/app/admin/(app)/marketing/actions";
import { useSave } from "./fields";
import { Card, eur } from "./ui";

const toCents = (s: string) => (s.trim() === "" ? null : Math.round(parseFloat(s.replace(",", ".")) * 100) || 0);
const euros = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));
const date = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export type DiscountRow = DiscountInput & { id: string; usedCount: number };

function describe(d: DiscountInput) {
  const what = d.kind === "percent" ? `${d.value}% off` : d.kind === "fixed" ? `${eur(d.value, 2)} off` : "Free shipping";
  return `${what}${d.minSpend ? ` over ${eur(d.minSpend)}` : ""}`;
}

export function DiscountsPanel({ rows, automatic }: { rows: DiscountRow[]; automatic: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DiscountInput | null>(null);
  const s = useSave();
  const now = new Date().toISOString();
  const state = (d: DiscountRow) =>
    !d.active ? "Off" : d.endsAt && d.endsAt < now ? "Expired" : d.startsAt && d.startsAt > now ? "Scheduled" : d.usageLimit != null && d.usedCount >= d.usageLimit ? "Used up" : "Live";

  return (
    <Card
      title={automatic ? "Automatic promotions" : "Discount codes"}
      action={<button onClick={() => setEditing({ code: automatic ? null : "", kind: "percent", value: 10, minSpend: null, startsAt: null, endsAt: null, usageLimit: null, automatic, active: true })} className="btn-outline min-h-9 py-1.5 text-sm"><Plus className="h-4 w-4" /> New</button>}
    >
      {automatic && <p className="mb-4 text-sm text-ink-soft">Applied at checkout without a code, e.g. “10% off everything this weekend” or “free shipping over €40”. If several are live, the newest wins; a code the shopper enters replaces it.</p>}
      {rows.length === 0 && !editing && <p className="text-sm text-ink-soft">None yet.</p>}
      <ul className="divide-y divide-line">
        {rows.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-28 font-mono font-semibold">{d.code ?? "Auto"}</span>
            <span className="flex-1">{describe(d)}<span className="block text-xs text-ink-soft">{[d.startsAt && `from ${date(d.startsAt)}`, d.endsAt && `until ${date(d.endsAt)}`, `used ${d.usedCount}${d.usageLimit != null ? `/${d.usageLimit}` : ""}`].filter(Boolean).join(" · ")}</span></span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state(d) === "Live" ? "bg-olive-tint text-olive" : "bg-ink/5 text-ink-soft"}`}>{state(d)}</span>
            <button onClick={() => setEditing(d)} className="btn min-h-9 px-3 py-1 text-sm hover:bg-ink/5">Edit</button>
            <button onClick={() => confirm(`Delete ${d.code ?? "this promotion"}?`) && s.run(() => deleteDiscount(d.id), () => router.refresh())} aria-label={`Delete ${d.code ?? "promotion"}`} className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <form
          className="mt-4 grid gap-3 rounded-2xl bg-cream p-4 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); s.run(() => saveDiscount(editing), () => { setEditing(null); router.refresh(); }); }}
        >
          <div>
            <label htmlFor="d-code" className="label">{automatic ? "Label (optional)" : "Code"}</label>
            <input id="d-code" value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} required={!automatic} className="field font-mono uppercase" placeholder={automatic ? "SUMMER" : "SARDINHA10"} />
          </div>
          <div>
            <label htmlFor="d-kind" className="label">Type</label>
            <select id="d-kind" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as DiscountInput["kind"], value: e.target.value === "fixed" ? 500 : 10 })} className="field">
              <option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option><option value="free_shipping">Free shipping</option>
            </select>
          </div>
          {editing.kind !== "free_shipping" && (
            <div>
              <label htmlFor="d-value" className="label">{editing.kind === "percent" ? "Percent" : "Amount (€)"}</label>
              <input id="d-value" inputMode="decimal" defaultValue={editing.kind === "percent" ? editing.value : euros(editing.value)} onBlur={(e) => setEditing({ ...editing, value: editing.kind === "percent" ? Number(e.target.value) : toCents(e.target.value) ?? 0 })} className="field" />
            </div>
          )}
          <div>
            <label htmlFor="d-min" className="label">Minimum spend (€, optional)</label>
            <input id="d-min" inputMode="decimal" defaultValue={euros(editing.minSpend)} onBlur={(e) => setEditing({ ...editing, minSpend: toCents(e.target.value) })} className="field" />
          </div>
          <div><label htmlFor="d-start" className="label">Starts</label><input id="d-start" type="date" value={date(editing.startsAt)} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value || null })} className="field" /></div>
          <div><label htmlFor="d-end" className="label">Ends</label><input id="d-end" type="date" value={date(editing.endsAt)} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value ? `${e.target.value}T23:59:59Z` : null })} className="field" /></div>
          {!automatic && <div><label htmlFor="d-limit" className="label">Usage limit (optional)</label><input id="d-limit" type="number" min={1} value={editing.usageLimit ?? ""} onChange={(e) => setEditing({ ...editing, usageLimit: e.target.value ? Number(e.target.value) : null })} className="field" /></div>}
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="h-4 w-4 accent-azulejo" /> Active</label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">Cancel</button>
            <s.Status />
          </div>
        </form>
      )}
      {!editing && <div className="mt-3"><s.Status /></div>}
    </Card>
  );
}

export type GiftCardRow = { id: string; code: string; initial: number; balance: number; recipient: string | null; expires: string | null; created: string };

export function GiftCardsPanel({ rows }: { rows: GiftCardRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ value: "50", email: "", name: "", message: "", send: true });
  const s = useSave();
  return (
    <Card title="Gift cards" action={<button onClick={() => setOpen((v) => !v)} className="btn-outline min-h-9 py-1.5 text-sm"><Gift className="h-4 w-4" /> Issue gift card</button>}>
      <p className="mb-3 text-sm text-ink-soft">Gift cards bought in the store appear here automatically once online payments are live. You can also issue one by hand (a giveaway, an apology, a wholesale thank-you).</p>
      {open && (
        <form className="mb-4 grid gap-3 rounded-2xl bg-cream p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); s.run(() => issueGiftCard({ value: toCents(f.value) ?? 0, recipientEmail: f.email, recipientName: f.name, message: f.message, send: f.send }), () => { setOpen(false); router.refresh(); }); }}>
          <div><label htmlFor="g-val" className="label">Value (€)</label><input id="g-val" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="field" /></div>
          <div><label htmlFor="g-name" className="label">Recipient name</label><input id="g-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" /></div>
          <div className="sm:col-span-2"><label htmlFor="g-email" className="label">Recipient email</label><input id="g-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="field" /></div>
          <div className="sm:col-span-2"><label htmlFor="g-msg" className="label">Message</label><textarea id="g-msg" rows={2} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className="field" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send} onChange={(e) => setF({ ...f, send: e.target.checked })} className="h-4 w-4 accent-azulejo" /> Email it to the recipient</label>
          <div className="flex items-center gap-2 sm:col-span-2"><button disabled={s.pending} className="btn-primary min-h-10 py-2 text-sm">Create</button><s.Status /></div>
        </form>
      )}
      {!open && <div className="mb-2"><s.Status /></div>}
      {rows.length === 0 ? <p className="text-sm text-ink-soft">No gift cards yet.</p> : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-ink-soft"><tr><th className="px-2 pb-2 font-medium">Code</th><th className="px-2 pb-2 font-medium">Recipient</th><th className="px-2 pb-2 font-medium">Expires</th><th className="px-2 pb-2 text-right font-medium">Value</th><th className="px-2 pb-2 text-right font-medium">Balance</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="px-2 py-2.5 font-mono font-semibold">{g.code}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{g.recipient ?? "—"}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{g.expires ? new Date(g.expires).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{eur(g.initial, 2)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <input aria-label={`Balance for ${g.code}`} defaultValue={euros(g.balance)} inputMode="decimal" onBlur={(e) => { const c = toCents(e.target.value); if (c != null && c !== g.balance) s.run(() => setGiftCardBalance(g.id, c)); }} className="field ml-auto w-24 py-1 text-right text-sm tabular-nums" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export type WaitRow = { variantId: string; product: string; variant: string; stock: number; waiting: number };

export function WaitlistPanel({ rows }: { rows: WaitRow[] }) {
  const router = useRouter();
  const s = useSave();
  return (
    <Card title="Back-in-stock waitlists">
      {rows.length === 0 ? <p className="text-sm text-ink-soft">Nobody is waiting right now. Shoppers can ask to be notified on any sold-out variant.</p> : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.variantId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="flex-1"><span className="font-medium">{r.product}</span><span className="block text-xs text-ink-soft">{r.variant || "Default"} · {r.stock > 0 ? `${r.stock} in stock` : "sold out"}</span></span>
              <span className="rounded-full bg-azulejo-tint px-2.5 py-0.5 text-xs font-semibold text-azulejo-deep">{r.waiting} waiting</span>
              <button disabled={s.pending || r.stock <= 0} onClick={() => s.run(() => notifyWaitlist(r.variantId), () => router.refresh())} className="btn-outline min-h-9 py-1.5 text-sm" title={r.stock <= 0 ? "Restock this variant first" : undefined}><Bell className="h-4 w-4" /> Notify</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3"><s.Status /></div>
    </Card>
  );
}
