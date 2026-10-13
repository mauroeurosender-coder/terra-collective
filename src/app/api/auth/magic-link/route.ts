import { NextResponse } from "next/server";
import { isEmail } from "@/lib/server/persist";
import { store } from "@/lib/config";
import { limited } from "@/lib/server/rate-limit";

/** Sends a Supabase magic link; logs in dev when Supabase isn't configured. */
export async function POST(req: Request) {
  const { email, locale } = await req.json().catch(() => ({}));
  if (!isEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const tooMany = limited(req, "magic", 3, 600, email);
  if (tooMany) return tooMany;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.info("[dev:magic-link]", email);
    return NextResponse.json({ ok: true, demo: true });
  }
  const res = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, create_user: false, options: { email_redirect_to: `${store.url}/${locale === "pt" ? "pt" : "en"}/account` } }),
  });
  // Same answer whether or not the email has an account (don’t reveal who is a customer).
  if (!res.ok && res.status >= 500) return NextResponse.json({ ok: false }, { status: 502 });
  return NextResponse.json({ ok: true });
}
