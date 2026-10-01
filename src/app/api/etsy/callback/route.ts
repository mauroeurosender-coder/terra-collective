import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { finishEtsyAuth, syncEtsyOrders } from "@/lib/server/etsy";

/** Etsy sends the owner back here after approving access. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/settings?tab=integrations&etsy=${q}`, req.url));
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(new URL("/admin/login", req.url));
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
