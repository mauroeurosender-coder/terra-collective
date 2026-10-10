import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import type { Range } from "@/lib/admin/types";
import { getProfitReport } from "@/lib/admin/profit";
import { mergeSettings } from "@/lib/settings";
import { supabaseServer } from "@/lib/supabase/server";
import { BarList, Card, Kpi, eur } from "./ui";
import { DefaultCosts, Expenses, ProductCosts, type CostRow, type ExpenseRow } from "./profit-editors";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function ProfitView({ range, period, isOwner, section }: { range: Range; period: string; isOwner: boolean; section: string }) {
  const sb = await supabaseServer();
  const [r, { data: sets }, { data: variants }, { data: exps }] = await Promise.all([
    getProfitReport(sb, range),
    sb.from("settings").select("key, value"),
    sb.from("variants").select("id, sku, options, price, cost, weight_g, image_index, position, products!inner(name, status, created_at, product_media(url, position, kind))").neq("products.status", "archived"),
    sb.from("expenses").select("id, date, description, category, amount").gte("date", range.from.toISOString().slice(0, 10)).lt("date", range.to.toISOString().slice(0, 10)).order("date", { ascending: false }),
  ]);
  const t = r.totals;
  const costs: CostRow[] = ((variants ?? []) as any[])
    .map((v) => {
      const media = [...(v.products.product_media ?? [])].filter((m: any) => m.kind === "image").sort((a: any, b: any) => a.position - b.position);
      return { id: v.id, product: v.products.name.en, variant: Object.values(v.options ?? {}).join(" · "), sku: v.sku, price: v.price, cost: v.cost, weight: v.weight_g ?? null, image: media[v.image_index ?? 0]?.url ?? media[0]?.url, _pos: v.position };
    })
    .sort((a, b) => a.product.localeCompare(b.product) || a._pos - b._pos)
    .map(({ _pos, ...x }) => (void _pos, x));
  const totalCosts = t.cogs + t.shipping + t.packaging + t.fees + t.duties + t.expenses;
  const sub = (k: string, label: string) => (
    <Link href={`?view=profit&section=${k}&range=${range.key}`} aria-current={section === k ? "page" : undefined} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap", section === k ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink")}>{label}</Link>
  );

  return (
    <div className="space-y-4">
      <nav aria-label="Profit sections" className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {sub("report", "Report")}
        {sub("costs", `Costs & weights${r.missing.variantsWithoutCost ? ` (${r.missing.variantsWithoutCost} missing)` : ""}`)}
        {sub("expenses", "Other expenses")}
        {sub("defaults", "Shipping & defaults")}
      </nav>

      {section === "costs" && <ProductCosts rows={costs} />}
      {section === "expenses" && <Expenses rows={(exps ?? []) as ExpenseRow[]} defaultDate={new Date().toISOString().slice(0, 10)} />}
      {section === "defaults" && <DefaultCosts initial={mergeSettings(sets ?? []).profit} isOwner={isOwner} />}

      {section === "report" && (
        <>
          {(r.missing.unitsWithoutCost > 0 || r.missing.variantsWithoutCost > 0) && (
            <p className="flex items-start gap-2 rounded-2xl bg-mustard-tint px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {r.missing.unitsWithoutCost > 0 ? <><b>{r.missing.unitsWithoutCost} items sold</b> in this period have no product cost, so profit looks higher than it is. </> : null}
                <Link href="?view=profit&section=costs" className="font-medium underline">Add product costs</Link>
                {r.missing.variantsWithoutCost ? ` (${r.missing.variantsWithoutCost} variants missing).` : "."}
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <Kpi label="Revenue (excl. VAT)" value={eur(t.revenue)} current={t.revenue} previous={r.prev.revenue} periodLabel={period} />
            <Kpi label="Costs" value={eur(totalCosts)} current={totalCosts} previous={r.prev.revenue - r.prev.profit} periodLabel={period} />
            <Kpi label="Profit" value={eur(t.profit)} current={t.profit} previous={r.prev.profit} periodLabel={period} />
            <Kpi label="Margin" value={`${(t.margin * 100).toFixed(1)}%`} current={t.margin} previous={r.prev.margin} periodLabel={period} format="percent-points" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <Card title="From sales to profit">
              <dl className="space-y-2 text-sm tabular-nums">
                <Line label={`Sales kept (${t.orders} orders)`} value={t.revenue + t.vatOwed} />
                <Line label="VAT you owe the State" value={-t.vatOwed} muted />
                <Line label="Revenue (excl. VAT)" value={t.revenue} strong />
                <Line label="Product costs" value={-t.cogs} />
                <Line label="Shipping labels (CTT / FedEx)" value={-t.shipping} />
                <Line label="Packaging" value={-t.packaging} />
                <Line label="Etsy & payment fees" value={-t.fees} />
                {t.duties > 0 && <Line label="Import duties paid (Zonos)" value={-t.duties} />}
                <Line label="Other expenses" value={-t.expenses} />
                <Line label="Profit" value={t.profit} strong big />
              </dl>
              <p className="mt-4 text-xs text-ink-soft">
                Shipping charged to customers: {eur(t.shippingCharged, 2)} (included in sales) vs {eur(t.shipping, 2)} paid in labels.{" "}
                {r.flatShippingOrders > 0 ? `${r.flatShippingOrders} order${r.flatShippingOrders === 1 ? "" : "s"} used the flat shipping amount because a product has no weight: add weights under Product costs. ` : ""}
                Taxes Etsy collected (GST, sales tax…) are excluded entirely. {r.estimatedShare > 0 ? `${Math.round(r.estimatedShare * 100)}% of orders use estimated shipping or fees. Enter real values on the order page or adjust the defaults.` : ""}
              </p>
            </Card>
            <Card title="Where the money goes">
              {totalCosts > 0 ? (
                <BarList
                  rows={[
                    { key: "cogs", label: "Product costs", value: t.cogs },
                    { key: "ship", label: "Shipping labels", value: t.shipping },
                    { key: "duty", label: "Import duties", value: t.duties },
                    { key: "fees", label: "Etsy & payment fees", value: t.fees },
                    { key: "pack", label: "Packaging", value: t.packaging },
                    { key: "exp", label: "Other expenses", value: t.expenses },
                  ].filter((x) => x.value > 0).sort((a, b) => b.value - a.value)}
                  format={(v) => `${eur(v)} · ${t.revenue ? Math.round((v / t.revenue) * 100) : 0}%`}
                />
              ) : (
                <p className="text-sm text-ink-soft">No costs in this period yet.</p>
              )}
              <p className="mt-4 text-xs text-ink-soft">Percentages are a share of revenue (excl. VAT).</p>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="By channel">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs text-ink-soft"><tr><th className="pb-2 font-medium">Channel</th><th className="pb-2 text-right font-medium">Orders</th><th className="pb-2 text-right font-medium">Revenue</th><th className="pb-2 text-right font-medium">Profit</th><th className="pb-2 text-right font-medium">Margin</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.channels.map((c) => (
                    <tr key={c.channel}><td className="py-2 font-medium">{c.channel}</td><td className="py-2 text-right">{c.orders}</td><td className="py-2 text-right">{eur(c.revenue)}</td><td className={clsx("py-2 text-right", c.profit < 0 && "text-coral-ink")}>{eur(c.profit)}</td><td className="py-2 text-right">{c.revenue ? `${Math.round((c.profit / c.revenue) * 100)}%` : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-soft">Before other expenses.</p>
            </Card>
            <Card title="By month">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-left text-xs text-ink-soft"><tr><th className="pb-2 font-medium">Month</th><th className="pb-2 text-right font-medium">Revenue</th><th className="pb-2 text-right font-medium">Costs</th><th className="pb-2 text-right font-medium">Profit</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.months.map((m) => (
                    <tr key={m.month}><td className="py-2">{new Date(`${m.month}-15`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</td><td className="py-2 text-right">{eur(m.revenue)}</td><td className="py-2 text-right">{eur(m.costs)}</td><td className={clsx("py-2 text-right font-medium", m.profit < 0 && "text-coral-ink")}>{eur(m.profit)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-soft">Before other expenses.</p>
            </Card>
          </div>

          <Card title="Products by profit" action={<span className="text-xs text-ink-soft">Shipping & fees shared by item value</span>}>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm tabular-nums">
                <thead className="text-left text-xs text-ink-soft"><tr><th className="px-2 pb-2 font-medium">Product</th><th className="px-2 pb-2 text-right font-medium">Sold</th><th className="px-2 pb-2 text-right font-medium">Revenue</th><th className="px-2 pb-2 text-right font-medium">Product cost</th><th className="px-2 pb-2 text-right font-medium">Profit</th><th className="px-2 pb-2 text-right font-medium">Margin</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.products.slice(0, 25).map((p) => (
                    <tr key={p.slug + p.name}>
                      <td className="max-w-[22rem] truncate px-2 py-2 font-medium">{p.name}{p.missingCost && <span className="ml-2 rounded bg-mustard-tint px-1.5 py-0.5 text-[0.6rem] font-bold text-ink">NO COST</span>}</td>
                      <td className="px-2 py-2 text-right">{p.units}</td>
                      <td className="px-2 py-2 text-right">{eur(p.revenue)}</td>
                      <td className="px-2 py-2 text-right">{p.cogs ? eur(p.cogs) : "—"}</td>
                      <td className={clsx("px-2 py-2 text-right font-medium", p.profit < 0 && "text-coral-ink")}>{eur(p.profit)}</td>
                      <td className="px-2 py-2 text-right">{p.revenue ? `${Math.round((p.profit / p.revenue) * 100)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {r.expensesByCategory.length > 0 && (
            <Card title="Other expenses by category">
              <BarList rows={r.expensesByCategory.map((e) => ({ key: e.category, label: e.category, value: e.amount }))} format={(v) => eur(v)} />
            </Card>
          )}
          <p className="pb-4 text-center text-xs text-ink-soft">Test orders are excluded. Profit is an estimate for decisions, not accounting; your accountant’s figures are the official ones.</p>
        </>
      )}
    </div>
  );
}

function Line({ label, value, strong, big, muted }: { label: string; value: number; strong?: boolean; big?: boolean; muted?: boolean }) {
  return (
    <div className={clsx("flex justify-between gap-4", strong && "border-t border-line pt-2 font-semibold", big && "text-lg", muted && "text-ink-soft")}>
      <dt>{label}</dt>
      <dd className={clsx(value < 0 && !muted && "text-ink-soft", big && value < 0 && "text-coral-ink")}>{value < 0 ? `−${eur(-value, 2)}` : eur(value, 2)}</dd>
    </div>
  );
}
