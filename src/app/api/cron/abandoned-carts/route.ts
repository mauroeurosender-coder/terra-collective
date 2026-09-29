import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { layout, sendEmail } from "@/lib/server/email";
import { store } from "@/lib/config";

/**
 * Abandoned-cart reminders at ~1h and ~24h. Call every 15–30 minutes from a
 * scheduler (e.g. Vercel Cron) with header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = supabaseService();
  const now = Date.now();
  const hourAgo = new Date(now - 3600_000).toISOString();
  const dayAgo = new Date(now - 24 * 3600_000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 3600_000).toISOString();
  const { data: carts } = await sb.from("carts").select("*").is("recovered_order_id", null).not("email", "is", null).lt("updated_at", hourAgo).gt("updated_at", weekAgo).limit(200);
  let sent = 0;
  for (const c of carts ?? []) {
    const stage = !c.reminded_1h_at ? "1h" : !c.reminded_24h_at && c.updated_at < dayAgo ? "24h" : null;
    if (!stage || !c.lines?.length) continue;
    const pt = c.locale === "pt";
    const link = `${store.url}/${c.locale}/checkout?restore=${encodeURIComponent(c.token)}`;
    const items = c.lines.map((l: { name: { en: string; pt: string }; quantity: number }) => `<li>${l.quantity} × ${pt ? l.name.pt : l.name.en}</li>`).join("");
    const subject = stage === "1h" ? (pt ? "Deixou algo no carrinho" : "You left something in your cart") : pt ? "As suas peças ainda estão à espera" : "Your pieces are still waiting";
    const html = layout(
      pt ? "Ainda está a pensar?" : "Still thinking it over?",
      `<p>${pt ? "Guardámos o seu carrinho:" : "We saved your cart:"}</p><ul>${items}</ul>
       <p style="margin:24px 0"><a href="${link}" style="background:#1C2A3A;color:#FAF7F2;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${pt ? "Voltar ao carrinho" : "Return to your cart"}</a></p>
       <p>${pt ? "Cada peça é feita à mão, por isso o stock é limitado." : "Every piece is handmade, so stock is limited."}</p>`,
    );
    const r = await sendEmail(c.email, subject, html);
    if (r.sent || !process.env.RESEND_API_KEY) {
      await sb.from("carts").update(stage === "1h" ? { reminded_1h_at: new Date().toISOString() } : { reminded_24h_at: new Date().toISOString() }).eq("id", c.id);
      if (r.sent) sent++;
    }
  }
  return NextResponse.json({ checked: carts?.length ?? 0, sent });
}
