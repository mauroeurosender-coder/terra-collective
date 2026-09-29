/**
 * Creates 3 realistic TEST orders for today through the same `place_order`
 * function the checkout uses (so stock is reserved and customers are created).
 * They carry a TEST badge in the admin and can be deleted from the order page.
 *
 *   node scripts/create-test-orders.ts
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase keys missing in .env.local");
const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, prefer: "return=representation", ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const today = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// Totals follow the store's pricing rules (see src/lib/pricing.ts):
// PT/EU prices include VAT; free PT shipping over €60; EU textile rate €9.90 + €1.50 per extra item;
// US prices exclude EU VAT (€49 → €39.84) plus €19.90 standard shipping.
const orders = [
  {
    at: today(9, 14),
    status: "paid",
    p: {
      status: "paid",
      email: "ana.silva.test@example.com",
      locale: "pt",
      country: "PT",
      address: { country: "PT", firstName: "Ana", lastName: "Silva", company: "", address1: "Rua da Rosa 45, 2º Esq.", address2: "", postal: "1200-385", city: "Lisboa", state: "", phone: "+351 912 345 678", nif: "123456789" },
      nif: "123456789",
      marketing: true,
      subtotal: 10700,
      shipping: 0,
      shipping_method: "standard",
      gift_wrap: false,
      gift_message: "",
      discount_code: "",
      discount_amount: 0,
      vat: 2001,
      total: 10700,
      payment_method: "mbway",
      payment_ref: "test_mbway_0001",
      items: [
        { variant_id: "swd-medium-blue", name: "Ceramic Sardine Wall Décor", variant_label: "Medium · Azulejo Blue", unit_price: 4200, quantity: 1 },
        { variant_id: "oad-3-blue", name: "Portuguese Ceramic Olive & Appetizer Dish", variant_label: "Set of 3 · Azulejo Blue", unit_price: 6500, quantity: 1 },
      ],
    },
  },
  {
    at: today(11, 32),
    status: "packing",
    p: {
      status: "paid",
      email: "sophie.martin.test@example.com",
      locale: "en",
      country: "FR",
      address: { country: "FR", firstName: "Sophie", lastName: "Martin", company: "", address1: "18 rue des Martyrs", address2: "Bâtiment B", postal: "75009", city: "Paris", state: "", phone: "+33 6 12 34 56 78", nif: "" },
      nif: "",
      marketing: false,
      subtotal: 10400,
      shipping: 1140,
      shipping_method: "standard",
      gift_wrap: true,
      gift_message: "Joyeux anniversaire, Claire! Un petit bout du Portugal pour toi. ♥ Sophie",
      discount_code: "",
      discount_amount: 0,
      vat: 1990,
      total: 11940,
      payment_method: "card",
      payment_ref: "test_card_0002",
      items: [
        { variant_id: "tmb-natural-leather", name: "Teresa Mini Straw Bag", variant_label: "Natural · Leather", unit_price: 8800, quantity: 1 },
        { variant_id: "tfc-default", name: "Retro Tinned Fish Playing Cards", variant_label: "", unit_price: 1600, quantity: 1 },
      ],
    },
  },
  {
    at: today(14, 5),
    status: "paid",
    p: {
      status: "paid",
      email: "james.carter.test@example.com",
      locale: "en",
      country: "US",
      address: { country: "US", firstName: "James", lastName: "Carter", company: "", address1: "214 Bedford Ave", address2: "Apt 3F", postal: "11249", city: "Brooklyn", state: "NY", phone: "+1 718 555 0142", nif: "" },
      nif: "",
      marketing: true,
      subtotal: 3984,
      shipping: 1990,
      shipping_method: "standard",
      gift_wrap: false,
      gift_message: "",
      discount_code: "",
      discount_amount: 0,
      vat: 0,
      total: 5974,
      payment_method: "card",
      payment_ref: "test_card_0003",
      items: [{ variant_id: "cob-mustard", name: "Handmade Ceramic Oil Bottle", variant_label: "Mustard", unit_price: 3984, quantity: 1 }],
    },
  },
];

for (const o of orders) {
  const placed = await rest("rpc/place_order", { method: "POST", body: JSON.stringify({ p: o.p }) });
  const id = placed.id as string;
  await rest(`orders?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ test: true, created_at: o.at, paid_at: o.at, status: o.status }) });
  await rest(`order_events?order_id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ created_at: o.at }) });
  if (o.status === "packing") {
    await rest("order_events", { method: "POST", body: JSON.stringify({ order_id: id, kind: "status", body: "Status changed to packing", created_at: today(12, 10) }) });
  }
  await rest("order_events", { method: "POST", body: JSON.stringify({ order_id: id, kind: "note", body: "Test order created to try out the admin." }) });
  console.log(`${placed.number}  ${o.p.address.firstName} ${o.p.address.lastName} (${o.p.country})  €${(o.p.total / 100).toFixed(2)}  ${o.status}`);
}
