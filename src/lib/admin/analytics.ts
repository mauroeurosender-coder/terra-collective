import "server-only";
import { supabaseServer } from "../supabase/server";
import type { Range } from "./types";

type Ev = { name: string; props: Record<string, unknown>; path: string | null; referrer: string | null; utm: Record<string, string>; country: string | null };

export type ProductStat = { slug: string; name: string; views: number; wishlist: number; carts: number; units: number; revenue: number; conversion: number };

export type Analytics = {
  funnel: { step: string; count: number }[];
  products: ProductStat[];
  sources: { source: string; sessions: number }[];
  /** Website visits/orders vs Etsy orders per country (Etsy shares no visit data). */
  countries: { country: string; sessions: number; orders: number; revenue: number; etsyOrders: number; etsyRevenue: number }[];
  searches: { q: string; count: number; zero: number }[];
  posts: { slug: string; title: string; views: number }[];
  totalEvents: number;
  truncated: boolean;
};

const LIMIT = 50_000;

function sourceOf(e: Ev) {
  if (e.utm?.utm_source) return `${e.utm.utm_source}${e.utm.utm_medium ? ` / ${e.utm.utm_medium}` : ""}`;
  if (!e.referrer) return "Direct";
  try {
    const host = new URL(e.referrer).hostname.replace(/^www\./, "");
    if (/google\./.test(host)) return "Google";
    if (/instagram\.com/.test(host)) return "Instagram";
    if (/facebook\.com|fb\.me/.test(host)) return "Facebook";
    if (/pinterest\./.test(host)) return "Pinterest";
    if (/etsy\.com/.test(host)) return "Etsy";
    if (/localhost|terracollective/.test(host)) return "Direct";
    return host;
  } catch {
    return "Other";
  }
}

export async function getAnalytics(range: Range): Promise<Analytics> {
  const sb = await supabaseServer();
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const [{ data: evs }, { data: orders }, { data: prods }, { data: posts }] = await Promise.all([
    sb.from("analytics_events").select("name, props, path, referrer, utm, country").gte("created_at", from).lt("created_at", to).order("created_at", { ascending: false }).limit(LIMIT),
    sb.from("orders").select("id, status, source, country, total, refunded_amount, order_items(quantity, unit_price, products(slug))").gte("created_at", from).lt("created_at", to).eq("test", false).in("status", ["paid", "packing", "shipped", "delivered"]),
    sb.from("products").select("slug, name").eq("status", "active"),
    sb.from("journal_posts").select("slug, title").eq("status", "published"),
  ]);
  const events = (evs ?? []) as Ev[];
  // Visits are only measured on the website, so the funnel and conversion use website orders only.
  const webOrders = (orders ?? []).filter((o: { source: string }) => o.source !== "etsy");
  const sid = (e: Ev) => (e.props?.sid as string) ?? `${e.path}-${Math.random()}`;
  const sessionsWith = (name: string) => new Set(events.filter((e) => e.name === name).map(sid)).size;

  // Funnel (distinct anonymous sessions per step; purchases from real orders)
  const funnel = [
    { step: "Visited the store", count: sessionsWith("page_view") },
    { step: "Viewed a product", count: sessionsWith("product_view") },
    { step: "Added to cart", count: sessionsWith("add_to_cart") },
    { step: "Started checkout", count: new Set(events.filter((e) => e.name === "begin_checkout" || (e.name === "page_view" && /\/checkout$/.test(e.path ?? ""))).map(sid)).size },
    { step: "Purchased", count: webOrders.length },
  ];

  // Per product
  const stats = new Map<string, ProductStat>((prods ?? []).map((p: { slug: string; name: { en: string } }) => [p.slug, { slug: p.slug, name: p.name.en, views: 0, wishlist: 0, carts: 0, units: 0, revenue: 0, conversion: 0 }]));
  for (const e of events) {
    const slug = e.props?.slug as string | undefined;
    const s = slug ? stats.get(slug) : undefined;
    if (!s) continue;
    if (e.name === "product_view") s.views++;
    else if (e.name === "wishlist_add") s.wishlist++;
    else if (e.name === "add_to_cart") s.carts++;
  }
  for (const o of (orders ?? []) as unknown as { order_items: { quantity: number; unit_price: number; products: { slug: string } | null }[] }[]) {
    for (const i of o.order_items) {
      const s = i.products ? stats.get(i.products.slug) : undefined;
      if (!s) continue;
      s.units += i.quantity;
      s.revenue += i.quantity * i.unit_price;
    }
  }
  const webUnits = new Map<string, number>();
  for (const o of webOrders as unknown as { order_items: { quantity: number; products: { slug: string } | null }[] }[])
    for (const i of o.order_items) if (i.products) webUnits.set(i.products.slug, (webUnits.get(i.products.slug) ?? 0) + i.quantity);
  for (const s of stats.values()) s.conversion = s.views ? (webUnits.get(s.slug) ?? 0) / s.views : 0;

  // Traffic sources: first page view of each session
  const firstBySession = new Map<string, Ev>();
  for (const e of [...events].reverse()) if (e.name === "page_view" && !firstBySession.has(sid(e))) firstBySession.set(sid(e), e);
  const srcMap = new Map<string, number>();
  for (const e of firstBySession.values()) srcMap.set(sourceOf(e), (srcMap.get(sourceOf(e)) ?? 0) + 1);

  // Countries: sessions (first page view) vs orders
  const ctry = new Map<string, Analytics["countries"][number]>();
  const row = (c: string) => ctry.get(c) ?? (ctry.set(c, { country: c, sessions: 0, orders: 0, revenue: 0, etsyOrders: 0, etsyRevenue: 0 }), ctry.get(c)!);
  for (const e of firstBySession.values()) row(e.country ?? "??").sessions++;
  for (const o of (orders ?? []) as unknown as { source: string; country: string; total: number; refunded_amount: number }[]) {
    const r = row(o.country);
    if (o.source === "etsy") {
      r.etsyOrders++;
      r.etsyRevenue += o.total - o.refunded_amount;
    } else {
      r.orders++;
      r.revenue += o.total - o.refunded_amount;
    }
  }

  // Searches
  const searchMap = new Map<string, { q: string; count: number; zero: number }>();
  for (const e of events.filter((x) => x.name === "search")) {
    const q = String(e.props?.q ?? "").trim().toLowerCase();
    if (!q) continue;
    const cur = searchMap.get(q) ?? { q, count: 0, zero: 0 };
    cur.count++;
    if (Number(e.props?.results) === 0) cur.zero++;
    searchMap.set(q, cur);
  }

  // Journal posts
  const titles = new Map((posts ?? []).map((p: { slug: string; title: { en: string } }) => [p.slug, p.title.en]));
  const postMap = new Map<string, number>();
  for (const e of events) {
    const m = e.name === "page_view" ? /^\/(?:en|pt)\/journal\/([^/?#]+)/.exec(e.path ?? "") : null;
    if (m) postMap.set(m[1], (postMap.get(m[1]) ?? 0) + 1);
  }

  return {
    funnel,
    products: [...stats.values()].sort((a, b) => b.revenue - a.revenue || b.views - a.views),
    countries: [...ctry.values()].sort((a, b) => b.sessions - a.sessions || b.revenue + b.etsyRevenue - (a.revenue + a.etsyRevenue)),
    sources: [...srcMap.entries()].map(([source, sessions]) => ({ source, sessions })).sort((a, b) => b.sessions - a.sessions),
    searches: [...searchMap.values()].sort((a, b) => b.count - a.count).slice(0, 20),
    posts: [...postMap.entries()].map(([slug, views]) => ({ slug, title: titles.get(slug) ?? slug, views })).sort((a, b) => b.views - a.views),
    totalEvents: events.length,
    truncated: events.length >= LIMIT,
  };
}
