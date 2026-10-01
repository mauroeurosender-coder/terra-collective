import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { etsyConfigured, startEtsyAuth } from "@/lib/server/etsy";

/** Owner clicks “Connect Etsy” → redirected to Etsy to approve access. */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!etsyConfigured()) return NextResponse.redirect(new URL("/admin/settings?tab=integrations&etsy=missing-key", req.url));
  return NextResponse.redirect(await startEtsyAuth());
}
