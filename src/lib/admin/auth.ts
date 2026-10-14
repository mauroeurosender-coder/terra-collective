import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseConfigured, supabaseServer } from "../supabase/server";

export type AdminSession =
  | { mode: "demo"; name: string; email: string; role: "owner" }
  | { mode: "live"; userId: string; name: string; email: string; role: "owner" | "staff" };

/**
 * Resolves the current admin. With Supabase configured, the user must be
 * signed in AND listed in `staff`. Without it, demo mode is allowed only in
 * development or when ADMIN_DEMO=1 (never in production).
 */
/**
 * Cached per request: the admin frame and the page share one check. getClaims() verifies the
 * login token locally (ES256 signing keys) instead of asking Supabase’s auth server every time.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!supabaseConfigured) {
    const demoAllowed = process.env.NODE_ENV !== "production" || process.env.ADMIN_DEMO === "1";
    return demoAllowed ? { mode: "demo", name: "Demo owner", email: "demo@terracollective.pt", role: "owner" } : null;
  }
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: staff } = await supabase.from("staff").select("name, email, role").eq("user_id", userId).maybeSingle();
  if (!staff) return null;
  return { mode: "live", userId, name: staff.name ?? staff.email, email: staff.email, role: staff.role };
});

export async function requireAdmin(opts: { owner?: boolean } = {}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (opts.owner && session.role !== "owner") redirect("/admin");
  return session;
}
