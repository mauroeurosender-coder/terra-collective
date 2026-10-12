import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/source";
import { PackingSlipSheet } from "@/components/admin/packing-slip";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Packing slip" };

export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: o } = await sb.from("orders").select("*, order_items(name, variant_label, sku, quantity)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const { store } = await getSettings();
  return (
    <div className="min-h-dvh bg-white print:bg-white">
      <div className="mx-auto max-w-[720px] px-8 py-10 text-ink print:p-0">
        <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
        <PackingSlipSheet o={o} store={store} />
      </div>
    </div>
  );
}
