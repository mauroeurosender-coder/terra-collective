import { NextResponse } from "next/server";
import { insertRow } from "@/lib/server/persist";
import { countryFromHeaders } from "@/lib/server/country";
import { limited } from "@/lib/server/rate-limit";

const allowed = new Set(["page_view", "product_view", "wishlist_add", "add_to_cart", "begin_checkout", "purchase", "search", "newsletter_signup", "ab_exposure"]);

/** First-party, cookie-consented analytics sink. No IPs or user agents are stored. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !allowed.has(body.name)) return new NextResponse(null, { status: 204 });
  if (limited(req, "events", 120, 60)) return new NextResponse(null, { status: 204 });
  const small = (v: unknown) => (v && typeof v === "object" && JSON.stringify(v).length <= 2000 ? v : {});
  await insertRow("analytics_events", {
    name: body.name,
    props: small(body.props),
    path: String(body.path ?? "").slice(0, 300),
    referrer: body.referrer ? String(body.referrer).slice(0, 300) : null,
    utm: small(body.utm),
    country: countryFromHeaders(req.headers),
  });
  return new NextResponse(null, { status: 204 });
}
