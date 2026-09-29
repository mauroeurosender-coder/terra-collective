import "server-only";
import { products } from "../data/seed";
import { variantLabel } from "../variants";
import type { AdminOrder, OrderStatus } from "./types";

/**
 * Deterministic synthetic orders so the admin is useful before real sales
 * exist. Each day is seeded by its date, so numbers are stable across reloads.
 */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const countries: [string, number][] = [["PT", 42], ["ES", 10], ["FR", 10], ["DE", 9], ["GB", 8], ["US", 8], ["NL", 5], ["IT", 4], ["BE", 2], ["IE", 2]];
const firstNames = ["Ana", "Marta", "Inês", "Sofia", "Hannah", "Emma", "Lukas", "Claire", "James", "Carla", "Tiago", "Rita", "Julia", "Pedro", "Olivia", "Léa"];
const lastNames = ["Silva", "Costa", "Martins", "Ferreira", "Smith", "Müller", "Dubois", "Rossi", "García", "Brown", "Santos", "Pereira"];
const methods = ["card", "card", "card", "mbway", "paypal", "multibanco", "klarna"];

const pick = <T,>(r: () => number, list: [T, number][]) => {
  const total = list.reduce((n, [, w]) => n + w, 0);
  let x = r() * total;
  for (const [v, w] of list) if ((x -= w) < 0) return v;
  return list[0][0];
};

const listed = products.filter((p) => !p.hidden);
const productWeights: [(typeof listed)[number], number][] = listed.map((p) => [p, p.bestseller ? 14 - p.bestseller : 3]);

const EPOCH = new Date(2026, 3, 1); // 1 Apr 2026
const DAY = 86_400_000;

let cache: { key: string; orders: AdminOrder[]; visits: Map<string, number> } | null = null;

export function demoData(now = new Date()) {
  const key = now.toDateString() + now.getHours();
  if (cache?.key === key) return cache;
  const orders: AdminOrder[] = [];
  const visits = new Map<string, number>();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let d = new Date(EPOCH); d <= today; d = new Date(d.getTime() + DAY)) {
    const dayIndex = Math.round((d.getTime() - EPOCH.getTime()) / DAY);
    const r = rng(dayIndex * 7919 + 17);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const growth = 1 + dayIndex / 220;
    const summer = d.getMonth() >= 5 && d.getMonth() <= 7 ? 1.25 : 1;
    const dayVisits = Math.round((75 + r() * 40) * growth * summer * (weekend ? 1.3 : 1));
    const isToday = d.getTime() === today.getTime();
    const hoursSoFar = isToday ? now.getHours() + 1 : 24;
    visits.set(d.toDateString(), Math.round((dayVisits * hoursSoFar) / 24));

    const n = Math.round(dayVisits * (0.018 + r() * 0.014));
    for (let i = 0; i < n; i++) {
      const hour = Math.min(23, Math.floor(8 + r() * 15));
      if (isToday && hour > now.getHours()) continue;
      const created = new Date(d.getTime() + hour * 3_600_000 + Math.floor(r() * 3_600_000));
      const lines = 1 + (r() < 0.35 ? 1 : 0) + (r() < 0.12 ? 1 : 0);
      const items = Array.from({ length: lines }, () => {
        const p = pick(r, productWeights);
        const inStock = p.variants.filter((v) => v.stock > 0);
        const v = (inStock.length ? inStock : p.variants)[Math.floor(r() * (inStock.length || p.variants.length))];
        return { slug: p.slug, name: p.name.en, variantLabel: variantLabel(p.options, v, "en"), unitPrice: v.price, quantity: r() < 0.15 ? 2 : 1, image: p.images[v.image ?? 0] };
      });
      const country = pick(r, countries);
      const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const shipping = country === "PT" ? (subtotal >= 6000 ? 0 : 490) : country === "US" || country === "GB" ? 1990 : subtotal >= 15000 ? 0 : 990;
      const ageDays = (today.getTime() - d.getTime()) / DAY;
      const status: OrderStatus = r() < 0.015 ? "refunded" : ageDays < 1 ? (r() < 0.6 ? "paid" : "packing") : ageDays < 2 ? "packing" : ageDays < 6 ? "shipped" : "delivered";
      const fn = firstNames[Math.floor(r() * firstNames.length)];
      const ln = lastNames[Math.floor(r() * lastNames.length)];
      const total = subtotal + shipping + (r() < 0.12 ? 400 : 0);
      orders.push({
        id: `demo-${dayIndex}-${i}`,
        number: `TC-${(1000 + dayIndex * 13 + i).toString(36).toUpperCase()}`,
        createdAt: created.toISOString(),
        status,
        email: `${fn}.${ln}@example.com`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""),
        customerName: `${fn} ${ln}`,
        country,
        total,
        refunded: status === "refunded" ? total : 0,
        paymentMethod: country === "PT" ? methods[Math.floor(r() * methods.length)] : methods[Math.floor(r() * 3)],
        giftMessage: r() < 0.1 ? "Parabéns! Com amor." : null,
        items,
      });
    }
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  cache = { key, orders, visits };
  return cache;
}
