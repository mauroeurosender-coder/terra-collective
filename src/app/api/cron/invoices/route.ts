import { NextResponse } from "next/server";
import { getMoloni, invoicePendingOrders, syncInvoiceStatuses } from "@/lib/server/moloni";
import { syncDrive } from "@/lib/server/gdrive";

/** Every 15 minutes: Moloni draft invoices for newly paid orders (Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  const m = await getMoloni();
  if (m.company_id) {
    try {
      const statuses = await syncInvoiceStatuses();
      Object.assign(out, await invoicePendingOrders(), statuses);
    } catch (e) {
      out.moloniError = (e as Error).message;
    }
  } else out.moloni = "not connected";
  // Copies of documents and issued invoices in Google Drive (after Moloni, so new invoices are included).
  try {
    out.drive = await syncDrive();
  } catch (e) {
    out.driveError = (e as Error).message;
  }
  return NextResponse.json(out, { status: out.moloniError ? 500 : 200 });
}
