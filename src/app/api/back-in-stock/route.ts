import { NextResponse } from "next/server";
import { insertRow, isEmail } from "@/lib/server/persist";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!isEmail(body.email) || typeof body.variantId !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await insertRow("back_in_stock_requests", {
    email: body.email.toLowerCase(),
    variant_id: body.variantId.slice(0, 80),
    locale: body.locale === "pt" ? "pt" : "en",
  });
  return NextResponse.json({ ok: true });
}
