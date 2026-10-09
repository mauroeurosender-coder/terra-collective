import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { InventoryEditor, type InvItem } from "@/components/admin/inventory-editor";

export const metadata = { title: "Inventário" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function InventoryPage() {
  const session = await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Inventário" /><NotConnected /></>;
  const sb = await supabaseServer();
  const [{ data: items }, { data: comps }, { data: moves }, { data: vs }] = await Promise.all([
    sb.from("inventory_items").select("*").order("name"),
    sb.from("variant_components").select("variant_id, item_id, qty, variants(stock, options, products(name))"),
    sb.from("inventory_movements").select("item_id, qty, reason, ref, created_at").order("created_at", { ascending: false }).limit(500),
    sb.from("variants").select("id, sku, options, products!inner(name, status)").neq("products.status", "archived"),
  ]);
  const label = (v: any) => `${v.products?.name?.en ?? "?"}${Object.values(v.options ?? {}).length ? ` · ${Object.values(v.options).join(" · ")}` : ""}`;
  const list: InvItem[] = (items ?? []).map((i: any) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    keywords: i.keywords ?? [],
    stock: i.stock,
    unit_cost: i.unit_cost,
    low_stock: i.low_stock,
    notes: i.notes,
    uses: (comps ?? []).filter((c: any) => c.item_id === i.id).map((c: any) => ({ variantId: c.variant_id, label: label(c.variants), qty: c.qty, canMake: c.variants?.stock ?? 0 })),
    movements: (moves ?? []).filter((m: any) => m.item_id === i.id).slice(0, 40).map((m: any) => ({ qty: m.qty, reason: m.reason, ref: m.ref, at: m.created_at })),
  }));
  const variants = (vs ?? []).map((v: any) => ({ id: v.id, label: `${label(v)} (${v.sku})` })).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader
        title="Inventário"
        subtitle="Artigos que compra (ex.: baralhos, sardinhas) e de que produtos fazem parte. As compras somam, as vendas no site e na Etsy descontam."
      />
      <InventoryEditor items={list} variants={variants} isOwner={session.role === "owner"} />
    </div>
  );
}
