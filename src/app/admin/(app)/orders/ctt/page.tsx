import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { CttExport } from "@/components/admin/ctt-export";
import { loadCttOrders } from "@/lib/admin/ctt-orders";

export const metadata = { title: "CTT shipping" };

export default async function CttPage() {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="CTT shipping" /><NotConnected /></>;
  const { orders } = await loadCttOrders(await supabaseServer());
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title="CTT shipping"
        subtitle="Paid orders from Etsy and the website, ready for CTT’s bulk labels: weights from your products plus the box, customs filled in outside Portugal."
      />
      <CttExport orders={orders} />
    </div>
  );
}
