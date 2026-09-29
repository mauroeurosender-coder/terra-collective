import Link from "next/link";
import clsx from "clsx";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { EmptyState, NotConnected, PageHeader, eur } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PAGE = 40;
const sorts: Record<string, [string, boolean]> = { recent: ["last_order_at", false], value: ["lifetime_value", false], orders: ["order_count", false], new: ["created_at", false] };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Customers" /><NotConnected /></>;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const page = Math.max(1, Number(sp.page) || 1);
  const [col, asc] = sorts[sp.sort ?? "recent"] ?? sorts.recent;
  let q = sb.from("customer_stats").select("*", { count: "exact" }).order(col, { ascending: asc, nullsFirst: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) {
    const s = sp.q.replace(/[,()%]/g, " ").trim();
    q = q.or(`email.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
  }
  if (sp.tag) q = q.contains("tags", [sp.tag]);
  if (sp.newsletter === "1") q = q.eq("newsletter", true);
  const { data, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (patch: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ q: sp.q, tag: sp.tag, sort: sp.sort, newsletter: sp.newsletter, ...patch }).filter(([, v]) => v) as [string, string][]);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Customers" subtitle={`${count ?? 0} customer${count === 1 ? "" : "s"}`} />
      <form className="mb-5 flex flex-wrap gap-2" action="/admin/customers">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input name="q" defaultValue={sp.q} placeholder="Name or email" className="field rounded-full py-2.5 pl-10" />
        </label>
        <select name="tag" aria-label="Tag" defaultValue={sp.tag ?? ""} className="field w-auto rounded-full py-2.5">
          <option value="">All tags</option><option value="VIP">VIP</option><option value="wholesale">Wholesale</option><option value="press">Press</option>
        </select>
        <select name="sort" aria-label="Sort" defaultValue={sp.sort ?? "recent"} className="field w-auto rounded-full py-2.5">
          <option value="recent">Recent orders</option><option value="value">Lifetime value</option><option value="orders">Most orders</option><option value="new">Newest</option>
        </select>
        <label className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm"><input type="checkbox" name="newsletter" value="1" defaultChecked={sp.newsletter === "1"} className="h-4 w-4 accent-azulejo" /> Subscribers</label>
        <button className="btn-primary min-h-11 px-5 py-2">Filter</button>
      </form>
      {!data?.length ? (
        <EmptyState title="No customers yet" body="Customers are created automatically when someone places an order." />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line text-left text-xs text-ink-soft">
                <tr><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Country</th><th className="px-4 py-3 font-medium">Tags</th><th className="px-4 py-3 text-right font-medium">Orders</th><th className="px-4 py-3 text-right font-medium">Lifetime value</th><th className="px-4 py-3 font-medium">Last order</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(data as any[]).map((c) => (
                  <tr key={c.id} className="relative hover:bg-cream/70">
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium after:absolute after:inset-0">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</Link>
                      <span className="block text-xs text-ink-soft">{c.email}{c.newsletter && " · ✉︎ subscribed"}</span>
                    </td>
                    <td className="px-4 py-3">{c.country ?? "—"}</td>
                    <td className="px-4 py-3">{(c.tags ?? []).map((t: string) => <span key={t} className={clsx("mr-1 rounded-full px-2 py-0.5 text-xs font-semibold", t === "VIP" ? "bg-mustard-tint" : "bg-azulejo-tint text-azulejo-deep")}>{t}</span>)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{eur(c.lifetime_value, 2)}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-outline min-h-10 py-2" href={qs({ page: String(page - 1) })}>Previous</Link>}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-outline min-h-10 py-2" href={qs({ page: String(page + 1) })}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
