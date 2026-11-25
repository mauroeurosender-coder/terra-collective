import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { loadPackCandidates } from "@/lib/admin/pack-list";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { PackListPicker } from "@/components/admin/pack-list-picker";

export const metadata = { title: "Pack list" };

export default async function PackListPage({ searchParams }: { searchParams: Promise<{ days?: string; tab?: string }> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Pack list" /><NotConnected /></>;
  const { days: d, tab } = await searchParams;
  const days = [7, 30, 90, 180, 365].includes(Number(d)) ? Number(d) : 30;
  const { open, shipped } = await loadPackCandidates(await supabaseServer(), days);
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Pack list" subtitle="Choose the orders to pack, then print one page with country, name, amount paid and the pieces for each order." back={{ href: "/admin/orders", label: "Orders" }} />
      <PackListPicker key={days} open={open} shipped={shipped} days={days} initialTab={tab === "shipped" ? "shipped" : "open"} today={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date())} />
    </div>
  );
}
