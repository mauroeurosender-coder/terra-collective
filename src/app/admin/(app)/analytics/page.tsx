import Link from "next/link";
import clsx from "clsx";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured } from "@/lib/supabase/server";
import { isoDate, parseRange } from "@/lib/admin/range";
import { getAnalytics, type ProductStat } from "@/lib/admin/analytics";
import { RangePicker } from "@/components/admin/range-picker";
import { BarList, Card, NotConnected, PageHeader, eur } from "@/components/admin/ui";
import { ProfitView } from "@/components/admin/profit-view";
import { countries as countryList } from "@/lib/geo";

const countryName = (code: string) => (code === "??" ? "Unknown" : countryList.find((c) => c.code === code)?.name.en ?? code);

export const metadata = { title: "Analytics" };

const cols: { key: keyof ProductStat; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "wishlist", label: "Wishlist" },
  { key: "carts", label: "Add to cart" },
  { key: "units", label: "Sold" },
  { key: "revenue", label: "Revenue" },
  { key: "conversion", label: "Conversion" },
];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Analytics" /><NotConnected /></>;
  const sp = await searchParams;
  const range = parseRange(sp);
  const view = sp.view === "profit" ? "profit" : "overview";
  const tabs = (
    <nav aria-label="Analytics views" className="inline-flex rounded-full border border-line bg-paper p-1">
      {[["overview", "Visitors & sales"], ["profit", "Revenue & profit"]].map(([k, label]) => (
        <Link key={k} href={`?view=${k}&range=${range.key}`} aria-current={view === k ? "page" : undefined} className={clsx("rounded-full px-4 py-1.5 text-sm font-medium", view === k ? "bg-ink text-cream" : "text-ink-soft hover:text-ink")}>{label}</Link>
      ))}
    </nav>
  );
  if (view === "profit") {
    const period = range.key === "today" ? "yesterday" : "prior period";
    return (
      <div className="mx-auto max-w-[1280px] space-y-4">
        <PageHeader title="Analytics" subtitle={tabs} actions={<RangePicker current={range.key} from={isoDate(range.from)} to={isoDate(new Date(range.to.getTime() - 86_400_000))} />} />
        <ProfitView range={range} period={period} isOwner={session.role === "owner"} section={["costs", "expenses", "defaults"].includes(sp.section ?? "") ? sp.section! : "report"} />
      </div>
    );
  }
  const a = await getAnalytics(range);
  const sort = (cols.find((c) => c.key === sp.sort)?.key ?? "revenue") as keyof ProductStat;
  const products = [...a.products].sort((x, y) => (y[sort] as number) - (x[sort] as number));
  const top = a.funnel[0].count || 1;
  const qs = (patch: Record<string, string>) => "?" + new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), ...patch });

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <PageHeader
        title="Analytics"
        subtitle={<div className="space-y-2">{tabs}<p>Privacy-friendly: only visitors who accept analytics cookies are counted, and nothing identifies them.</p></div>}
        actions={<RangePicker current={range.key} from={isoDate(range.from)} to={isoDate(new Date(range.to.getTime() - 86_400_000))} />}
      />
      {a.totalEvents === 0 && (
        <p className="rounded-2xl bg-mustard-tint px-4 py-3 text-sm">No visits recorded in this period yet. Data starts flowing as soon as visitors accept analytics cookies on the store.</p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Conversion funnel">
          <ol className="space-y-3">
            {a.funnel.map((f, i) => {
              const prev = i ? a.funnel[i - 1].count : 0;
              return (
                <li key={f.step} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-sm">
                  <span>{f.step}</span>
                  <span className="relative h-7 rounded-r-[4px]"><span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-azulejo" style={{ width: `${Math.min(100, Math.max(1.5, (f.count / top) * 100))}%`, opacity: 1 - i * 0.12 }} /></span>
                  <span className="w-28 text-right tabular-nums">{f.count.toLocaleString("en-IE")}{i > 0 && <span className="ml-1.5 text-xs text-ink-soft">{prev ? `${((f.count / prev) * 100).toFixed(0)}%` : "—"}</span>}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-ink-soft">Website only. Percentages are the share of the previous step. Overall conversion: {a.funnel[0].count ? `${((a.funnel[4].count / top) * 100).toFixed(2)}%` : "—"}. Etsy doesn’t share visits, so Etsy orders aren’t in the funnel.</p>
        </Card>
        <Card title="Traffic sources">
          {a.sources.length ? <BarList rows={a.sources.slice(0, 8).map((s) => ({ key: s.source, label: s.source, value: s.sessions }))} format={(v) => v.toLocaleString("en-IE")} /> : <p className="text-sm text-ink-soft">No visits yet. Add <code>?utm_source=instagram</code> to links you share to see them here.</p>}
        </Card>
      </div>

      <Card title="Countries" action={<span className="text-xs text-ink-soft">Website conversion = website orders ÷ website visits</span>}>
        {a.countries.length ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr><th className="px-2 pb-2 font-medium">Country</th><th className="w-1/4 px-2 pb-2 font-medium">Website visits</th><th className="px-2 pb-2 text-right font-medium">Website orders</th><th className="px-2 pb-2 text-right font-medium">Conversion</th><th className="px-2 pb-2 text-right font-medium">Etsy orders</th><th className="px-2 pb-2 text-right font-medium">Revenue (all)</th></tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {a.countries.slice(0, 12).map((c) => (
                  <tr key={c.country}>
                    <td className="px-2 py-2.5 font-medium">{countryName(c.country)}</td>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="h-5 rounded-r-[4px] bg-azulejo" style={{ width: `${c.sessions ? Math.max(2, (c.sessions / Math.max(1, ...a.countries.map((x) => x.sessions))) * 100) : 0}%` }} />
                        <span>{c.sessions.toLocaleString("en-IE")}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">{c.orders}</td>
                    <td className="px-2 py-2.5 text-right">{c.sessions ? `${((c.orders / c.sessions) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-2 py-2.5 text-right">{c.etsyOrders}</td>
                    <td className="px-2 py-2.5 text-right">{eur(c.revenue + c.etsyRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-ink-soft">No visits yet.</p>}
      </Card>

      <Card title="Products" action={<span className="text-xs text-ink-soft">Units & revenue: all channels · Conversion = website units ÷ website views</span>}>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="px-2 pb-2 font-medium">Product</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-2 pb-2 text-right font-medium" aria-sort={sort === c.key ? "descending" : undefined}>
                    <Link href={qs({ sort: c.key })} className={clsx("hover:text-ink", sort === c.key && "font-semibold text-ink")}>{c.label}{sort === c.key && " ↓"}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {products.map((p) => (
                <tr key={p.slug}>
                  <td className="px-2 py-2.5 font-medium"><Link href={`/admin/products?q=${p.slug}`} className="hover:text-azulejo">{p.name}</Link></td>
                  <td className="px-2 py-2.5 text-right">{p.views}</td>
                  <td className="px-2 py-2.5 text-right">{p.wishlist}</td>
                  <td className="px-2 py-2.5 text-right">{p.carts}</td>
                  <td className="px-2 py-2.5 text-right">{p.units}</td>
                  <td className="px-2 py-2.5 text-right">{eur(p.revenue)}</td>
                  <td className="px-2 py-2.5 text-right">{p.views ? `${(p.conversion * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Top site searches">
          {a.searches.length ? (
            <ul className="divide-y divide-line text-sm">
              {a.searches.map((s) => (
                <li key={s.q} className="flex items-center gap-3 py-2">
                  <span className="flex-1">“{s.q}”</span>
                  {s.zero > 0 && <span className="rounded-full bg-coral-tint px-2 py-0.5 text-xs font-semibold text-coral-ink">{s.zero} with no results</span>}
                  <span className="tabular-nums text-ink-soft">{s.count}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">No searches yet. Searches with no results show what people want that you don’t sell (yet).</p>}
        </Card>
        <Card title="Best-performing journal posts">
          {a.posts.length ? <BarList rows={a.posts.slice(0, 8).map((p) => ({ key: p.slug, label: p.title, value: p.views }))} format={(v) => `${v} views`} /> : <p className="text-sm text-ink-soft">No journal views yet.</p>}
        </Card>
      </div>
      {a.truncated && <p className="text-xs text-ink-soft">Showing the most recent 50,000 events in this period.</p>}
    </div>
  );
}
