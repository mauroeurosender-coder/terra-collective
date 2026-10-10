import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { parseRange, isoDate } from "@/lib/admin/range";
import { getDashboard } from "@/lib/admin/dashboard";
import { getAdminSession } from "@/lib/admin/auth";
import { countries } from "@/lib/geo";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { RangePicker } from "@/components/admin/range-picker";
import { BarList, Card, Kpi, StatusPill, TestBadge, eur } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

const countryName = (code: string) => countries.find((c) => c.code === code)?.name.en ?? code;

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const [d, session] = await Promise.all([getDashboard(range), getAdminSession()]);
  const period = range.key === "today" ? "yesterday" : "prior period";
  const lastDay = new Date(range.to.getTime() - 86_400_000);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-ink-soft">{greeting}, {session?.name.split(" ")[0]}</p>
          <h1 className="headline mt-1 text-4xl">Dashboard</h1>
        </div>
        <RangePicker current={range.key} from={isoDate(range.from)} to={isoDate(lastDay)} />
      </header>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <Kpi label="Revenue" value={eur(d.kpis.revenue)} current={d.kpis.revenue} previous={d.prev.revenue} periodLabel={period} />
        <Kpi label="Orders" value={String(d.kpis.orders)} current={d.kpis.orders} previous={d.prev.orders} periodLabel={period} />
        <Kpi label="Average order" value={eur(d.kpis.aov, 2)} current={d.kpis.aov} previous={d.prev.aov} periodLabel={period} />
        <Kpi label="Website conversion" value={`${(d.kpis.conversion * 100).toFixed(2)}%`} current={d.kpis.conversion} previous={d.prev.conversion} periodLabel={period} format="percent-points" />
        <Kpi label="Website visits" value={d.kpis.visits.toLocaleString("en-IE")} current={d.kpis.visits} previous={d.prev.visits} periodLabel={period} className="col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card title={range.bucket === "hour" ? "Revenue today, by hour" : "Revenue over time"}>
          <RevenueChart data={d.series} bucket={range.bucket} />
        </Card>
        <Card title="Revenue by country">
          {d.byCountry.length ? (
            <BarList
              rows={d.byCountry.slice(0, 8).map((c) => ({ key: c.country, label: countryName(c.country), value: c.revenue, sub: `${c.orders}` }))}
              format={(v) => eur(v)}
            />
          ) : (
            <p className="text-sm text-ink-soft">No sales in this period yet.</p>
          )}
          <p className="mt-4 text-xs text-ink-soft">Small numbers are order counts.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card title="Top products" action={<span className="text-xs text-ink-soft">by revenue</span>}>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr><th className="px-2 pb-2 font-medium">Product</th><th className="px-2 pb-2 text-right font-medium">Units</th><th className="px-2 pb-2 text-right font-medium">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.topProducts.map((p) => (
                  <tr key={p.slug}>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-3">
                        {p.image && (
                          <span className="relative h-10 w-9 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                            <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />
                          </span>
                        )}
                        <span className="font-medium">{p.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{p.units}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{eur(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Low stock" action={<span className="inline-flex items-center gap-1 text-xs text-coral-ink"><AlertTriangle className="h-3.5 w-3.5" /> {d.lowStock.length} variants</span>}>
          {d.lowStock.length ? (
            <ul className="divide-y divide-line text-sm">
              {d.lowStock.map((v) => (
                <li key={v.sku} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.name}</p>
                    <p className="truncate text-xs text-ink-soft">{v.variantLabel || "Default"} · {v.sku}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${v.stock === 0 ? "bg-ink text-cream" : "bg-coral-tint text-coral-ink"}`}>
                    {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Everything is well stocked.</p>
          )}
        </Card>
      </div>

      <Card title="Recent orders" action={<Link href="/admin/orders?tab=all" className="text-xs font-medium text-azulejo hover:underline">All orders →</Link>}>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="px-2 pb-2 font-medium">Order</th>
                <th className="px-2 pb-2 font-medium">Date</th>
                <th className="px-2 pb-2 font-medium">Customer</th>
                <th className="px-2 pb-2 font-medium">Items</th>
                <th className="px-2 pb-2 font-medium">Status</th>
                <th className="px-2 pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.recent.map((o) => (
                <tr key={o.id} className="hover:bg-cream/60">
                  <td className="px-2 py-3 font-medium">{d.source === "live" ? <Link href={`/admin/orders/${o.id}`} className="hover:text-azulejo">{o.number}</Link> : o.number}{o.test && <TestBadge />}{o.giftMessage && <span title="Gift message" className="ml-1.5">🎁</span>}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-ink-soft">
                    {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-2 py-3">
                    <span className="block">{o.customerName}</span>
                    <span className="text-xs text-ink-soft">{countryName(o.country)}</span>
                  </td>
                  <td className="max-w-[16rem] truncate px-2 py-3 text-ink-soft">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                  <td className="px-2 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-2 py-3 text-right tabular-nums">{eur(o.total, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="pb-4 text-center text-xs text-ink-soft">
        {d.source === "demo" ? "Sample data generated from your catalogue." : "Live data from Supabase."}{" "}
        <Link href="/en" className="underline">View store</Link>
      </p>
    </div>
  );
}
