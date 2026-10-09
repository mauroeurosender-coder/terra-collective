import Link from "next/link";
import { Download, Plus, Search, Sparkles, Upload } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { EmptyState, NotConnected, PageHeader } from "@/components/admin/ui";
import { ProductTable, type ProductRow } from "@/components/admin/product-table";

export const metadata = { title: "Products" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Products" /><NotConnected /></>;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: cols }, { data }] = await Promise.all([
    sb.from("collections").select("id, slug, name").order("position"),
    (() => {
      let q = sb.from("products").select("id, slug, name, status, collection_id, product_media(url, position, kind), variants(stock, price)").order("created_at", { ascending: false });
      if (sp.status) q = q.eq("status", sp.status);
      if (sp.collection) q = q.eq("collection_id", sp.collection);
      if (sp.q) q = q.or(`slug.ilike.%${sp.q.replace(/[,()%]/g, " ")}%,name->>en.ilike.%${sp.q.replace(/[,()%]/g, " ")}%`);
      return q;
    })(),
  ]);
  const colName = new Map((cols ?? []).map((c: any) => [c.id, c.name.en]));
  let rows: ProductRow[] = (data ?? []).map((p: any) => {
    const prices = (p.variants ?? []).map((v: any) => v.price);
    const img = [...(p.product_media ?? [])].filter((m: any) => m.kind === "image").sort((a: any, b: any) => a.position - b.position)[0];
    return {
      id: p.id, slug: p.slug, name: p.name.en, status: p.status, collection: colName.get(p.collection_id) ?? "—", image: img?.url,
      stock: (p.variants ?? []).reduce((n: number, v: any) => n + v.stock, 0), variants: p.variants?.length ?? 0,
      min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0,
    };
  });
  if (sp.stock === "low") rows = rows.filter((r) => r.stock <= 3);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Products"
        subtitle={`${rows.length} product${rows.length === 1 ? "" : "s"}`}
        actions={
          <>
            <a download href="/admin/products/export" className="btn-outline min-h-10 py-2 text-sm"><Download className="h-4 w-4" /> Export CSV</a>
            <Link href="/admin/products/seo" className="btn-outline min-h-10 py-2 text-sm"><Sparkles className="h-4 w-4" /> SEO</Link>
            <Link href="/admin/products/import" className="btn-outline min-h-10 py-2 text-sm"><Upload className="h-4 w-4" /> Import</Link>
            <Link href="/admin/products/new" className="btn-primary min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> New product</Link>
          </>
        }
      />
      <form className="mb-5 flex flex-wrap gap-2" action="/admin/products">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input name="q" defaultValue={sp.q} placeholder="Search products" className="field rounded-full py-2.5 pl-10" />
        </label>
        <select name="status" aria-label="Status" defaultValue={sp.status ?? ""} className="field w-auto rounded-full py-2.5">
          <option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select name="collection" aria-label="Collection" defaultValue={sp.collection ?? ""} className="field w-auto rounded-full py-2.5">
          <option value="">All collections</option>
          {(cols ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name.en}</option>)}
        </select>
        <select name="stock" aria-label="Stock" defaultValue={sp.stock ?? ""} className="field w-auto rounded-full py-2.5">
          <option value="">Any stock</option><option value="low">Low or sold out</option>
        </select>
        <button className="btn-primary min-h-11 px-5 py-2">Filter</button>
      </form>
      {rows.length ? (
        <ProductTable rows={rows} collections={(cols ?? []).map((c: any) => ({ id: c.id, name: c.name.en }))} />
      ) : (
        <EmptyState title="No products found" action={<Link href="/admin/products/new" className="btn-primary">Add your first product</Link>} />
      )}
    </div>
  );
}
