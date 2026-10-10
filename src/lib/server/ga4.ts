import "server-only";
import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";

/**
 * Read-only Google Analytics 4 reports for the Etsy shop (Etsy → Shop Manager →
 * Web Analytics sends shop traffic to this GA4 property). Env:
 *   GA4_PROPERTY_ID   numeric property id (GA4 → Admin → Property details)
 *   GA4_CREDENTIALS   service-account JSON key, base64-encoded (Viewer on the property)
 */

export const ga4Configured = () => Boolean(process.env.GA4_PROPERTY_ID && process.env.GA4_CREDENTIALS);

type Creds = { client_email: string; private_key: string };
const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

async function accessToken(): Promise<string> {
  const c = JSON.parse(Buffer.from(process.env.GA4_CREDENTIALS!, "base64").toString("utf8")) as Creds;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: c.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(c.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${sig}` }),
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google: ${j.error_description ?? j.error ?? res.status}`);
  return j.access_token as string;
}

type Row = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };

async function runReport(token: string, body: object): Promise<Row[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google Analytics: ${j.error?.message ?? res.status}`);
  return (j.rows ?? []) as Row[];
}

export type EtsyTraffic = {
  sessions: number;
  users: number;
  views: number;
  days: { date: string; sessions: number }[];
  countries: { country: string; sessions: number }[];
  sources: { source: string; sessions: number }[];
  listings: { listingId: string; views: number }[];
};

async function fetchEtsyTraffic(from: string, to: string): Promise<EtsyTraffic> {
  const token = await accessToken();
  const dateRanges = [{ startDate: from, endDate: to }];
  const n = (r: Row, i = 0) => Number(r.metricValues[i]?.value ?? 0);
  const [totals, days, countries, sources, pages] = await Promise.all([
    runReport(token, { dateRanges, metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }] }),
    runReport(token, { dateRanges, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
    runReport(token, { dateRanges, dimensions: [{ name: "countryId" }], metrics: [{ name: "sessions" }], limit: 100 }),
    runReport(token, { dateRanges, dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }], limit: 20 }),
    runReport(token, { dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], limit: 500 }),
  ]);
  const listings = new Map<string, number>();
  for (const r of pages) {
    const m = /\/listing\/(\d+)/.exec(r.dimensionValues[0].value);
    if (m) listings.set(m[1], (listings.get(m[1]) ?? 0) + n(r));
  }
  const t = totals[0];
  return {
    sessions: t ? n(t, 0) : 0,
    users: t ? n(t, 1) : 0,
    views: t ? n(t, 2) : 0,
    days: days.map((r) => { const d = r.dimensionValues[0].value; return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, sessions: n(r) }; }),
    countries: countries.map((r) => ({ country: r.dimensionValues[0].value, sessions: n(r) })),
    sources: sources.map((r) => ({ source: r.dimensionValues[0].value || "(direct)", sessions: n(r) })),
    listings: [...listings.entries()].map(([listingId, views]) => ({ listingId, views })).sort((a, b) => b.views - a.views),
  };
}

/** Etsy shop traffic for [from, to] (YYYY-MM-DD, inclusive), cached for 3 hours. */
export async function getEtsyTraffic(from: string, to: string): Promise<{ ok: true; data: EtsyTraffic } | { ok: false; error: string }> {
  if (!ga4Configured()) return { ok: false, error: "not_configured" };
  try {
    const data = await unstable_cache(() => fetchEtsyTraffic(from, to), ["etsy-ga4", from, to], { revalidate: 10800 })();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
