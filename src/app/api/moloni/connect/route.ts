import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { moloniAuthUrl, moloniConfigured } from "@/lib/server/moloni";

const site = (path: string) => new URL(path, store.url);

/** Owner clicks “Ligar Moloni” → Moloni asks them to authorise this app. */
export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(site("/admin/login"));
  if (!moloniConfigured()) return NextResponse.redirect(site("/admin/settings?tab=integrations&moloni=missing-key"));
  return NextResponse.redirect(moloniAuthUrl());
}
