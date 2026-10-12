import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { loadCttOrders } from "@/lib/admin/ctt-orders";
import { buildCttFile } from "@/lib/server/ctt";

type Body = { orders: { id: string; kg: number; lines: { productId: string | null; desc: string; hs: string; qty: number; value: number; kg: number }[] }[]; saveCustoms: boolean };

/** Builds the CTT bulk-label .xlsx for the selected orders (weights/customs as edited on screen). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.orders?.length || body.orders.length > 500) return NextResponse.json({ error: "Choose at least one order." }, { status: 400 });
  const sb = await supabaseServer();
  const { orders, settings } = await loadCttOrders(sb, body.orders.map((o) => o.id));
  const byId = new Map(orders.map((o) => [o.id, o]));

  const shipments = body.orders.flatMap((sel) => {
    const o = byId.get(sel.id);
    if (!o) return [];
    const kg = Number(sel.kg);
    return [{
      name: o.name, address: o.address, postal: o.postal, city: o.city, region: o.region, country: o.country, email: o.email, phone: o.phone,
      kg: Number.isFinite(kg) && kg > 0 ? kg : 0.1,
      reference: o.number,
      customs: o.country === "PT" ? [] : sel.lines.map((l) => ({ desc: String(l.desc).slice(0, 60), hs: String(l.hs).replace(/\D/g, ""), qty: Math.max(1, Math.round(l.qty)), value: Math.max(0, Number(l.value) || 0), kg: Math.max(0, Number(l.kg) || 0) })),
    }];
  });

  // Remember customs description + code on each product for next time.
  if (body.saveCustoms) {
    const seen = new Set<string>();
    for (const sel of body.orders) for (const l of sel.lines) {
      if (!l.productId || seen.has(l.productId) || !l.desc.trim() || !l.hs.trim()) continue;
      seen.add(l.productId);
      await sb.from("products").update({ customs_desc: l.desc.trim().slice(0, 60), hs_code: l.hs.replace(/\D/g, "") }).eq("id", l.productId);
    }
  }

  const file = await buildCttFile(shipments, settings.ctt);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="CTT-envios-${stamp}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
