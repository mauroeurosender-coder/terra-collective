import { NextResponse } from "next/server";
import { getEtsy, syncEtsyOrders } from "@/lib/server/etsy";

/** Called every 15 minutes by the scheduled function (Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cur = await getEtsy();
  if (!cur.shop_id) return NextResponse.json({ skipped: "not connected" });
  try {
    const full = new URL(req.url).searchParams.get("full") === "1";
    return NextResponse.json(await syncEtsyOrders({ full }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
