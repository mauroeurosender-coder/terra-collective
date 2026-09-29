import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { PostEditor } from "@/components/admin/post-editor";
import type { PostForm } from "../actions";

export const metadata = { title: "Edit post" };

/* eslint-disable @typescript-eslint/no-explicit-any */
const L = (v: any) => ({ en: "", pt: "", ...(v ?? {}) });

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: prods } = await sb.from("products").select("slug, name, product_media(url, position)").eq("status", "active");
  const products = (prods ?? []).map((p: any) => ({ slug: p.slug, name: p.name.en, image: [...(p.product_media ?? [])].sort((a: any, b: any) => a.position - b.position)[0]?.url }));
  let form: PostForm;
  if (id === "new") {
    form = { slug: "", status: "draft", publishAt: null, title: L(null), excerpt: L(null), category: L(null), cover: "", tags: [], author: "Terra Collective", blocks: [{ type: "p", text: L(null) }], seo: { title: L(null), description: L(null) } };
  } else {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const { data: p } = await sb.from("journal_posts").select("*").eq("id", id).maybeSingle();
    if (!p) notFound();
    form = { id: p.id, slug: p.slug, status: p.status, publishAt: p.publish_at, title: L(p.title), excerpt: L(p.excerpt), category: L(p.category), cover: p.cover ?? "", tags: p.tags ?? [], author: p.author ?? "", blocks: p.blocks ?? [], seo: { title: L(p.seo?.title), description: L(p.seo?.description) } };
  }
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader back={{ href: "/admin/journal", label: "Journal" }} title={id === "new" ? "New post" : form.title.en} />
      <PostEditor initial={form} products={products} />
    </div>
  );
}
