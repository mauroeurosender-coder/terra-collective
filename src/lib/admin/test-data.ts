/**
 * Realistic TEST data for the dashboard and analytics: orders from fake
 * customers plus anonymous visit sessions (page views, product views, carts,
 * checkouts, searches) with countries and traffic sources.
 *
 * Everything is tagged so it can be removed: orders.test = true,
 * customers @example.com, analytics_events.props.test = true.
 * Stock is NOT reduced.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Variant = { id: string; sku: string; price: number; options: Record<string, string> };
type Product = { id: string; slug: string; name: { en: string }; bestseller_rank: number; variants: Variant[] };

const countries: [string, number][] = [["PT", 38], ["ES", 10], ["FR", 10], ["DE", 9], ["GB", 9], ["US", 9], ["NL", 5], ["IT", 4], ["BE", 3], ["IE", 2], ["CH", 1]];
const cities: Record<string, [string, string]> = {
  PT: ["Lisboa", "1200-195"], ES: ["Madrid", "28004"], FR: ["Paris", "75011"], DE: ["Berlin", "10115"], GB: ["London", "E2 7DG"],
  US: ["Brooklyn", "11211"], NL: ["Amsterdam", "1015 CJ"], IT: ["Milano", "20121"], BE: ["Bruxelles", "1000"], IE: ["Dublin", "D02 X285"], CH: ["Zürich", "8001"],
};
const firstNames = ["Ana", "Marta", "Inês", "Sofia", "Beatriz", "Hannah", "Emma", "Lukas", "Claire", "James", "Carla", "Tiago", "Rita", "Julia", "Pedro", "Olivia", "Léa", "Lucía", "Noah", "Chloé", "Giulia", "Sarah"];
const lastNames = ["Silva", "Costa", "Martins", "Ferreira", "Smith", "Müller", "Dubois", "Rossi", "García", "Brown", "Santos", "Pereira", "Janssen", "Murphy", "Weber"];
const sources: [{ referrer: string | null; utm: Record<string, string> }, number][] = [
  [{ referrer: null, utm: {} }, 26],
  [{ referrer: "https://www.google.com/", utm: {} }, 28],
  [{ referrer: "https://l.instagram.com/", utm: { utm_source: "instagram", utm_medium: "social" } }, 18],
  [{ referrer: "https://www.pinterest.com/", utm: {} }, 9],
  [{ referrer: "https://www.etsy.com/", utm: {} }, 7],
  [{ referrer: "https://www.facebook.com/", utm: {} }, 5],
  [{ referrer: null, utm: { utm_source: "newsletter", utm_medium: "email" } }, 7],
];
const searches = ["sardine", "sardinha", "blue", "olive dish", "straw bag", "gift", "wall", "oil bottle", "mug", "tiles", "azulejo", "fish plate"];

const pick = <T,>(list: [T, number][]) => {
  const total = list.reduce((n, [, w]) => n + w, 0);
  let x = Math.random() * total;
  for (const [v, w] of list) if ((x -= w) < 0) return v;
  return list[0][0];
};
const any = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const uid = () => crypto.randomUUID();

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => PromiseLike<{ error: { message: string } | null }>) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await fn(rows.slice(i, i + size));
    if (error) throw new Error(error.message);
  }
}

/** Generates data for the days in [fromDaysAgo, toDaysAgo) — call in small chunks to stay within function time limits. */
export async function generateTestData(sb: SupabaseClient, fromDaysAgo: number, toDaysAgo: number) {
  const { data: prods, error } = await sb.from("products").select("id, slug, name, bestseller_rank, variants(id, sku, price, options)").eq("status", "active");
  if (error) throw new Error(error.message);
  const products = ((prods ?? []) as Product[]).filter((p) => p.variants.length);
  if (!products.length) throw new Error("No active products to sell.");
  const weighted: [Product, number][] = products.map((p) => [p, p.bestseller_rank ? Math.max(2, 14 - p.bestseller_rank) : 2]);

  // Pool of fake customers (stable emails, so repeat buyers appear).
  const pool = Array.from({ length: 60 }, (_, i) => {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const country = pick(countries);
    return { email: `${fn}.${ln}.${i}@example.com`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""), first_name: fn, last_name: ln, country, newsletter: i % 3 === 0 };
  });
  const up = await sb.from("customers").upsert(pool, { onConflict: "email", ignoreDuplicates: true });
  if (up.error) throw new Error(up.error.message);
  const { data: custRows } = await sb.from("customers").select("id, email, first_name, last_name, country").like("email", "%@example.com");
  const customers = custRows ?? [];

  const orders: Record<string, unknown>[] = [];
  const items: Record<string, unknown>[] = [];
  const orderEvents: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let ago = fromDaysAgo; ago > toDaysAgo; ago--) {
    const day = new Date(today.getTime() - (ago - 1) * 86_400_000);
    const isToday = ago === 1;
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const sessions = Math.round((55 + Math.random() * 45) * (weekend ? 1.3 : 1) * (1 + (90 - ago) / 400));

    for (let s = 0; s < sessions; s++) {
      const hour = Math.floor(8 + Math.random() * 15);
      if (isToday && hour > now.getHours()) continue;
      let t = day.getTime() + hour * 3_600_000 + Math.floor(Math.random() * 3_600_000);
      const sid = uid();
      const country = pick(countries);
      const src = pick(sources);
      const locale = country === "PT" ? "pt" : "en";
      const ev = (name: string, path: string, props: Record<string, unknown> = {}, first = false) => {
        t += 20_000 + Math.floor(Math.random() * 90_000);
        events.push({ name, path, props: { ...props, sid, test: true }, referrer: first ? src.referrer : null, utm: first ? src.utm : {}, country, created_at: new Date(t).toISOString() });
      };

      ev("page_view", `/${locale}`, {}, true);
      if (Math.random() < 0.18) {
        const q = any(searches);
        ev("search", `/${locale}/search`, { q, results: q === "mug" || q === "tiles" ? 0 : 1 + Math.floor(Math.random() * 6) });
      }
      if (Math.random() < 0.35) ev("page_view", `/${locale}/shop`);
      if (Math.random() < 0.12) ev("page_view", `/${locale}/journal/${any(["how-a-sardine-is-made", "a-morning-in-caldas", "setting-a-portuguese-table"])}`);
      if (Math.random() > 0.62) continue; // bounced

      const viewed = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => pick(weighted));
      for (const p of viewed) {
        ev("page_view", `/${locale}/products/${p.slug}`);
        ev("product_view", `/${locale}/products/${p.slug}`, { slug: p.slug });
        if (Math.random() < 0.08) ev("wishlist_add", `/${locale}/products/${p.slug}`, { slug: p.slug });
      }
      if (Math.random() > 0.2) continue;
      const cart = viewed.slice(0, Math.random() < 0.3 ? 2 : 1);
      for (const p of cart) ev("add_to_cart", `/${locale}/products/${p.slug}`, { slug: p.slug });
      if (Math.random() > 0.55) continue;
      ev("page_view", `/${locale}/checkout`);
      ev("begin_checkout", `/${locale}/checkout`);
      if (Math.random() > 0.6) continue;

      // Purchase → order
      const cust = customers.filter((c) => c.country === country);
      const c = cust.length ? any(cust) : any(customers);
      const lines = cart.map((p) => {
        const v = any(p.variants);
        return { p, v, qty: Math.random() < 0.15 ? 2 : 1 };
      });
      const subtotal = lines.reduce((n, l) => n + l.v.price * l.qty, 0);
      const shipping = country === "PT" ? (subtotal >= 6000 ? 0 : 490) : country === "US" || country === "GB" || country === "CH" ? 1990 : subtotal >= 15000 ? 0 : 990;
      const giftWrap = Math.random() < 0.1;
      const total = subtotal + shipping + (giftWrap ? 400 : 0);
      const ageDays = ago - 1;
      const status = Math.random() < 0.02 ? "refunded" : ageDays < 1 ? (Math.random() < 0.6 ? "paid" : "packing") : ageDays < 2 ? "packing" : ageDays < 6 ? "shipped" : "delivered";
      const created = new Date(t + 60_000).toISOString();
      const id = uid();
      const [city, postal] = cities[country] ?? ["City", "0000"];
      orders.push({
        id,
        number: `TC-T${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        customer_id: c.id,
        status,
        email: c.email,
        locale,
        country,
        shipping_address: { country, firstName: c.first_name, lastName: c.last_name, address1: "Rua de Teste 1", postal, city, phone: "" },
        subtotal,
        shipping,
        shipping_method: "standard",
        gift_wrap: giftWrap,
        gift_message: giftWrap ? "Parabéns! Com amor." : null,
        vat: ["US", "GB", "CH"].includes(country) ? 0 : Math.round(subtotal - subtotal / 1.23),
        total,
        refunded_amount: status === "refunded" ? total : 0,
        payment_method: country === "PT" ? any(["card", "mbway", "multibanco"]) : any(["card", "card", "paypal"]),
        payment_ref: `test_${id.slice(0, 8)}`,
        utm: src.utm,
        test: true,
        created_at: created,
        paid_at: created,
        shipped_at: ["shipped", "delivered"].includes(status) ? new Date(t + 86_400_000).toISOString() : null,
        delivered_at: status === "delivered" ? new Date(t + 4 * 86_400_000).toISOString() : null,
      });
      for (const l of lines) {
        items.push({ order_id: id, product_id: l.p.id, variant_id: l.v.id, sku: l.v.sku, name: l.p.name.en, variant_label: Object.values(l.v.options ?? {}).join(" · "), unit_price: l.v.price, quantity: l.qty });
      }
      orderEvents.push({ order_id: id, kind: "status", body: "Order placed (test data)", created_at: created });
      ev("purchase", `/${locale}/checkout/success`, { value: total, items: lines.map((l) => ({ slug: l.p.slug, qty: l.qty })) });
    }
  }

  await chunked(orders, 500, (part) => sb.from("orders").insert(part));
  await chunked(items, 1000, (part) => sb.from("order_items").insert(part));
  await chunked(orderEvents, 1000, (part) => sb.from("order_events").insert(part));
  await chunked(events, 2000, (part) => sb.from("analytics_events").insert(part));
  return { orders: orders.length, visits: new Set(events.map((e) => (e.props as { sid: string }).sid)).size, events: events.length };
}

/** Removes everything generateTestData (and scripts/create-test-orders.ts) created. */
export async function clearTestData(sb: SupabaseClient) {
  const del = async (q: PromiseLike<{ error: { message: string } | null; count?: number | null }>) => {
    const r = await q;
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  };
  const orders = await del(sb.from("orders").delete({ count: "exact" }).eq("test", true));
  const events = await del(sb.from("analytics_events").delete({ count: "exact" }).eq("props->>test", "true"));
  // Fake customers without any remaining (real) orders.
  const { data: fakes } = await sb.from("customers").select("id, orders(id)").or("email.like.%@example.com,email.like.%.test@example.com");
  const ids = (fakes ?? []).filter((c: { orders: unknown[] }) => !c.orders?.length).map((c: { id: string }) => c.id);
  let customers = 0;
  for (let i = 0; i < ids.length; i += 200) customers += await del(sb.from("customers").delete({ count: "exact" }).in("id", ids.slice(i, i + 200)));
  return { orders, events, customers };
}
