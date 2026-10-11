import { NextResponse } from "next/server";
import { runSequences } from "@/lib/server/sequences";

/**
 * All automated email sequences (abandoned cart, welcome, after purchase, win-back,
 * back in stock). Called every 15 minutes by Supabase pg_cron with
 * `Authorization: Bearer $CRON_SECRET`. Sends nothing until RESEND_API_KEY is set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await runSequences({ send: true });
  return NextResponse.json({ due: r.due.length, sent: r.sent, emailConnected: r.emailConnected });
}
