"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseService } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { getCountry } from "@/lib/geo";

export type ManualOrderInput = {
  email: string;
  noEmail: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  address1: string;
  postal: string;
  city: string;
  nif: string;
  locale: "en" | "pt";
  lines: { variantId: string; quantity: number; unitPrice: number | null }[];
  shipping: number;
  discount: number;
  paymentMethod: string;
  paid: boolean;
  giftMessage: string;
  note: string;
  test: boolean;
};

type Result = { ok: true; id: string; number: string } | { ok: false; error: string };

/** Creates an order by hand (market sale, Instagram DM, bank transfer…). Stock is reserved like a checkout order. */
export async function createManualOrder(f: ManualOrderInput): Promise<Result> {
  const session = await requireAdmin();
  const lines = f.lines.filter((l) => l.variantId && l.quantity > 0);
  if (!lines.length) return { ok: false, error: "Add at least one product." };
  if (!f.firstName.trim()) return { ok: false, error: "Add the customer’s first name." };
  const email = f.noEmail ? `no-email-${Date.now().toString(36)}@orders.local` : f.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email, or tick “No email”." };

  const sb = supabaseService();
  const { data: variants, error } = await sb.from("variants").select("id, price, stock, options, products(name)").in("id", lines.map((l) => l.variantId));
  if (error) return { ok: false, error: error.message };
  const byId = new Map((variants ?? []).map((v) => [v.id, v]));
  const items = [];
  for (const l of lines) {
    const v = byId.get(l.variantId);
    if (!v) return { ok: false, error: "A selected product no longer exists." };
    const name = (v.products as unknown as { name: { en: string } }).name.en;
    if (v.stock < l.quantity) return { ok: false, error: `Only ${v.stock} left of ${name}${Object.keys(v.options ?? {}).length ? ` (${Object.values(v.options).join(" · ")})` : ""}.` };
    items.push({ variant_id: v.id, name, variant_label: Object.values(v.options ?? {}).join(" · "), unit_price: l.unitPrice ?? v.price, quantity: l.quantity });
  }

  const subtotal = items.reduce((n, i) => n + i.unit_price * i.quantity, 0);
  const discount = Math.min(Math.max(0, Math.round(f.discount)), subtotal);
  const shipping = Math.max(0, Math.round(f.shipping));
  const total = subtotal - discount + shipping;
  const c = getCountry(f.country);
  const vatRate = c.zone === "PT" || c.zone === "EU" ? c.vat : 0;
  const vat = Math.round(total - total / (1 + vatRate));

  const { data, error: e2 } = await sb.rpc("place_order", {
    p: {
      status: f.paid ? "paid" : "pending_payment",
      email,
      locale: f.locale,
      country: f.country,
      address: { country: f.country, firstName: f.firstName.trim(), lastName: f.lastName.trim(), address1: f.address1.trim(), address2: "", postal: f.postal.trim(), city: f.city.trim(), state: "", phone: f.phone.trim(), company: "" },
      nif: f.nif.trim(),
      marketing: false,
      subtotal,
      shipping,
      shipping_method: shipping ? "standard" : "pickup",
      gift_wrap: false,
      gift_message: f.giftMessage.slice(0, 240),
      discount_code: "",
      discount_amount: discount,
      vat,
      total,
      payment_method: f.paymentMethod,
      payment_ref: `manual-${session.email}`,
      items,
    },
  });
  if (e2) return { ok: false, error: /out_of_stock/.test(e2.message) ? "Not enough stock for one of the products." : e2.message };
  const order = data as { id: string; number: string };
  if (f.test) await sb.from("orders").update({ test: true }).eq("id", order.id);
  await sb.from("order_events").insert({ order_id: order.id, kind: "note", body: `Created manually by ${session.name}${f.note.trim() ? `: ${f.note.trim().slice(0, 1000)}` : ""}`, author: session.mode === "live" ? session.userId : null });
  invalidateCatalog();
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, id: order.id, number: order.number };
}
