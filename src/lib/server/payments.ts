import "server-only";
import type { PaymentMethod } from "../checkout";

export type PaymentResult = {
  status: "succeeded" | "requires_action" | "pending";
  reference: string;
  /** Stripe PaymentIntent client secret, when Stripe is configured. */
  clientSecret?: string;
  /** Multibanco voucher details. */
  multibanco?: { entity: string; reference: string; expiresAt: string };
  /** Redirect for PayPal / Klarna hosted flows. */
  redirectUrl?: string;
  demo: boolean;
};

const stripeMethod: Record<PaymentMethod, string> = {
  card: "card",
  mbway: "mb_way",
  multibanco: "multibanco",
  paypal: "paypal",
  klarna: "klarna",
};

/**
 * Payment seam. With STRIPE_SECRET_KEY set, creates a PaymentIntent that the
 * Stripe Payment Element confirms on the client (cards, Apple/Google Pay,
 * Klarna, Multibanco, MB WAY, PayPal where enabled on the account). If a
 * method isn't available on Stripe for the account, swap in ifthenpay or Eupago
 * here. Without keys it runs in demo mode so the full flow can be tested.
 */
export async function createPayment(opts: { orderNumber: string; amount: number; method: PaymentMethod; email: string; phone?: string }): Promise<PaymentResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    const params = new URLSearchParams({
      amount: String(opts.amount),
      currency: "eur",
      "payment_method_types[]": stripeMethod[opts.method],
      receipt_email: opts.email,
      "metadata[order]": opts.orderNumber,
    });
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const pi = await res.json();
    if (!res.ok) throw new Error(pi.error?.message ?? "stripe_error");
    return { status: "requires_action", reference: pi.id, clientSecret: pi.client_secret, demo: false };
  }

  // Demo mode
  if (opts.method === "multibanco") {
    const ref = String(Math.floor(100_000_000 + Math.random() * 899_999_999));
    return {
      status: "pending",
      reference: `demo_${opts.orderNumber}`,
      multibanco: { entity: "21 312", reference: `${ref.slice(0, 3)} ${ref.slice(3, 6)} ${ref.slice(6)}`, expiresAt: new Date(Date.now() + 72 * 3600_000).toISOString() },
      demo: true,
    };
  }
  if (opts.method === "mbway") return { status: "pending", reference: `demo_${opts.orderNumber}`, demo: true };
  return { status: "succeeded", reference: `demo_${opts.orderNumber}`, demo: true };
}
