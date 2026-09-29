import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { Card, NotConnected, PageHeader, eur } from "@/components/admin/ui";
import { DiscountsPanel, GiftCardsPanel, WaitlistPanel, type DiscountRow, type WaitRow } from "@/components/admin/marketing";

export const metadata = { title: "Marketing" };
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const tabs = [["discounts", "Discount codes"], ["promotions", "Automatic promotions"], ["gift-cards", "Gift cards"], ["subscribers", "Newsletter"], ["carts", "Abandoned carts"], ["waitlists", "Back in stock"]];

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Marketing" /><NotConnected /></>;
  const { tab = "discounts" } = await searchParams;
  const sb = await supabaseServer();

  let body: React.ReactNode = null;
  if (tab === "discounts" || tab === "promotions") {
    const { data } = await sb.from("discounts").select("*").eq("automatic", tab === "promotions").order("created_at", { ascending: false });
    const rows: DiscountRow[] = (data ?? []).map((d: any) => ({ id: d.id, code: d.code, kind: d.kind, value: d.value, minSpend: d.min_spend, startsAt: d.starts_at, endsAt: d.ends_at, usageLimit: d.usage_limit, automatic: d.automatic, active: d.active, usedCount: d.used_count }));
    body = <DiscountsPanel rows={rows} automatic={tab === "promotions"} />;
  } else if (tab === "gift-cards") {
    const { data } = await sb.from("gift_cards").select("*").order("created_at", { ascending: false });
    body = <GiftCardsPanel rows={(data ?? []).map((g: any) => ({ id: g.id, code: g.code, initial: g.initial_value, balance: g.balance, recipient: g.recipient_name ?? g.recipient_email, expires: g.expires_at, created: g.created_at }))} />;
  } else if (tab === "subscribers") {
    const [{ data, count }, { count: month }] = await Promise.all([
      sb.from("newsletter_subscribers").select("email, locale, source, consent_at", { count: "exact" }).is("unsubscribed_at", null).order("consent_at", { ascending: false }).limit(100),
      sb.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("consent_at", daysAgo(30)),
    ]);
    body = (
      <Card title={`${count ?? 0} subscribers`} action={<a download href="/admin/marketing/subscribers" className="btn-outline min-h-9 py-1.5 text-sm"><Download className="h-4 w-4" /> Export CSV</a>}>
        <p className="mb-4 text-sm text-ink-soft">{month ?? 0} joined in the last 30 days. Export to your email tool (Brevo, Mailchimp, Klaviyo) to send newsletters. New subscribers get the WELCOME10 code.</p>
        {!data?.length ? <p className="text-sm text-ink-soft">No subscribers yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {data.map((r: any) => (
              <li key={r.email} className="flex flex-wrap items-center gap-3 py-2.5"><span className="flex-1">{r.email}</span><span className="text-ink-soft">{r.locale.toUpperCase()} · {r.source ?? "—"}</span><span className="text-ink-soft">{new Date(r.consent_at).toLocaleDateString("en-GB")}</span></li>
            ))}
          </ul>
        )}
      </Card>
    );
  } else if (tab === "carts") {
    const { data } = await sb.from("carts").select("*").not("email", "is", null).order("updated_at", { ascending: false }).limit(100);
    const open = (data ?? []).filter((c: any) => !c.recovered_order_id);
    const recovered = (data ?? []).filter((c: any) => c.recovered_order_id);
    const openValue = open.reduce((n: number, c: any) => n + c.value, 0);
    body = (
      <Card title="Abandoned carts">
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-cream p-3"><p className="text-ink-soft">Open carts</p><p className="headline text-2xl">{open.length}</p></div>
          <div className="rounded-xl bg-cream p-3"><p className="text-ink-soft">Value at stake</p><p className="headline text-2xl">{eur(openValue)}</p></div>
          <div className="rounded-xl bg-cream p-3"><p className="text-ink-soft">Recovered</p><p className="headline text-2xl">{recovered.length}</p></div>
        </div>
        <p className="mb-4 text-sm text-ink-soft">Carts are saved once a shopper enters their email at checkout. Reminder emails go out at about 1 hour and 24 hours{process.env.CRON_SECRET && process.env.RESEND_API_KEY ? "." : ", once the site is hosted with a scheduled job and Resend is connected."}</p>
        {!data?.length ? <p className="text-sm text-ink-soft">No carts yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {data.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex-1"><span className="font-medium">{c.email}</span><span className="block text-xs text-ink-soft">{(c.lines ?? []).map((l: any) => `${l.quantity}× ${l.name?.en}`).join(", ")}</span></span>
                <span className="text-ink-soft">{new Date(c.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="tabular-nums">{eur(c.value, 2)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.recovered_order_id ? "bg-olive-tint text-olive" : "bg-ink/5 text-ink-soft"}`}>{c.recovered_order_id ? "Recovered" : c.reminded_24h_at ? "2 reminders" : c.reminded_1h_at ? "1 reminder" : "Open"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  } else if (tab === "waitlists") {
    const { data } = await sb.from("back_in_stock_requests").select("variant_id, variants(stock, options, products(name))").is("notified_at", null);
    const map = new Map<string, WaitRow>();
    for (const r of (data ?? []) as any[]) {
      const cur = map.get(r.variant_id) ?? { variantId: r.variant_id, product: r.variants?.products?.name?.en ?? r.variant_id, variant: Object.values(r.variants?.options ?? {}).join(" · "), stock: r.variants?.stock ?? 0, waiting: 0 };
      cur.waiting++;
      map.set(r.variant_id, cur);
    }
    body = <WaitlistPanel rows={[...map.values()].sort((a, b) => b.waiting - a.waiting)} />;
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title="Marketing" />
      <nav aria-label="Marketing sections" className="mb-5 flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${tab === k ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {body}
    </div>
  );
}
