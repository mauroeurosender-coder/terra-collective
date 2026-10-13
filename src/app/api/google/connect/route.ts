import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { googleAuthUrl, googleConfigured } from "@/lib/server/gdrive";

/** Owner clicks "Ligar Google Drive" → Google’s consent screen. */
export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(new URL("/admin/login", store.url));
  if (!googleConfigured()) return NextResponse.redirect(new URL("/admin/accounting?drive=not-configured", store.url));
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("tc_g_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/google" });
  return res;
}
