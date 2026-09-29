import { NextResponse } from "next/server";
import { lookupAutomatic, lookupDiscount } from "@/lib/server/discounts";

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({ code: "" }));
  const d = await lookupDiscount(typeof code === "string" ? code.slice(0, 40) : "");
  if (!d) return NextResponse.json({ error: "invalid" }, { status: 404 });
  return NextResponse.json(d);
}

/** Automatic promotion currently running (checkout applies it when no code is entered). */
export async function GET() {
  return NextResponse.json(await lookupAutomatic());
}
