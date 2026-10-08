"use client";

import { useState, useTransition } from "react";
import { Printer, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { addNote, createInvoiceDraft, deleteTestOrder, markShipped, refundOrder, setStatus } from "@/app/admin/(app)/orders/actions";
import type { OrderStatus } from "@/lib/admin/types";

type Msg = { kind: "ok" | "error"; text: string } | null;

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p role={msg.kind === "error" ? "alert" : "status"} className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.kind === "error" ? "bg-coral-tint text-coral-ink" : "bg-olive-tint text-ink"}`}>
      {msg.text}
    </p>
  );
}

const carriers = ["CTT Expresso", "CTT", "DHL Express", "DPD", "GLS", "UPS"];

export function WorkflowActions({ orderId, status, defaultCarrier }: { orderId: string; status: OrderStatus; defaultCarrier: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ? { kind: "ok", text: r.message } : null) : { kind: "error", text: r.error ?? "Something went wrong" });
      if (r.ok) setShipOpen(false);
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "pending_payment" && <button disabled={pending} onClick={() => run(() => setStatus(orderId, "paid"))} className="btn-primary min-h-10 py-2 text-sm">Mark as paid</button>}
        {status === "paid" && <button disabled={pending} onClick={() => run(() => setStatus(orderId, "packing"))} className="btn-primary min-h-10 py-2 text-sm">Start packing</button>}
        {(status === "paid" || status === "packing") && (
          <button disabled={pending} onClick={() => setShipOpen((v) => !v)} aria-expanded={shipOpen} className={`${status === "packing" ? "btn-primary" : "btn-outline"} min-h-10 py-2 text-sm`}>
            <Truck className="h-4 w-4" /> Mark as shipped
          </button>
        )}
        {status === "shipped" && <button disabled={pending} onClick={() => run(() => setStatus(orderId, "delivered"))} className="btn-primary min-h-10 py-2 text-sm">Mark as delivered</button>}
        <a href={`/admin/orders/${orderId}/packing-slip`} target="_blank" className="btn-outline min-h-10 py-2 text-sm"><Printer className="h-4 w-4" /> Packing slip</a>
        {(status === "pending_payment" || status === "paid") && (
          <button
            disabled={pending}
            onClick={() => confirm("Cancel this order and put the items back in stock?") && run(() => setStatus(orderId, "cancelled"))}
            className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"
          >
            Cancel order
          </button>
        )}
      </div>
      {shipOpen && (
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-line bg-cream p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => markShipped(orderId, String(f.get("carrier")), String(f.get("tracking"))));
          }}
        >
          <div>
            <label htmlFor="carrier" className="label">Carrier</label>
            <input id="carrier" name="carrier" list="carriers" defaultValue={defaultCarrier} required className="field" />
            <datalist id="carriers">{carriers.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label htmlFor="tracking" className="label">Tracking number</label>
            <input id="tracking" name="tracking" required autoFocus className="field" placeholder="e.g. EA123456789PT" />
          </div>
          <button disabled={pending} className="btn-primary min-h-12">{pending ? "Saving…" : "Ship & email customer"}</button>
        </form>
      )}
      <Feedback msg={msg} />
    </div>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addNote(orderId, text);
          if (r.ok) setText("");
          setMsg(r.ok ? null : { kind: "error", text: r.error });
        });
      }}
    >
      <label htmlFor="note" className="sr-only">Internal note</label>
      <textarea id="note" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Add an internal note (only staff can see this)" className="field resize-none text-sm" />
      <div className="mt-2 flex justify-end">
        <button disabled={pending || !text.trim()} className="btn-outline min-h-9 px-4 py-1.5 text-sm">Add note</button>
      </div>
      <Feedback msg={msg} />
    </form>
  );
}

export function RefundForm({ orderId, remaining }: { orderId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  if (remaining <= 0) return <p className="text-sm text-ink-soft">Fully refunded.</p>;
  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-outline min-h-10 py-2 text-sm">Refund…</button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
            if (!confirm(`Refund €${(cents / 100).toFixed(2)}?`)) return;
            start(async () => {
              const r = await refundOrder(orderId, cents, restock, reason);
              setMsg(r.ok ? { kind: "ok", text: r.message ?? "Refunded." } : { kind: "error", text: r.error });
              if (r.ok) setOpen(false);
            });
          }}
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => setAmount((remaining / 100).toFixed(2))} className="chip min-h-9 text-xs">Full</button>
            <label className="relative flex-1">
              <span className="sr-only">Amount in euros</span>
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft">€</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="field py-2 pl-7" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-azulejo" /> Put items back in stock</label>
          <label className="block">
            <span className="sr-only">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, internal)" className="field py-2 text-sm" />
          </label>
          <div className="flex gap-2">
            <button disabled={pending} className="btn min-h-10 bg-coral-ink px-4 py-2 text-sm text-white hover:brightness-95">{pending ? "Refunding…" : "Issue refund"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">Cancel</button>
          </div>
        </form>
      )}
      <Feedback msg={msg} />
    </div>
  );
}

export function DeleteTestOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => confirm("Delete this test order? Its items go back in stock.") && start(async () => { const r = await deleteTestOrder(orderId); if (r.ok) router.push("/admin/orders"); else setMsg({ kind: "error", text: r.error }); })}
        className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"
      >
        Delete test order
      </button>
      <Feedback msg={msg} />
    </div>
  );
}

export function InvoiceButton({ orderId, retry }: { orderId: string; retry: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => start(async () => { const r = await createInvoiceDraft(orderId); setMsg(r.ok ? { kind: "ok", text: r.message ?? "Criado." } : { kind: "error", text: r.error }); router.refresh(); })}
        className="btn-outline min-h-9 py-1.5 text-sm"
      >
        {pending ? "A criar…" : retry ? "Tentar de novo" : "Criar rascunho no Moloni"}
      </button>
      <Feedback msg={msg} />
    </div>
  );
}
