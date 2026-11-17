import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { quarterRange } from "@/lib/admin/tax";
import { quarterWorkbook } from "@/lib/admin/quarter-workbook";

/** The quarter as one Excel file (sales, VAT per country, purchases, suppliers, credit notes) to check against the Portal das Finanças. */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = quarterRange(new URL(req.url).searchParams.get("q") ?? "");
  const body = await quarterWorkbook(await supabaseServer(), q.key);
  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="terra-collective-IVA-${q.year}-T${q.n}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
