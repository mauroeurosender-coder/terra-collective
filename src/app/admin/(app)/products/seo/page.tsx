import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { SeoEditor, type SeoRow } from "@/components/admin/seo-editor";
import { geminiConfigured } from "@/lib/server/gemini";

export const metadata = { title: "SEO dos produtos" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ProductSeoPage() {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="SEO dos produtos" /><NotConnected /></>;
  const sb = await supabaseServer();
  const { data } = await sb
    .from("products")
    .select("id, slug, status, name, seo, etsy_listing_id, product_media(url, position, kind)")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const rows: SeoRow[] = (data ?? []).map((p: any) => {
    const img = [...(p.product_media ?? [])].filter((m: any) => m.kind === "image").sort((a: any, b: any) => a.position - b.position)[0];
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      image: img?.url ?? null,
      etsy: Boolean(p.etsy_listing_id),
      etsyTitle: p.seo?.etsy_title || p.name?.en || "",
      current: {
        name_en: p.name?.en ?? "",
        name_pt: p.name?.pt ?? "",
        seo_title_en: p.seo?.title?.en ?? "",
        seo_title_pt: p.seo?.title?.pt ?? "",
        meta_en: p.seo?.description?.en ?? "",
        meta_pt: p.seo?.description?.pt ?? "",
        slug: p.slug,
      },
      proposal: p.seo?.proposal ?? null,
      approvedAt: p.seo?.approved_at ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="SEO dos produtos"
        subtitle="Nomes curtos para o site + título e descrição para o Google, em inglês e português. Nada muda no site até aprovar, e os títulos do Etsy nunca são alterados."
      />
      <SeoEditor rows={rows} gemini={geminiConfigured()} />
    </div>
  );
}
