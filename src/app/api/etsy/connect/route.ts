import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { etsyConfigured, startEtsyAuth } from "@/lib/server/etsy";

// Behind a host proxy req.url can be an internal address (e.g. 0.0.0.0:3000), so redirect to the public site URL.
const site = (path: string) => new URL(path, store.url);

/** Owner clicks “Connect Etsy” → redirected to Etsy to approve access. */
export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(site("/admin/login"));
  if (!etsyConfigured()) return NextResponse.redirect(site("/admin/settings?tab=integrations&etsy=missing-key"));
  return NextResponse.redirect(await startEtsyAuth());
}
