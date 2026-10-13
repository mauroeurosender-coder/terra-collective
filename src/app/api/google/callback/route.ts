import { NextResponse, type NextRequest } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { finishGoogleAuth, syncDrive } from "@/lib/server/gdrive";

/** Google sends the owner back here; then the first copy runs. */
export async function GET(req: NextRequest) {
  const back = (q: string) => {
    const r = NextResponse.redirect(new URL(`/admin/accounting?drive=${q}`, store.url));
    r.cookies.delete({ name: "tc_g_state", path: "/api/google" });
    return r;
  };
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(new URL("/admin/login", store.url));
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  if (!code) return back("denied");
  if (!u.searchParams.get("state") || u.searchParams.get("state") !== req.cookies.get("tc_g_state")?.value) return back("error");
  try {
    await finishGoogleAuth(code);
  } catch (e) {
    console.error("[drive] connect failed", e);
    return back("error");
  }
  try {
    await syncDrive();
  } catch (e) {
    console.error("[drive] first sync failed", e);
  }
  return back("connected");
}
