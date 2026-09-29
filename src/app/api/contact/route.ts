import { NextResponse } from "next/server";
import { insertRow, isEmail } from "@/lib/server/persist";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!isEmail(b.email) || !b.name || !b.message) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await insertRow("enquiries", {
    kind: ["contact", "wholesale", "custom"].includes(b.kind) ? b.kind : "contact",
    name: String(b.name).slice(0, 120),
    email: b.email.toLowerCase(),
    company: b.company ? String(b.company).slice(0, 120) : null,
    website: b.website ? String(b.website).slice(0, 200) : null,
    country: b.country ? String(b.country).slice(0, 2) : null,
    quantity: b.quantity ? String(b.quantity).slice(0, 40) : null,
    message: String(b.message).slice(0, 4000),
  });
  return NextResponse.json({ ok: true });
}
