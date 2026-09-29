import { NextResponse } from "next/server";
import { isEmail } from "@/lib/server/persist";
import { supabaseService } from "@/lib/supabase/server";

/** Storefront review submission. Reviews start as "pending" until approved in the admin. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const rating = Number(b?.rating);
  if (!b || typeof b.slug !== "string" || !isEmail(b.email) || !b.name?.trim() || !b.body?.trim() || !(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (b.website) return NextResponse.json({ ok: true }); // honeypot
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.info("[dev:review]", b.slug, rating);
    return NextResponse.json({ ok: true });
  }
  const sb = supabaseService();
  const { data: p } = await sb.from("products").select("id").eq("slug", b.slug).maybeSingle();
  if (!p) return NextResponse.json({ error: "unknown_product" }, { status: 404 });
  // Verified buyer: has a paid order containing this product.
  const { data: owned } = await sb.from("order_items").select("order_id, orders!inner(email, status)").eq("product_id", p.id).eq("orders.email", b.email.toLowerCase()).in("orders.status", ["paid", "packing", "shipped", "delivered"]).limit(1);
  await sb.from("reviews").insert({
    product_id: p.id,
    order_id: owned?.[0]?.order_id ?? null,
    author: String(b.name).trim().slice(0, 60),
    email: b.email.toLowerCase(),
    country: typeof b.country === "string" ? b.country.slice(0, 2) : null,
    rating: Math.round(rating),
    title: String(b.title ?? "").slice(0, 120),
    body: String(b.body).slice(0, 2000),
    status: "pending",
  });
  return NextResponse.json({ ok: true });
}
