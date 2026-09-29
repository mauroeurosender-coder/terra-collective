"use server";

import { redirect } from "next/navigation";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

export async function signIn(_: unknown, form: FormData) {
  if (!supabaseConfigured) redirect("/admin");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Those details don’t match an account." };
  const { data: staff } = await sb.from("staff").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!staff) {
    await sb.auth.signOut();
    return { error: "This account doesn’t have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  if (supabaseConfigured) await (await supabaseServer()).auth.signOut();
  redirect("/admin/login");
}
