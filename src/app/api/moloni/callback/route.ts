import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { finishMoloniAuth } from "@/lib/server/moloni";

const site = (path: string) => new URL(path, store.url);

/** Moloni sends the owner back here with an authorisation code. */
export async function GET(req: Request) {
  const back = (q: string) => NextResponse.redirect(site(`/admin/settings?tab=integrations&moloni=${q}`));
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(site("/admin/login"));
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return back("denied");
  try {
    await finishMoloniAuth(code);
  } catch (e) {
    console.error("[moloni] connect failed", e);
    return back("error");
  }
  return back("connected");
}
