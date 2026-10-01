"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer, supabaseService } from "@/lib/supabase/server";
import { store } from "@/lib/config";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function owner() {
  const s = await requireAdmin({ owner: true });
  return s;
}

/** Sends a Supabase invite email; the person sets their own password and gets admin access. */
export async function inviteStaff(email: string, name: string, role: "owner" | "staff"): Promise<Result> {
  await owner();
  email = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  const admin = supabaseService();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${store.url}/admin/login` });
    if (error) return { ok: false, error: error.message };
    user = data.user;
  }
  const { error } = await admin.from("staff").upsert({ user_id: user!.id, email, name: name.trim() || null, role });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: list?.users.some((u) => u.email?.toLowerCase() === email) ? "Access granted to the existing account." : `Invitation sent to ${email}.` };
}

export async function setStaffRole(userId: string, role: "owner" | "staff"): Promise<Result> {
  const me = await owner();
  if (me.mode === "live" && me.userId === userId && role !== "owner") return { ok: false, error: "You can’t remove your own owner role." };
  const sb = await supabaseServer();
  const { error } = await sb.from("staff").update({ role }).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Role updated." };
}

export async function removeStaff(userId: string): Promise<Result> {
  const me = await owner();
  if (me.mode === "live" && me.userId === userId) return { ok: false, error: "You can’t remove yourself." };
  const sb = await supabaseServer();
  const { error } = await sb.from("staff").delete().eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Access removed. Their login no longer opens the admin." };
}

/** Generates test orders + visits for one chunk of days (the UI calls this repeatedly). */
export async function generateTestChunk(fromDaysAgo: number, toDaysAgo: number) {
  await owner();
  const { generateTestData } = await import("@/lib/admin/test-data");
  try {
    const r = await generateTestData(supabaseService(), Math.min(365, fromDaysAgo), Math.max(0, toDaysAgo));
    revalidatePath("/admin", "layout");
    return { ok: true as const, ...r };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function clearAllTestData(): Promise<Result> {
  await owner();
  const { clearTestData } = await import("@/lib/admin/test-data");
  try {
    const r = await clearTestData(supabaseService());
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Removed ${r.orders} test orders, ${r.events} test visit events and ${r.customers} test customers.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ------------------------------------------------------------------ Etsy */

export async function etsySyncNow(full = false): Promise<Result> {
  await owner();
  const { syncEtsyOrders } = await import("@/lib/server/etsy");
  try {
    const r = await syncEtsyOrders({ full });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Etsy sync finished: ${r.result}.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function etsySaveOptions(options: { reduceStock: boolean; pushTracking: boolean; importSince: string }): Promise<Result> {
  await owner();
  const { saveEtsy } = await import("@/lib/server/etsy");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.importSince)) return { ok: false, error: "Pick a start date." };
  await saveEtsy({ options });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Etsy options saved." };
}

export async function etsyDisconnect(): Promise<Result> {
  await owner();
  const { disconnectEtsy } = await import("@/lib/server/etsy");
  await disconnectEtsy();
  revalidatePath("/admin/settings");
  return { ok: true, message: "Etsy disconnected. Imported orders stay in your admin." };
}
