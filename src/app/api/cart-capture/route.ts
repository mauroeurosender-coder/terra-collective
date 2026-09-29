import { NextResponse } from "next/server";
import { isEmail } from "@/lib/server/persist";
import { supabaseService } from "@/lib/supabase/server";

const live = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Saves the cart once a shopper types their email at checkout (for abandoned-cart reminders). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.token !== "string" || b.token.length < 16 || !isEmail(b.email) || !Array.isArray(b.lines)) return new NextResponse(null, { status: 204 });
  if (!live()) return new NextResponse(null, { status: 204 });
  const lines = b.lines.slice(0, 30).map((l: Record<string, unknown>) => ({ variantId: l.variantId, slug: l.slug, name: l.name, variantLabel: l.variantLabel, image: l.image, price: l.price, shipping: l.shipping, quantity: l.quantity, maxQty: l.maxQty }));
  await supabaseService().from("carts").upsert(
    { token: b.token.slice(0, 64), email: b.email.toLowerCase(), lines, value: Number(b.value) || 0, country: String(b.country ?? "").slice(0, 2), locale: b.locale === "pt" ? "pt" : "en", updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
  return new NextResponse(null, { status: 204 });
}

/** Restores a saved cart from a reminder email link. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!live() || token.length < 16) return NextResponse.json({ lines: [] });
  const { data } = await supabaseService().from("carts").select("lines, recovered_order_id").eq("token", token).maybeSingle();
  return NextResponse.json({ lines: data && !data.recovered_order_id ? data.lines : [] });
}
