import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { getCountry } from "@/lib/geo";
import { Card, NotConnected, PageHeader, StatusPill, eur } from "@/components/admin/ui";
import { CustomerPanel } from "@/components/admin/customer-panel";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!supabaseConfigured) return <NotConnected />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseServer();
  const [{ data: c }, { data: orders }] = await Promise.all([
    sb.from("customer_stats").select("*").eq("id", id).maybeSingle(),
    sb.from("orders").select("id, number, created_at, status, total, refunded_amount, shipping_address, order_items(quantity)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const last = orders?.[0]?.shipping_address ?? {};
  const aov = c.order_count ? Math.round(c.lifetime_value / c.order_count) : 0;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader back={{ href: "/admin/customers", label: "Customers" }} title={[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email} subtitle={`Customer since ${new Date(c.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`} />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[["Lifetime value", eur(c.lifetime_value, 2)], ["Orders", String(c.order_count)], ["Average order", eur(aov, 2)]].map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-4">
                <p className="text-xs text-ink-soft">{k}</p>
                <p className="headline mt-1 text-2xl tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <Card title="Order history">
            {!orders?.length ? <p className="text-sm text-ink-soft">No orders yet.</p> : (
              <ul className="divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:text-azulejo">
                      <span className="font-semibold">{o.number}</span>
                      <span className="text-ink-soft">{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="text-ink-soft">{(o.order_items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0)} items</span>
                      <StatusPill status={o.status} />
                      <span className="ml-auto tabular-nums">{eur(o.total, 2)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Card title="Contact">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-ink-soft" /><a className="link" href={`mailto:${c.email}`}>{c.email}</a></li>
              {c.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-ink-soft" />{c.phone}</li>}
              {c.nif && <li className="text-ink-soft">NIF {c.nif}</li>}
              {last.address1 && (
                <li className="flex gap-2 text-ink-soft"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{last.address1}, {last.postal} {last.city}, {getCountry(c.country).name.en}</span></li>
              )}
            </ul>
          </Card>
          <CustomerPanel id={c.id} tags={c.tags ?? []} notes={c.notes ?? ""} newsletter={c.newsletter} isOwner={session.role === "owner"} />
        </div>
      </div>
    </div>
  );
}
