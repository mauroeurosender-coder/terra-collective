import { NextResponse } from "next/server";
import { insertRow } from "@/lib/server/persist";
import { countryFromHeaders } from "@/lib/server/country";

const allowed = new Set(["page_view", "product_view", "wishlist_add", "add_to_cart", "begin_checkout", "purchase", "search", "newsletter_signup"]);

/** First-party, cookie-consented analytics sink. No IPs or user agents are stored. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !allowed.has(body.name)) return new NextResponse(null, { status: 204 });
  await insertRow("analytics_events", {
    name: body.name,
    props: body.props ?? {},
    path: String(body.path ?? "").slice(0, 300),
    referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
    utm: body.utm ?? {},
    country: countryFromHeaders(req.headers),
  });
  return new NextResponse(null, { status: 204 });
}
