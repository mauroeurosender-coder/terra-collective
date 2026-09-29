import { NextResponse } from "next/server";
import { isEmail } from "@/lib/server/persist";
import { store } from "@/lib/config";

/** Sends a Supabase magic link; logs in dev when Supabase isn't configured. */
export async function POST(req: Request) {
  const { email, locale } = await req.json().catch(() => ({}));
  if (!isEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.info("[dev:magic-link]", email);
    return NextResponse.json({ ok: true, demo: true });
  }
  const res = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: `${store.url}/${locale === "pt" ? "pt" : "en"}/account` } }),
  });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
}
