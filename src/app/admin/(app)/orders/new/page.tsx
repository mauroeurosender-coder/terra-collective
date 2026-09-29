import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { countries } from "@/lib/geo";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { NewOrderForm, type PickerProduct } from "@/components/admin/new-order-form";

export const metadata = { title: "New order" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function NewOrderPage() {
  await requireAdmin();
  if (!supabaseConfigured) return <NotConnected />;
  const sb = await supabaseServer();
  const { data } = await sb.from("products").select("id, name, status, product_media(url, position, kind), variants(id, options, price, stock, position)").neq("status", "archived").order("created_at", { ascending: false });
  const products: PickerProduct[] = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name.en + (p.status === "draft" ? " (draft)" : ""),
    image: [...(p.product_media ?? [])].filter((m: any) => m.kind === "image").sort((a: any, b: any) => a.position - b.position)[0]?.url,
    variants: [...(p.variants ?? [])].sort((a: any, b: any) => a.position - b.position).map((v: any) => ({ id: v.id, label: Object.values(v.options ?? {}).join(" · "), price: v.price, stock: v.stock })),
  }));
  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader back={{ href: "/admin/orders", label: "Orders" }} title="New order" subtitle="For sales outside the website: markets, Instagram messages, bank transfers, wholesale." />
      <NewOrderForm products={products} countries={countries.map((c) => ({ code: c.code, name: c.name.en }))} />
    </div>
  );
}
