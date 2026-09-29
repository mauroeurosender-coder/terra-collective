import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data/catalog";
import { computeTotals, type ShippingMethod } from "@/lib/pricing";
import { lookupAutomatic, lookupDiscount } from "@/lib/server/discounts";
import { supabaseService } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { variantLabel } from "@/lib/variants";
import { methodsFor, validateCheckout, type CheckoutForm, type PaymentMethod } from "@/lib/checkout";
import { createPayment } from "@/lib/server/payments";

type Body = {
  lines: { variantId: string; quantity: number }[];
  form: CheckoutForm;
  payment: PaymentMethod;
  method: ShippingMethod;
  giftWrap: boolean;
  giftMessage?: string;
  discountCode?: string | null;
  locale: "en" | "pt";
  cartToken?: string;
};

/**
 * Creates an order. Prices, stock, shipping, discounts and VAT are all
 * recomputed here from the catalogue; nothing the client sends is trusted.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  const errors = validateCheckout(body.form, body.payment);
  if (Object.keys(errors).length) return NextResponse.json({ error: "invalid", fields: errors }, { status: 422 });
  if (!methodsFor(body.form.country).includes(body.payment)) {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 422 });
  }

  const products = await getProducts({ includeHidden: true });
  const items = [];
  for (const l of body.lines) {
    const product = products.find((p) => p.variants.some((v) => v.id === l.variantId));
    const variant = product?.variants.find((v) => v.id === l.variantId);
    const qty = Math.floor(Number(l.quantity));
    if (!product || !variant || qty < 1) return NextResponse.json({ error: "unknown_item", variantId: l.variantId }, { status: 422 });
    if (variant.stock < qty) return NextResponse.json({ error: "out_of_stock", variantId: l.variantId, available: variant.stock }, { status: 409 });
    items.push({ product, variant, quantity: qty });
  }

  const discount = (await lookupDiscount(body.discountCode)) ?? (await lookupAutomatic());
  const totals = computeTotals({
    lines: items.map((i) => ({ price: i.variant.price, quantity: i.quantity, shipping: i.product.shipping })),
    country: body.form.country,
    giftWrap: !!body.giftWrap,
    discount,
    method: body.method,
  });

  const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  let orderNumber = `TC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const payment = await createPayment({ orderNumber, amount: totals.total, method: body.payment, email: body.form.email, phone: body.form.mbwayPhone });

  if (live) {
    const { email: _e, marketing, mbwayPhone: _m, ...address } = body.form;
    void _e;
    void _m;
    const { data, error } = await supabaseService().rpc("place_order", {
      p: {
        status: payment.status === "succeeded" ? "paid" : "pending_payment",
        email: body.form.email,
        locale: body.locale,
        country: body.form.country,
        address,
        nif: body.form.nif,
        marketing,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        shipping_method: body.method,
        gift_wrap: totals.wrap > 0,
        gift_message: body.giftMessage?.slice(0, 240) ?? "",
        discount_code: discount && !("automatic" in discount && discount.automatic) ? discount.code : "",
        discount_amount: totals.discountAmount,
        vat: totals.vat,
        total: totals.total,
        payment_method: body.payment,
        payment_ref: payment.reference,
        items: items.map((i) => ({
          variant_id: i.variant.id,
          name: i.product.name.en,
          variant_label: variantLabel(i.product.options, i.variant, "en"),
          unit_price: i.variant.price,
          quantity: i.quantity,
        })),
      },
    });
    if (error) {
      const m = /out_of_stock:(\S+)/.exec(error.message);
      if (m) return NextResponse.json({ error: "out_of_stock", variantId: m[1] }, { status: 409 });
      console.error("[checkout] place_order failed", error);
      return NextResponse.json({ error: "order_failed" }, { status: 500 });
    }
    orderNumber = (data as { number: string }).number;
    const svc = supabaseService();
    if (discount?.kind === "gift_card" && totals.discountAmount > 0) await svc.rpc("redeem_gift_card", { p_code: discount.code, p_amount: totals.discountAmount });
    if (body.cartToken) await svc.from("carts").update({ recovered_order_id: (data as { id: string }).id }).eq("token", body.cartToken.slice(0, 64));
    invalidateCatalog(); // stock changed
    // TODO(payments): with Stripe live, confirm the PaymentIntent client-side and flip to "paid" from the webhook.
  } else {
    console.info("[dev:order]", orderNumber, totals.total);
  }

  return NextResponse.json({ orderNumber, totals, payment });
}
