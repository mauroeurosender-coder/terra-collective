import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { mergeSettings } from "@/lib/settings";
import { countries } from "@/lib/geo";
import { NotConnected, PageHeader, Card } from "@/components/admin/ui";
import { TestDataPanel } from "@/components/admin/test-data-panel";
import { EtsyPanel } from "@/components/admin/etsy-panel";
import { etsyConfigured, etsyRedirectUri, getEtsy } from "@/lib/server/etsy";
import { EmailsEditor, PaymentsEditor, ShippingEditor, StaffEditor, StoreEditor, VatEditor } from "@/components/admin/settings-editors";

export const metadata = { title: "Settings" };

const tabs = [["store", "Store"], ["shipping", "Shipping"], ["taxes", "Taxes"], ["payments", "Payments"], ["emails", "Emails"], ["staff", "Staff"], ["legal", "Languages & legal"], ["integrations", "Integrations"], ["test-data", "Test data"]];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; etsy?: string }> }) {
  const session = await requireAdmin({ owner: true });
  if (!supabaseConfigured) return <><PageHeader title="Settings" /><NotConnected /></>;
  const { tab = "store", etsy: etsyNotice } = await searchParams;
  const sb = await supabaseServer();
  const [{ data: rows }, { data: staff }] = await Promise.all([sb.from("settings").select("key, value"), sb.from("staff").select("user_id, email, name, role").order("created_at")]);
  const s = mergeSettings(rows ?? []);

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title="Settings" />
      <nav aria-label="Settings sections" className="mb-5 flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${tab === k ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "store" && <StoreEditor initial={s.store} />}
      {tab === "shipping" && <ShippingEditor initial={s.shipping} />}
      {tab === "taxes" && <VatEditor initial={s.vat} countries={countries.map((c) => ({ code: c.code, name: c.name.en, zone: c.zone }))} />}
      {tab === "payments" && <PaymentsEditor initial={s.payments} stripe={!!process.env.STRIPE_SECRET_KEY} />}
      {tab === "emails" && <EmailsEditor initial={s.emails} resend={!!process.env.RESEND_API_KEY} />}
      {tab === "staff" && <StaffEditor staff={staff ?? []} me={session.mode === "live" ? session.userId : null} />}
      {tab === "integrations" && (
        await (async () => {
          const e = await getEtsy();
          const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("source", "etsy");
          return (
            <EtsyPanel
              configured={etsyConfigured()}
              connected={!!e.shop_id}
              shopName={e.shop_name}
              lastSync={e.last_sync_at}
              lastResult={e.last_sync_result}
              options={e.options!}
              redirectUri={etsyRedirectUri()}
              notice={etsyNotice}
              etsyOrders={count ?? 0}
              cron={!!process.env.CRON_SECRET}
            />
          );
        })()
      )}
      {tab === "test-data" && (
        <TestDataPanel
          counts={{
            orders: (await sb.from("orders").select("id", { count: "exact", head: true }).eq("test", true)).count ?? 0,
            events: (await sb.from("analytics_events").select("id", { count: "exact", head: true }).eq("props->>test", "true")).count ?? 0,
          }}
        />
      )}
      {tab === "legal" && (
        <div className="space-y-4">
          <Card title="Languages">
            <p className="text-sm text-ink-soft">The store is in <b>English</b> and <b>Português</b>. Shoppers are sent to their browser’s language and can switch at any time. Product and page texts are edited in both languages side by side.</p>
          </Card>
          <Card title="Legal pages">
            <ul className="divide-y divide-line">
              {[["terms", "Terms & Conditions"], ["privacy", "Privacy Policy"], ["cookies", "Cookie Policy"]].map(([slug, label]) => (
                <li key={slug}><Link href={`/admin/content/pages/${slug}`} className="flex items-center justify-between py-3 text-sm font-medium hover:text-azulejo">{label}<ChevronRight className="h-4 w-4" /></Link></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">The Livro de Reclamações link is always in the footer.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
