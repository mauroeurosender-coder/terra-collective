"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { refundEmail, sendEmail, shippedEmail } from "@/lib/server/email";
import type { OrderStatus } from "@/lib/admin/types";
import { getSettings } from "@/lib/data/source";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const flow: Record<string, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["packing", "cancelled"],
  packing: ["shipped", "paid"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

async function ctx(orderId: string) {
  const session = await requireAdmin();
  const sb = await supabaseServer();
  const { data: order, error } = await sb.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) throw new Error("Order not found");
  const author = session.mode === "live" ? session.userId : null;
  const event = (kind: string, body: string, data: object = {}) => sb.from("order_events").insert({ order_id: orderId, kind, body, data, author });
  return { sb, order, event, session };
}

export async function setStatus(orderId: string, status: OrderStatus): Promise<Result> {
  const { sb, order, event } = await ctx(orderId);
  if (!flow[order.status]?.includes(status)) return { ok: false, error: `Can’t move from ${order.status} to ${status}.` };
  const patch: Record<string, unknown> = { status };
  if (status === "paid" && !order.paid_at) patch.paid_at = new Date().toISOString();
  if (status === "delivered") patch.delivered_at = new Date().toISOString();
  const { error } = await sb.from("orders").update(patch).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  if (status === "cancelled") {
    await sb.rpc("restock_order", { p_order: orderId });
    invalidateCatalog();
  }
  await event("status", `Status changed to ${status.replace("_", " ")}${status === "cancelled" ? " (items restocked)" : ""}`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function markShipped(orderId: string, carrier: string, tracking: string): Promise<Result> {
  const { sb, order, event } = await ctx(orderId);
  carrier = carrier.trim().slice(0, 60);
  tracking = tracking.trim().slice(0, 80);
  if (!carrier || !tracking) return { ok: false, error: "Add the carrier and tracking number." };
  if (!["paid", "packing", "shipped"].includes(order.status)) return { ok: false, error: "Only paid or packing orders can be shipped." };
  const { error } = await sb.from("orders").update({ status: "shipped", carrier, tracking_number: tracking, shipped_at: new Date().toISOString() }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await event("status", `Shipped with ${carrier} · ${tracking}`, { carrier, tracking });
  const mail = shippedEmail({ number: order.number, name: order.shipping_address?.firstName ?? "", locale: order.locale, carrier, tracking }, (await getSettings()).emails.shipped);
  const sent = await sendEmail(order.email, mail.subject, mail.html);
  await event("email", sent.sent ? `Shipping email sent to ${order.email}` : `Shipping email NOT sent (${sent.reason})`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: sent.sent ? "Marked as shipped and customer emailed." : "Marked as shipped. Email not sent: Resend isn’t configured yet." };
}

export async function addNote(orderId: string, body: string): Promise<Result> {
  const { event } = await ctx(orderId);
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Write a note first." };
  await event("note", text);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function refundOrder(orderId: string, amountCents: number, restock: boolean, reason: string): Promise<Result> {
  const { sb, order, event, session } = await ctx(orderId);
  if (session.role !== "owner") return { ok: false, error: "Only the owner can issue refunds." };
  const remaining = order.total - order.refunded_amount;
  const amount = Math.round(amountCents);
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return { ok: false, error: `Enter an amount between €0.01 and €${(remaining / 100).toFixed(2)}.` };

  // Real money back when paid through Stripe; otherwise record it (refund manually in the payment provider).
  let provider = "recorded only";
  const key = process.env.STRIPE_SECRET_KEY;
  if (key && typeof order.payment_ref === "string" && order.payment_ref.startsWith("pi_")) {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: order.payment_ref, amount: String(amount), "metadata[order]": order.number }),
    });
    const r = await res.json();
    if (!res.ok) return { ok: false, error: `Stripe: ${r.error?.message ?? "refund failed"}` };
    provider = `Stripe ${r.id}`;
  }

  const refunded = order.refunded_amount + amount;
  const full = refunded >= order.total;
  const { error } = await sb.from("orders").update({ refunded_amount: refunded, ...(full ? { status: "refunded" } : {}) }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  if (restock) {
    await sb.rpc("restock_order", { p_order: orderId });
    invalidateCatalog();
  }
  const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount / 100);
  await event("refund", `${full ? "Full" : "Partial"} refund of ${eur} (${provider})${restock ? ", items restocked" : ""}${reason ? `: ${reason.slice(0, 300)}` : ""}`, { amount, provider });
  const mail = refundEmail({ number: order.number, name: order.shipping_address?.firstName ?? "", locale: order.locale, amount: eur }, (await getSettings()).emails.refund);
  const sent = await sendEmail(order.email, mail.subject, mail.html);
  await event("email", sent.sent ? `Refund email sent to ${order.email}` : `Refund email NOT sent (${sent.reason})`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: provider === "recorded only" ? "Refund recorded. No card was charged through Stripe, so return the money in your payment provider." : "Refund issued through Stripe." };
}

/** Removes a test order and puts its items back in stock. Real orders can’t be deleted. */
export async function deleteTestOrder(orderId: string): Promise<Result> {
  const { sb, order, session } = await ctx(orderId);
  if (session.role !== "owner") return { ok: false, error: "Only the owner can delete test orders." };
  if (!order.test) return { ok: false, error: "Only test orders can be deleted. Cancel or refund real orders instead." };
  if (!["cancelled", "refunded"].includes(order.status)) await sb.rpc("restock_order", { p_order: orderId });
  const { error } = await sb.from("orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  invalidateCatalog();
  revalidatePath("/admin/orders");
  return { ok: true, message: "Test order deleted." };
}
