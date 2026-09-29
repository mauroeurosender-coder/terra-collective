"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { slugify } from "@/lib/admin/product-form";
import type { JournalBlock, L } from "@/lib/types";

export type PostForm = {
  id?: string;
  slug: string;
  status: "draft" | "scheduled" | "published";
  publishAt: string | null;
  title: L;
  excerpt: L;
  category: L;
  cover: string;
  tags: string[];
  author: string;
  blocks: JournalBlock[];
  seo: { title: L; description: L };
};

type Result = { ok: true; id?: string; message?: string } | { ok: false; error: string };

const words = (blocks: JournalBlock[]) =>
  blocks.reduce((n, b) => n + ("text" in b ? b.text.en.split(/\s+/).filter(Boolean).length : 0), 0);

export async function savePost(f: PostForm): Promise<Result> {
  await requireAdmin();
  const slug = slugify(f.slug || f.title.en);
  if (!f.title.en.trim()) return { ok: false, error: "Add an English title." };
  if (!slug) return { ok: false, error: "Add a URL." };
  if (f.status === "scheduled" && !f.publishAt) return { ok: false, error: "Pick a date and time to publish." };
  if (f.status !== "draft" && !f.cover) return { ok: false, error: "Add a cover image before publishing." };
  const publishAt = f.status === "published" ? f.publishAt ?? new Date().toISOString() : f.publishAt;
  const row = {
    slug,
    status: f.status,
    publish_at: publishAt,
    title: f.title,
    excerpt: f.excerpt,
    category: f.category,
    cover: f.cover || null,
    tags: f.tags,
    author: f.author || "Terra Collective",
    blocks: f.blocks,
    seo: f.seo,
    reading_minutes: Math.max(1, Math.round(words(f.blocks) / 200)),
  };
  const sb = await supabaseServer();
  const res = f.id ? await sb.from("journal_posts").update(row).eq("id", f.id).select("id").single() : await sb.from("journal_posts").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "Another post uses that URL." : res.error.message };
  invalidateCatalog();
  revalidatePath("/admin/journal");
  return { ok: true, id: res.data.id, message: f.status === "published" ? "Published." : f.status === "scheduled" ? "Scheduled." : "Draft saved." };
}

export async function deletePost(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("journal_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/journal");
  return { ok: true };
}
