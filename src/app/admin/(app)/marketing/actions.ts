"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { layout, sendEmail } from "@/lib/server/email";
import { store } from "@/lib/config";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export type DiscountInput = {
  id?: string;
  code: string | null;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  minSpend: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  automatic: boolean;
  active: boolean;
};

export async function saveDiscount(d: DiscountInput): Promise<Result> {
  await requireAdmin();
  const code = d.automatic ? d.code?.trim().toUpperCase() || null : d.code?.trim().toUpperCase() ?? "";
  if (!d.automatic && !/^[A-Z0-9-]{3,30}$/.test(code ?? "")) return { ok: false, error: "Codes use 3–30 letters, numbers or dashes." };
  if (d.kind === "percent" && (d.value <= 0 || d.value > 100)) return { ok: false, error: "Percentage must be between 1 and 100." };
  if (d.kind === "fixed" && d.value <= 0) return { ok: false, error: "Enter an amount." };
  const row = {
    code,
    kind: d.kind,
    value: d.kind === "free_shipping" ? 0 : d.value,
    min_spend: d.minSpend,
    starts_at: d.startsAt || null,
    ends_at: d.endsAt || null,
    usage_limit: d.usageLimit,
    automatic: d.automatic,
    active: d.active,
  };
  const sb = await supabaseServer();
  const { error } = d.id ? await sb.from("discounts").update(row).eq("id", d.id) : await sb.from("discounts").insert(row);
  if (error) return { ok: false, error: error.code === "23505" ? "That code already exists." : error.message };
  revalidatePath("/admin/marketing");
  return { ok: true, message: "Discount saved." };
}

export async function deleteDiscount(id: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("discounts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true };
}

const giftCode = () => `TERRA-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("").replace(/(.{3})(.{3})/, "$1-$2")}`;

export async function issueGiftCard(input: { value: number; recipientEmail: string; recipientName: string; message: string; send: boolean }): Promise<Result> {
  await requireAdmin();
  if (!Number.isInteger(input.value) || input.value <= 0) return { ok: false, error: "Enter a value." };
  const sb = await supabaseServer();
  const code = giftCode();
  const expires = new Date(Date.now() + 2 * 365 * 86400_000).toISOString();
  const { error } = await sb.from("gift_cards").insert({ code, initial_value: input.value, balance: input.value, recipient_email: input.recipientEmail || null, recipient_name: input.recipientName || null, message: input.message || null, expires_at: expires });
  if (error) return { ok: false, error: error.message };
  let note = "";
  if (input.send && input.recipientEmail) {
    const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(input.value / 100);
    const r = await sendEmail(input.recipientEmail, `A ${eur} gift card from ${store.name}`, layout(`A gift for you${input.recipientName ? `, ${input.recipientName}` : ""}`, `<p>${input.message ? input.message.replace(/</g, "&lt;") : "Enjoy something handmade from Portugal."}</p><p style="font-size:24px;font-weight:bold;letter-spacing:2px">${code}</p><p>Value: <b>${eur}</b> · valid for 2 years · <a href="${store.url}/en/shop">Shop now</a></p>`));
    note = r.sent ? " and emailed" : " (email not sent: Resend isn’t configured)";
  }
  revalidatePath("/admin/marketing");
  return { ok: true, message: `Gift card ${code} created${note}.` };
}

export async function setGiftCardBalance(id: string, balance: number): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.from("gift_cards").update({ balance: Math.max(0, Math.round(balance)) }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/marketing");
  return { ok: true, message: "Balance updated." };
}

/** Emails everyone waiting for a variant that is now in stock. */
export async function notifyWaitlist(variantId: string): Promise<Result> {
  await requireAdmin();
  const sb = await supabaseServer();
  const { data: v } = await sb.from("variants").select("stock, options, products(slug, name)").eq("id", variantId).single();
  if (!v) return { ok: false, error: "Variant not found." };
  if (v.stock <= 0) return { ok: false, error: "It’s still out of stock. Restock it first (Products)." };
  const p = v.products as unknown as { slug: string; name: { en: string; pt: string } };
  const { data: reqs } = await sb.from("back_in_stock_requests").select("id, email, locale").eq("variant_id", variantId).is("notified_at", null);
  let sent = 0;
  for (const r of reqs ?? []) {
    const pt = r.locale === "pt";
    const name = pt ? p.name.pt : p.name.en;
    const res = await sendEmail(r.email, pt ? `${name} voltou!` : `${name} is back in stock`, layout(pt ? "Voltou!" : "It’s back!", `<p>${pt ? "A peça que queria está de novo disponível, mas o stock é pequeno." : "The piece you were waiting for is available again, but stock is small."}</p><p style="margin:24px 0"><a href="${store.url}/${r.locale}/products/${p.slug}?variant=${variantId}" style="background:#1C2A3A;color:#FAF7F2;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${pt ? "Ver peça" : "View the piece"}</a></p>`));
    if (res.sent) {
      sent++;
      await sb.from("back_in_stock_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  revalidatePath("/admin/marketing");
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "Emails can’t be sent until RESEND_API_KEY is set." };
  return { ok: true, message: `Notified ${sent} of ${reqs?.length ?? 0} people.` };
}
