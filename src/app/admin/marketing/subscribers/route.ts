import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { stringifyCsv } from "@/lib/admin/csv";

/** Newsletter subscriber export (for Mailchimp, Brevo, Klaviyo…). */
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = await supabaseServer();
  const { data } = await sb.from("newsletter_subscribers").select("email, locale, source, consent_at").is("unsubscribed_at", null).order("consent_at", { ascending: false });
  const csv = stringifyCsv([["email", "language", "source", "consent_at"], ...(data ?? []).map((r) => [r.email, r.locale, r.source, r.consent_at])]);
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
