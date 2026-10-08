import { NextResponse } from "next/server";
import { getMoloni, invoicePendingOrders, syncInvoiceStatuses } from "@/lib/server/moloni";

/** Every 15 minutes: Moloni draft invoices for newly paid orders (Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const m = await getMoloni();
  if (!m.company_id) return NextResponse.json({ skipped: "not connected" });
  try {
    const statuses = await syncInvoiceStatuses();
    return NextResponse.json({ ...(await invoicePendingOrders()), ...statuses });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
