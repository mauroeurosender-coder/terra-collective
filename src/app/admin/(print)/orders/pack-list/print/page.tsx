import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { loadPackOrders } from "@/lib/admin/pack-list";
import { PrintButton } from "@/components/admin/print-button";
import { eur } from "@/components/admin/ui";
import { packTotals } from "@/lib/admin/pack-names";

export const metadata = { title: "Pack list" };

const countryName = new Intl.DisplayNames(["en"], { type: "region" });

/** Printable pack list: one block per order with every piece to put in the box. */
export default async function PackListPrint({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireAdmin();
  const { ids } = await searchParams;
  const list = (ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const orders = await loadPackOrders(await supabaseServer(), list);
  const pieces = orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
  const totals = packTotals(orders.flatMap((o) => o.items));

  return (
    <div className="min-h-dvh bg-white text-ink">
      <div className="mx-auto max-w-[960px] px-8 py-10 print:max-w-none print:p-0">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <p className="text-sm text-ink-soft">Tip: print in landscape if names or pieces are long.</p>
          <PrintButton />
        </div>
        <header className="flex items-end justify-between border-b-2 border-ink pb-3">
          <h1 className="headline text-3xl">Pack list</h1>
          <p className="text-sm text-ink-soft">{new Date().toLocaleDateString("en-GB", { dateStyle: "full" })} · {orders.length} orders · {pieces} pieces</p>
        </header>
        {!orders.length ? (
          <p className="py-8 text-sm text-ink-soft">No orders selected.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead className="text-left text-xs tracking-wide text-ink-soft uppercase">
              <tr className="border-b border-ink/30">
                <th className="w-7 py-2" />
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3 text-right">Cost of purchase</th>
                <th className="py-2 pr-3">Items to pack</th>
                <th className="py-2 text-right">Qty</th>
              </tr>
            </thead>
            {orders.map((o) => (
              <tbody key={o.id} className="break-inside-avoid border-b border-ink/20">
                {o.items.map((i, k) => (
                  <tr key={k} className="align-top">
                    {k === 0 && (
                      <>
                        <td rowSpan={o.items.length} className="py-2"><span className="mt-0.5 inline-block h-4 w-4 rounded border border-ink/50" /></td>
                        <td rowSpan={o.items.length} className="py-2 pr-3 font-medium">{countryName.of(o.country) ?? o.country}</td>
                        <td rowSpan={o.items.length} className="py-2 pr-3"><b>{o.name || "—"}</b>{o.status === "shipped" && <span className="block text-xs text-ink-soft">shipped</span>}</td>
                        <td rowSpan={o.items.length} className="py-2 pr-3 text-right tabular-nums">{eur(o.paid, 2)}</td>
                      </>
                    )}
                    <td className={`py-2 pr-3 ${k ? "border-t border-dotted border-ink/15" : ""}`}>{i.name}{i.variant && <span className="block text-xs text-ink-soft">{i.variant}</span>}</td>
                    <td className={`py-2 text-right text-base font-semibold tabular-nums ${k ? "border-t border-dotted border-ink/15" : ""}`}>{i.qty}{i.sets && <span className="block text-[10px] font-normal text-ink-soft">{i.sets}</span>}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}

        {totals.length > 0 && (
          <section className="mt-10 break-before-auto">
            <h2 className="headline border-b-2 border-ink pb-2 text-2xl">Total to pack</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead className="text-left text-xs tracking-wide text-ink-soft uppercase">
                <tr className="border-b border-ink/30">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Option</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="w-20 py-2 text-right">Item total</th>
                </tr>
              </thead>
              {totals.map((t) => (
                <tbody key={t.name} className="break-inside-avoid border-b border-ink/20">
                  {t.options.map((o, k) => (
                    <tr key={k} className="align-top">
                      {k === 0 && <td rowSpan={t.options.length} className="py-2 pr-3 font-semibold">{t.name}</td>}
                      <td className={`py-2 pr-3 ${k ? "border-t border-dotted border-ink/15" : ""}`}>{o.variant || <span className="text-ink-soft">—</span>}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums ${k ? "border-t border-dotted border-ink/15" : ""}`}>{o.qty}</td>
                      {k === 0 && <td rowSpan={t.options.length} className="py-2 text-right text-base font-semibold tabular-nums">{t.total}</td>}
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr className="border-t-2 border-ink">
                  <td colSpan={3} className="py-2 pr-3 font-semibold">All pieces</td>
                  <td className="py-2 text-right text-base font-semibold tabular-nums">{pieces}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
