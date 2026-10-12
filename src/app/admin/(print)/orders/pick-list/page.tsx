import Image from "next/image";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/source";
import { PackingSlipSheet } from "@/components/admin/packing-slip";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Pick list" };

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Today's picking: every piece to take from the shelves, grouped, then one packing slip per order. */
export default async function PickList({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireAdmin();
  const { ids } = await searchParams;
  const sb = await supabaseServer();
  const list = (ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 300);
  let q = sb.from("orders").select("*, order_items(name, variant_label, sku, quantity, product_id, products(product_media(url, position, kind)))").eq("test", false).order("created_at");
  q = list.length ? q.in("id", list) : q.in("status", ["paid", "packing"]);
  const [{ data: orders }, { store }] = await Promise.all([q, getSettings()]);

  const groups = new Map<string, { name: string; label: string; sku: string; qty: number; orders: Set<string>; image?: string }>();
  for (const o of (orders ?? []) as any[]) {
    for (const i of o.order_items ?? []) {
      const key = `${i.product_id ?? i.name}|${i.variant_label ?? ""}`;
      const img = [...(i.products?.product_media ?? [])].filter((m: any) => m.kind === "image").sort((a: any, b: any) => a.position - b.position)[0]?.url;
      const g = groups.get(key) ?? { name: i.name, label: i.variant_label ?? "", sku: i.sku ?? "", qty: 0, orders: new Set<string>(), image: img };
      g.qty += i.quantity;
      g.orders.add(o.number);
      groups.set(key, g);
    }
  }
  const rows = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || a.label.localeCompare(b.label));
  const units = rows.reduce((n, r) => n + r.qty, 0);

  return (
    <div className="min-h-dvh bg-white text-ink">
      <div className="mx-auto max-w-[720px] px-8 py-10 print:p-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <p className="text-sm text-ink-soft">Pick list + {orders?.length ?? 0} packing slip{orders?.length === 1 ? "" : "s"}. Each slip prints on its own page.</p>
          <PrintButton />
        </div>
        <header className="border-b border-line pb-4">
          <h1 className="headline text-3xl">Pick list</h1>
          <p className="text-sm text-ink-soft">{new Date().toLocaleDateString("en-GB", { dateStyle: "full" })} · {orders?.length ?? 0} orders · {units} pieces</p>
        </header>
        {!rows.length ? (
          <p className="py-8 text-sm text-ink-soft">No orders to pick.</p>
        ) : (
          <table className="my-4 w-full text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr><th className="w-8 pb-2">✓</th><th className="w-14 pb-2" /><th className="pb-2">Piece</th><th className="pb-2 text-right">Qty</th><th className="pb-2 pl-4">Orders</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, n) => (
                <tr key={n} className="break-inside-avoid">
                  <td className="py-2.5"><span className="inline-block h-4 w-4 rounded border border-ink/40" /></td>
                  <td className="py-2.5">{r.image && <span className="relative block h-11 w-11 overflow-hidden rounded bg-cream"><Image src={r.image} alt="" fill sizes="44px" className="object-cover" /></span>}</td>
                  <td className="py-2.5"><b>{r.name}</b>{r.label && <span className="block text-ink-soft">{r.label}</span>}</td>
                  <td className="py-2.5 text-right text-lg font-semibold tabular-nums">{r.qty}</td>
                  <td className="py-2.5 pl-4 text-xs text-ink-soft">{[...r.orders].join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {((orders ?? []) as any[]).map((o) => (
          <section key={o.id} className="mt-16 break-before-page border-t-2 border-dashed border-line pt-10 print:mt-0 print:border-0 print:pt-0">
            <PackingSlipSheet o={o} store={store} />
          </section>
        ))}
      </div>
    </div>
  );
}
