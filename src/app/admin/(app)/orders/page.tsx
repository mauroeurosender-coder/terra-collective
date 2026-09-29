import Link from "next/link";
import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { countries } from "@/lib/geo";
import type { OrderStatus } from "@/lib/admin/types";
import { EmptyState, NotConnected, PageHeader, StatusPill, TestBadge, eur } from "@/components/admin/ui";

export const metadata = { title: "Orders" };

const tabs: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "open", label: "To fulfil", statuses: ["paid", "packing"] },
  { key: "pending_payment", label: "Awaiting payment", statuses: ["pending_payment"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "refunded", label: "Refunded / cancelled", statuses: ["refunded", "cancelled"] },
  { key: "all", label: "All" },
];
const PAGE = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Orders" /><NotConnected /></>;
  const sp = await searchParams;
  const tab = tabs.find((t) => t.key === sp.tab) ?? tabs[0];
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const sb = await supabaseServer();

  let query = sb
    .from("orders")
    .select("id, number, created_at, status, email, country, total, refunded_amount, gift_message, shipping_address, test, order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (tab.statuses) query = query.in("status", tab.statuses);
  if (sp.country) query = query.eq("country", sp.country);
  if (q) {
    const safe = q.replace(/[,()%]/g, " ");
    query = query.or(`number.ilike.%${safe}%,email.ilike.%${safe}%,shipping_address->>lastName.ilike.%${safe}%,shipping_address->>firstName.ilike.%${safe}%`);
  }
  const [{ data: orders, count }, counts] = await Promise.all([
    query,
    Promise.all(tabs.filter((t) => t.statuses).map((t) => sb.from("orders").select("id", { count: "exact", head: true }).in("status", t.statuses!).then((r) => [t.key, r.count ?? 0] as const))),
  ]);
  const countMap = Object.fromEntries(counts);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(Object.entries({ tab: tab.key, q: q || undefined, country: sp.country, page: undefined, ...patch }).filter(([, v]) => v != null && v !== "") as [string, string][]);
    return `/admin/orders?${next}`;
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Orders" subtitle={`${count ?? 0} ${tab.label.toLowerCase()}`} actions={<Link href="/admin/orders/new" className="btn-primary min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> New order</Link>} />

      <nav aria-label="Order status" className="-mx-4 mb-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link href={link({ tab: t.key })} aria-current={t.key === tab.key ? "page" : undefined} className={clsx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition", t.key === tab.key ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink")}>
                {t.label}
                {countMap[t.key] != null && <span className={clsx("rounded-full px-1.5 text-xs", t.key === tab.key ? "bg-white/15" : "bg-ink/5")}>{countMap[t.key]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="mb-5 flex flex-wrap gap-2" action="/admin/orders">
        <input type="hidden" name="tab" value={tab.key} />
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input name="q" defaultValue={q} placeholder="Order number, email or name" className="field rounded-full py-2.5 pl-10" />
        </label>
        <label>
          <span className="sr-only">Country</span>
          <select name="country" defaultValue={sp.country ?? ""} className="field w-auto rounded-full py-2.5">
            <option value="">All countries</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name.en}</option>)}
          </select>
        </label>
        <button className="btn-primary min-h-11 px-5 py-2">Filter</button>
      </form>

      {!orders?.length ? (
        <EmptyState title={q || sp.country ? "No orders match" : "No orders here yet"} body={tab.key === "open" ? "New paid orders will appear here, ready to pack." : undefined} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => {
                  const name = [o.shipping_address?.firstName, o.shipping_address?.lastName].filter(Boolean).join(" ");
                  const items = (o.order_items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0);
                  return (
                    <tr key={o.id} className="relative hover:bg-cream/70">
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/admin/orders/${o.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{o.number}</Link>
                        {o.test && <TestBadge />}
                        {o.gift_message && <span title="Gift message" className="ml-1.5">🎁</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{new Date(o.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-3"><span className="block">{name || "—"}</span><span className="text-xs text-ink-soft">{o.email}</span></td>
                      <td className="px-4 py-3">{o.country}</td>
                      <td className="px-4 py-3 tabular-nums">{items}</td>
                      <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                      <td className="px-4 py-3 text-right tabular-nums">{eur(o.total, 2)}{o.refunded_amount > 0 && <span className="block text-xs text-coral-ink">−{eur(o.refunded_amount, 2)}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn-outline min-h-10 py-2" href={link({ page: page - 1 })}>Previous</Link>}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-outline min-h-10 py-2" href={link({ page: page + 1 })}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
