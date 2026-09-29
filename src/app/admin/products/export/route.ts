import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { stringifyCsv } from "@/lib/admin/csv";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** One row per variant. Edit price/stock in a spreadsheet and re-import to bulk update by SKU. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured) return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const sb = await supabaseServer();
  const { data } = await sb.from("products").select("slug, status, name, tags, collections(slug), variants(id, sku, options, price, compare_at, stock, position)").order("created_at");
  const rows: (string | number | null)[][] = [["product_slug", "status", "collection", "name_en", "name_pt", "variant_id", "sku", "options", "price_eur", "compare_at_eur", "stock", "tags"]];
  for (const p of (data ?? []) as any[]) {
    for (const v of [...(p.variants ?? [])].sort((a, b) => a.position - b.position)) {
      rows.push([p.slug, p.status, p.collections?.slug ?? "", p.name.en, p.name.pt, v.id, v.sku, Object.values(v.options ?? {}).join(" / "), (v.price / 100).toFixed(2), v.compare_at == null ? "" : (v.compare_at / 100).toFixed(2), v.stock, (p.tags ?? []).join(", ")]);
    }
  }
  return new NextResponse(stringifyCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="terra-products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
