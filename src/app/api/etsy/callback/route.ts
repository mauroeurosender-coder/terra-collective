import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { finishEtsyAuth, syncEtsyOrders } from "@/lib/server/etsy";

// Behind a host proxy req.url can be an internal address (e.g. 0.0.0.0:3000), so redirect to the public site URL.
const site = (path: string) => new URL(path, store.url);

/** Etsy sends the owner back here after approving access. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(site(`/admin/settings?tab=integrations&etsy=${q}`));
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(site("/admin/login"));
  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return back("error");
  try {
    await finishEtsyAuth(code, state);
  } catch (e) {
    console.error("[etsy] connect failed", e);
    return back("error");
  }
  // First import right away (best effort; the scheduled sync catches up otherwise).
  try {
    await syncEtsyOrders({ full: true });
  } catch (e) {
    console.error("[etsy] first sync failed", e);
  }
  return back("connected");
}
