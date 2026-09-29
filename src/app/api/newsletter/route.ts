import { NextResponse } from "next/server";
import { insertRow, isEmail } from "@/lib/server/persist";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!isEmail(body.email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const code = "WELCOME10";
  await insertRow("newsletter_subscribers", {
    email: body.email.toLowerCase(),
    locale: body.locale === "pt" ? "pt" : "en",
    source: String(body.source ?? "footer").slice(0, 40),
    consent_at: new Date().toISOString(),
  });
  // TODO(emails): send welcome email with the code via Resend (lib/email) once RESEND_API_KEY is set.
  return NextResponse.json({ ok: true, code });
}
