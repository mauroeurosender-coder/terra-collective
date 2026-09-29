import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

/** GDPR access / portability: everything we hold about one customer, as JSON. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: customer } = await sb.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [{ data: orders }, { data: newsletter }, { data: waitlists }, { data: reviews }] = await Promise.all([
    sb.from("orders").select("*, order_items(*)").eq("customer_id", id),
    sb.from("newsletter_subscribers").select("*").eq("email", customer.email),
    sb.from("back_in_stock_requests").select("*").eq("email", customer.email),
    sb.from("reviews").select("*").in("order_id", [...((await sb.from("orders").select("id").eq("customer_id", id)).data ?? []).map((o) => o.id), "00000000-0000-0000-0000-000000000000"]),
  ]);
  const body = JSON.stringify({ exported_at: new Date().toISOString(), customer, orders, newsletter, back_in_stock: waitlists, reviews }, null, 2);
  return new NextResponse(body, {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="customer-${id.slice(0, 8)}.json"` },
  });
}
