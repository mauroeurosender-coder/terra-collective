import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { emptyL, emptyProduct, type ProductForm } from "@/lib/admin/product-form";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Product" };

/* eslint-disable @typescript-eslint/no-explicit-any */
const L = (v: any) => ({ ...emptyL(), ...(v ?? {}) });

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!supabaseConfigured) return <NotConnected />;
  const { id } = await params;
  const sb = await supabaseServer();
  const [{ data: cols }, { data: all }] = await Promise.all([
    sb.from("collections").select("id, name").order("position"),
    sb.from("products").select("slug, name").order("created_at", { ascending: false }),
  ]);

  let form: ProductForm;
  if (id === "new") {
    form = emptyProduct();
  } else {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const { data: p } = await sb.from("products").select("*, product_media(*), variants(*)").eq("id", id).maybeSingle();
    if (!p) notFound();
    form = {
      id: p.id,
      slug: p.slug,
      status: p.status,
      collectionId: p.collection_id,
      name: L(p.name),
      short: L(p.short),
      description: L(p.description),
      details: { dimensions: L(p.details?.dimensions), materials: L(p.details?.materials), care: L(p.details?.care) },
      media: [...(p.product_media ?? [])].sort((a: any, b: any) => a.position - b.position).map((m: any) => ({ url: m.url, kind: m.kind, alt: L(m.alt) })),
      options: p.options ?? [],
      variants: [...(p.variants ?? [])]
        .sort((a: any, b: any) => a.position - b.position)
        .map((v: any) => ({ id: v.id, options: v.options ?? {}, sku: v.sku, price: v.price, compareAt: v.compare_at, stock: v.stock, imageIndex: v.image_index })),
      colors: p.colors ?? [],
      tags: p.tags ?? [],
      shipping: p.shipping,
      wallPiece: p.wall_piece,
      foodSafe: p.food_safe,
      hidden: p.hidden,
      pairsWith: p.pairs_with ?? [],
      seo: { title: L(p.seo?.title), description: L(p.seo?.description) },
      bestsellerRank: p.bestseller_rank ?? 0,
    };
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title={id === "new" ? "New product" : form.name.en || "Product"} />
      <ProductEditor
        initial={form}
        collections={(cols ?? []).map((c: any) => ({ id: c.id, name: c.name.en }))}
        allProducts={(all ?? []).map((p: any) => ({ slug: p.slug, name: p.name.en }))}
        isOwner={session.role === "owner"}
      />
    </div>
  );
}
