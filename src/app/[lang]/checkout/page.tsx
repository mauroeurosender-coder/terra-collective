import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { paymentsLive } from "@/lib/server/payments";
import { supabaseService, supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const open = paymentsLive();
  let etsyShop: string | null = null;
  if (!open && supabaseConfigured) {
    const { data } = await supabaseService().from("integrations").select("data").eq("provider", "etsy").maybeSingle();
    etsyShop = (data?.data as { shop_name?: string } | null)?.shop_name ?? null;
  }
  return <CheckoutForm paymentsOpen={open} demo={!process.env.STRIPE_SECRET_KEY} etsyUrl={etsyShop ? `https://www.etsy.com/shop/${etsyShop}` : null} />;
}
