import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { pages as staticPages, type ContentPage } from "@/lib/data/pages";
import { PageHeader } from "@/components/admin/ui";
import { PageEditor } from "@/components/admin/content-editors";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await requireAdmin();
  const { slug } = await params;
  const fallback = staticPages[slug];
  if (!fallback) notFound();
  const legal = ["terms", "privacy", "cookies"].includes(slug);
  const sb = await supabaseServer();
  const { data } = await sb.from("pages").select("content").eq("slug", slug).maybeSingle();
  const page = (data?.content as ContentPage | undefined)?.sections ? (data!.content as ContentPage) : fallback;
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader back={{ href: "/admin/content?tab=pages", label: "Content" }} title={page.title.en} subtitle={legal ? "Legal text. Have changes reviewed before publishing." : undefined} />
      {legal && session.role !== "owner" ? <p className="text-ink-soft">Only the owner can edit legal pages.</p> : <PageEditor slug={slug} initial={page} customised={!!data} />}
    </div>
  );
}
