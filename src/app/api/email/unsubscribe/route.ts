import { timingSafeEqual } from "node:crypto";
import { supabaseService } from "@/lib/supabase/server";
import { unsubscribeToken } from "@/lib/server/sequences";
import { store } from "@/lib/config";

/** One-click unsubscribe from all automated and newsletter emails (signed link in every email). */
async function handle(req: Request) {
  const u = new URL(req.url);
  const email = (u.searchParams.get("e") ?? "").trim().toLowerCase();
  const t = u.searchParams.get("t") ?? "";
  const expected = email ? unsubscribeToken(email) : "";
  const ok = email && t.length === expected.length && timingSafeEqual(Buffer.from(t), Buffer.from(expected));
  if (ok) {
    const sb = supabaseService();
    const now = new Date().toISOString();
    await Promise.all([
      sb.from("email_suppressions").upsert({ email, reason: "unsubscribed" }, { onConflict: "email" }),
      sb.from("newsletter_subscribers").update({ unsubscribed_at: now }).eq("email", email).is("unsubscribed_at", null),
      sb.from("customers").update({ newsletter: false }).eq("email", email),
    ]);
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${store.name}</title>
<body style="margin:0;background:#FAF7F2;font-family:Helvetica,Arial,sans-serif;color:#1C2A3A;display:grid;place-items:center;min-height:100vh;padding:16px">
<div style="max-width:420px;text-align:center"><p style="font-family:Georgia,serif;font-size:22px">Terra <i>Collective</i></p>
<p style="font-size:18px">${ok ? "You’re unsubscribed. You won’t receive these emails any more." : "This unsubscribe link isn’t valid."}</p>
<p style="color:#4A5868">${ok ? "Cancelou a subscrição. Não vai receber mais estes emails." : "Este link não é válido."}</p>
<p><a href="${store.url}" style="color:#1C2A3A">terracolective.shop</a></p></div></body>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } });
}
export const GET = handle;
// Mail apps' one-click unsubscribe uses POST.
export const POST = handle;
