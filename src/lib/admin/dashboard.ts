import "server-only";
import { loadCatalog } from "../data/source";
import { variantLabel } from "../variants";
import { supabaseConfigured, supabaseServer } from "../supabase/server";
import { demoData } from "./demo";
import { bucketKey, buckets } from "./range";
import type { AdminOrder, Dashboard, Kpis, Range } from "./types";

const COUNTS = new Set(["paid", "packing", "shipped", "delivered", "refunded"]);
// Revenue = what you keep: refunds and tax remitted by Etsy are excluded.
const net = (o: AdminOrder) => o.total - o.refunded - (o.marketplaceTax ?? 0);

async function loadLive(range: Range) {
  const sb = await supabaseServer();
  const [{ data: rows }, { count: visits }, { count: prevVisits }, { data: stock }] = await Promise.all([
    sb
      .from("orders")
      .select("id, number, created_at, status, email, country, total, refunded_amount, payment_method, gift_message, shipping_address, test, source, vat, order_items(name, variant_label, unit_price, quantity, products(slug))")
      .gte("created_at", range.prevFrom.toISOString())
      .lt("created_at", range.to.toISOString())
      .order("created_at", { ascending: false }),
    sb.from("analytics_events").select("*", { count: "exact", head: true }).eq("name", "page_view").gte("created_at", range.from.toISOString()).lt("created_at", range.to.toISOString()),
    sb.from("analytics_events").select("*", { count: "exact", head: true }).eq("name", "page_view").gte("created_at", range.prevFrom.toISOString()).lt("created_at", range.prevTo.toISOString()),
    sb.from("variants").select("sku, stock, options, image_index, products!inner(slug, name, options, status)").lte("stock", 3).eq("products.status", "active").order("stock"),
  ]);

  type Row = { id: string; number: string; created_at: string; status: AdminOrder["status"]; email: string; country: string; total: number; refunded_amount: number; payment_method: string; gift_message: string | null; test?: boolean; source?: string; vat?: number; shipping_address: { firstName?: string; lastName?: string }; order_items: { name: string; variant_label: string | null; unit_price: number; quantity: number; products: { slug: string } | null }[] };
  const orders: AdminOrder[] = ((rows ?? []) as unknown as Row[]).map((o) => ({
    id: o.id,
    number: o.number,
    createdAt: o.created_at,
    status: o.status,
    email: o.email,
    customerName: [o.shipping_address?.firstName, o.shipping_address?.lastName].filter(Boolean).join(" ") || o.email,
    country: o.country,
    total: o.total,
    refunded: o.refunded_amount,
    paymentMethod: o.payment_method,
    giftMessage: o.gift_message,
    test: o.test,
    marketplaceTax: o.source === "etsy" ? (o.vat ?? 0) : 0,
    items: o.order_items.map((i) => ({ slug: i.products?.slug ?? "", name: i.name, variantLabel: i.variant_label ?? "", unitPrice: i.unit_price, quantity: i.quantity })),
  }));

  type StockRow = { sku: string; stock: number; options: Record<string, string>; image_index: number | null; products: { slug: string; name: { en: string }; options: never } };
  const lowStock = ((stock ?? []) as unknown as StockRow[]).map((v) => ({
    slug: v.products.slug,
    name: v.products.name.en,
    variantLabel: Object.values(v.options ?? {}).join(" · "),
    sku: v.sku,
    stock: v.stock,
  }));
  return { orders, visits: visits ?? 0, prevVisits: prevVisits ?? 0, lowStock };
}

function loadDemo(range: Range, products: Awaited<ReturnType<typeof loadCatalog>>["products"]) {
  const { orders, visits } = demoData();
  const sumVisits = (from: Date, to: Date) => {
    let n = 0;
    for (let t = from.getTime(); t < to.getTime(); t += 86_400_000) n += visits.get(new Date(t).toDateString()) ?? 0;
    return n;
  };
  const lowStock = products
    .filter((p) => !p.hidden)
    .flatMap((p) => p.variants.filter((v) => v.stock <= 3).map((v) => ({ slug: p.slug, name: p.name.en, variantLabel: variantLabel(p.options, v, "en"), sku: v.sku, stock: v.stock, image: p.images[v.image ?? 0] })))
    .sort((a, b) => a.stock - b.stock);
  return {
    orders: orders.filter((o) => o.createdAt >= range.prevFrom.toISOString() && o.createdAt < range.to.toISOString()),
    visits: sumVisits(range.from, range.to),
    prevVisits: sumVisits(range.prevFrom, range.prevTo),
    lowStock,
  };
}

function kpis(orders: AdminOrder[], visits: number): Kpis {
  const counted = orders.filter((o) => COUNTS.has(o.status));
  const revenue = counted.reduce((n, o) => n + net(o), 0);
  return {
    revenue,
    orders: counted.length,
    aov: counted.length ? Math.round(revenue / counted.length) : 0,
    visits,
    conversion: visits ? counted.length / visits : 0,
  };
}

export async function getDashboard(range: Range): Promise<Dashboard> {
  const { products } = await loadCatalog();
  const live = supabaseConfigured;
  const data = live ? await loadLive(range) : loadDemo(range, products);
  const fromIso = range.from.toISOString();
  const current = data.orders.filter((o) => o.createdAt >= fromIso);
  const previous = data.orders.filter((o) => o.createdAt < fromIso);
  const counted = current.filter((o) => COUNTS.has(o.status));

  const seriesMap = new Map(buckets(range).map((d) => [bucketKey(d, range.bucket), { t: d.toISOString(), revenue: 0, orders: 0 }]));
  for (const o of counted) {
    const b = seriesMap.get(bucketKey(new Date(o.createdAt), range.bucket));
    if (b) {
      b.revenue += net(o);
      b.orders += 1;
    }
  }

  const countryMap = new Map<string, { country: string; revenue: number; orders: number }>();
  const productMap = new Map<string, { slug: string; name: string; image?: string; units: number; revenue: number }>();
  for (const o of counted) {
    const c = countryMap.get(o.country) ?? { country: o.country, revenue: 0, orders: 0 };
    c.revenue += net(o);
    c.orders += 1;
    countryMap.set(o.country, c);
    for (const i of o.items) {
      const p = productMap.get(i.slug) ?? { slug: i.slug, name: i.name, image: products.find((x) => x.slug === i.slug)?.images[0], units: 0, revenue: 0 };
      p.units += i.quantity;
      p.revenue += i.unitPrice * i.quantity;
      productMap.set(i.slug, p);
    }
  }

  return {
    range,
    kpis: kpis(current, data.visits),
    prev: kpis(previous, data.prevVisits),
    series: [...seriesMap.values()],
    byCountry: [...countryMap.values()].sort((a, b) => b.revenue - a.revenue),
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    lowStock: data.lowStock.slice(0, 8),
    recent: (live ? data.orders : demoData().orders).slice(0, 8),
    source: live ? "live" : "demo",
  };
}
