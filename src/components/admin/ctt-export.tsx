"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Check, Download, Loader2, Printer, Truck } from "lucide-react";
import { markShipped } from "@/app/admin/(app)/orders/actions";
import type { CttOrder } from "@/lib/admin/ctt-orders";
import { Card } from "./ui";

type Draft = { selected: boolean; kg: string; lines: { desc: string; hs: string }[]; tracking: string };
const kgOf = (g: number | null) => (g == null ? "" : String(Math.max(0.01, Math.round(g) / 1000)));
const flag = (c: string) => c.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));

export function CttExport({ orders }: { orders: CttOrder[] }) {
  const router = useRouter();
  const [d, setD] = useState<Record<string, Draft>>(() => Object.fromEntries(orders.map((o) => [o.id, { selected: true, kg: kgOf(o.grams), lines: o.lines.map((l) => ({ desc: l.desc, hs: l.hs })), tracking: "" }])));
  const [saveCustoms, setSaveCustoms] = useState(true);
  const [busy, setBusy] = useState<"file" | "ship" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paste, setPaste] = useState("");

  const set = (id: string, patch: Partial<Draft>) => setD((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
  const setLine = (id: string, i: number, patch: Partial<Draft["lines"][number]>) => set(id, { lines: d[id].lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const chosen = orders.filter((o) => d[o.id].selected);
  const problems = chosen.filter((o) => !(Number(d[o.id].kg) > 0) || (o.country !== "PT" && d[o.id].lines.some((l) => !l.desc.trim() || l.hs.replace(/\D/g, "").length < 6)));
  const allOn = chosen.length === orders.length;

  async function download() {
    setBusy("file");
    setMsg(null);
    const body = {
      saveCustoms,
      orders: chosen.map((o) => ({
        id: o.id,
        kg: Number(d[o.id].kg),
        lines: o.lines.map((l, i) => ({ productId: l.productId, desc: d[o.id].lines[i].desc, hs: d[o.id].lines[i].hs, qty: l.qty, value: l.value, kg: l.grams != null ? l.grams / 1000 : Number(d[o.id].kg) / o.lines.length })),
      })),
    };
    const res = await fetch("/admin/orders/ctt/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: (await res.json().catch(() => ({}))).error ?? "Couldn’t create the file." });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "CTT-envios.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg({ ok: true, text: `File with ${chosen.length} shipment${chosen.length === 1 ? "" : "s"} downloaded. Upload it on the CTT site (bulk labels), then add the tracking codes below.` });
  }

  function fillFromPaste() {
    const codes = paste.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{8,}$/.test(c));
    const next = { ...d };
    chosen.forEach((o, i) => { if (codes[i]) next[o.id] = { ...next[o.id], tracking: codes[i] }; });
    setD(next);
    setMsg({ ok: codes.length === chosen.length, text: `${Math.min(codes.length, chosen.length)} code${codes.length === 1 ? "" : "s"} filled in, in the order of the file.${codes.length !== chosen.length ? ` You pasted ${codes.length} for ${chosen.length} orders: check them.` : ""}` });
  }

  async function shipAll() {
    const todo = chosen.filter((o) => d[o.id].tracking.trim());
    if (!todo.length) return;
    setBusy("ship");
    setMsg(null);
    const failed: string[] = [];
    for (const o of todo) {
      const r = await markShipped(o.id, "CTT", d[o.id].tracking.trim());
      if (!r.ok) failed.push(`${o.number}: ${r.error}`);
    }
    setBusy(null);
    setMsg(failed.length ? { ok: false, text: `${todo.length - failed.length} marked as shipped. Problems: ${failed.join("; ")}` } : { ok: true, text: `${todo.length} order${todo.length === 1 ? "" : "s"} marked as shipped. Etsy orders got their tracking on Etsy.` });
    router.refresh();
  }

  if (!orders.length) return <Card><p className="text-sm text-ink-soft">No orders waiting to be shipped. Paid orders from Etsy and the website appear here.</p></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allOn} onChange={() => setD((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, { ...v, selected: !allOn }])))} className="h-4 w-4 accent-azulejo" />
            Select all ({orders.length})
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={saveCustoms} onChange={(e) => setSaveCustoms(e.target.checked)} className="h-4 w-4 accent-azulejo" />
            Remember customs descriptions and codes on each product
          </label>
          <a href={`/admin/orders/pick-list?ids=${chosen.map((o) => o.id).join(",")}`} target="_blank" rel="noopener" aria-disabled={!chosen.length} className={clsx("btn-outline ml-auto min-h-10 py-2 text-sm", !chosen.length && "pointer-events-none opacity-50")}>
            <Printer className="h-4 w-4" /> Pick list & slips
          </a>
          <button disabled={!chosen.length || busy !== null} onClick={download} className="btn-primary min-h-10 py-2 text-sm">
            {busy === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download CTT file ({chosen.length})
          </button>
        </div>
        {problems.length > 0 && (
          <p className="mt-3 flex gap-2 rounded-xl bg-coral-tint px-3 py-2 text-sm text-coral-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problems.length} order{problems.length === 1 ? " needs" : "s need"} a weight or customs code (marked in red). The file still downloads, but CTT may reject those lines.
          </p>
        )}
        {msg && <p role="status" className={clsx("mt-3 rounded-xl px-3 py-2 text-sm", msg.ok ? "bg-olive-tint text-olive" : "bg-coral-tint text-coral-ink")}>{msg.text}</p>}
      </Card>

      <div className="space-y-3">
        {orders.map((o) => {
          const x = d[o.id];
          const customs = o.country !== "PT";
          return (
            <Card key={o.id} className={clsx(!x.selected && "opacity-55")}>
              <div className="flex flex-wrap items-start gap-3">
                <input type="checkbox" aria-label={`Include ${o.number}`} checked={x.selected} onChange={(e) => set(o.id, { selected: e.target.checked })} className="mt-1 h-4 w-4 accent-azulejo" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-azulejo">{o.number}</Link> · {flag(o.country)} {o.name}
                    <span className="ml-2 text-xs text-ink-soft">{o.source === "etsy" ? "Etsy" : "Website"} · {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </p>
                  <p className="text-sm text-ink-soft">{[o.address, o.postal, o.city, o.region, o.country].filter(Boolean).join(", ")}</p>
                </div>
                <label className="flex items-center gap-1.5 text-sm">
                  Weight
                  <input aria-label={`Weight of ${o.number} in kg`} inputMode="decimal" value={x.kg} placeholder="kg" onChange={(e) => set(o.id, { kg: e.target.value.replace(",", ".") })} className={clsx("field w-20 py-1.5 text-right text-sm tabular-nums", !(Number(x.kg) > 0) && "border-coral")} />
                  kg
                </label>
              </div>
              {o.grams == null && <p className="mt-2 text-xs text-coral-ink">A product in this order has no weight yet: type the parcel weight, or add it under Analytics → Costs & weights.</p>}
              <div className="mt-3 space-y-2">
                {o.lines.map((l, i) => (
                  <div key={i} className="grid gap-2 text-sm sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8rem_auto] lg:items-center">
                    <span className="min-w-0 truncate" title={l.name}>{l.qty} × {l.name}</span>
                    {customs ? (
                      <>
                        <input aria-label="Customs description" value={x.lines[i].desc} onChange={(e) => setLine(o.id, i, { desc: e.target.value })} placeholder="Customs description (English)" className={clsx("field py-1.5 text-sm", !x.lines[i].desc.trim() && "border-coral")} />
                        <input aria-label="Customs code" inputMode="numeric" value={x.lines[i].hs} onChange={(e) => setLine(o.id, i, { hs: e.target.value.replace(/[^\d]/g, "") })} placeholder="Código pautal" className={clsx("field py-1.5 text-sm tabular-nums", x.lines[i].hs.length < 6 && "border-coral")} />
                      </>
                    ) : (
                      <span className="text-xs text-ink-soft lg:col-span-2">Portugal: no customs needed</span>
                    )}
                    <span className="text-right tabular-nums text-ink-soft">€{l.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {x.selected && (
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm">
                  <Truck className="h-4 w-4 text-ink-soft" />
                  <input aria-label={`Tracking code for ${o.number}`} value={x.tracking} onChange={(e) => set(o.id, { tracking: e.target.value.toUpperCase().trim() })} placeholder="CTT tracking code (after creating the labels)" className="field max-w-xs py-1.5 text-sm" />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card title="After creating the labels on CTT">
        <p className="mb-3 text-sm text-ink-soft">Type each tracking code above, or paste the list of codes from CTT here in the same order as the file. Then mark them all as shipped: Etsy orders get the tracking on Etsy, and invoices follow as usual.</p>
        <div className="flex flex-wrap items-end gap-2">
          <textarea aria-label="Paste tracking codes" rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"RR123456789PT\nRR987654321PT"} className="field min-w-64 flex-1 text-sm" />
          <button type="button" onClick={fillFromPaste} disabled={!paste.trim()} className="btn-outline min-h-10 py-2 text-sm">Fill in codes</button>
          <button type="button" onClick={shipAll} disabled={busy !== null || !chosen.some((o) => d[o.id].tracking.trim())} className="btn-primary min-h-10 py-2 text-sm">
            {busy === "ship" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Mark as shipped ({chosen.filter((o) => d[o.id].tracking.trim()).length})
          </button>
        </div>
      </Card>
    </div>
  );
}
