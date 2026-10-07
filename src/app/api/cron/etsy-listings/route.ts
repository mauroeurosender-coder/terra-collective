import { NextResponse } from "next/server";
import { getEtsy, importEtsyListings } from "@/lib/server/etsy";
import { invalidateCatalog } from "@/lib/data/source";

/** Nightly: refresh prices/stock from Etsy and add any new listings as drafts (Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cur = await getEtsy();
  if (!cur.shop_id) return NextResponse.json({ skipped: "not connected" });
  try {
    const r = await importEtsyListings();
    invalidateCatalog();
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
