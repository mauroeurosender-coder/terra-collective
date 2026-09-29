"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function updateReview(id: string, patch: { status?: "pending" | "approved" | "rejected"; featured?: boolean; reply?: string }): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const row: Record<string, unknown> = { ...patch };
  if (patch.reply != null) row.reply = patch.reply.trim().slice(0, 1000) || null;
  const { error } = await sb.from("reviews").update(row).eq("id", id);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/reviews");
  return { ok: true, message: patch.status ? `Review ${patch.status}.` : "Saved." };
}

export async function deleteReview(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/reviews");
  return { ok: true };
}
