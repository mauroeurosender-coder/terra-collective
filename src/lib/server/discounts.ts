import "server-only";
import { findDiscount, type Discount } from "../pricing";
import { supabaseService } from "../supabase/server";

const live = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Looks up a discount code or gift card, enforcing active flag, dates, usage limit and balance. */
export async function lookupDiscount(raw: string | null | undefined): Promise<Discount | null> {
  const code = raw?.trim().toUpperCase();
  if (!code) return null;
  if (!live()) return findDiscount(code);
  const sb = supabaseService();
  const now = new Date().toISOString();
  const { data: d } = await sb.from("discounts").select("*").eq("code", code).eq("active", true).maybeSingle();
  if (d) {
    if (d.starts_at && d.starts_at > now) return null;
    if (d.ends_at && d.ends_at < now) return null;
    if (d.usage_limit != null && d.used_count >= d.usage_limit) return null;
    const min = d.min_spend ?? undefined;
    if (d.kind === "percent") return { code, kind: "percent", value: d.value, minSpend: min };
    if (d.kind === "fixed") return { code, kind: "fixed", value: d.value, minSpend: min };
    return { code, kind: "free_shipping", minSpend: min };
  }
  const { data: g } = await sb.from("gift_cards").select("code, balance, expires_at").eq("code", code).maybeSingle();
  if (g && g.balance > 0 && (!g.expires_at || g.expires_at > now)) return { code, kind: "gift_card", value: g.balance };
  return null;
}

/** Best active automatic promotion (no code needed), if any. */
export async function lookupAutomatic(): Promise<Discount | null> {
  if (!live()) return null;
  const now = new Date().toISOString();
  const { data } = await supabaseService().from("discounts").select("*").eq("automatic", true).eq("active", true).order("created_at", { ascending: false });
  const d = (data ?? []).find((x) => (!x.starts_at || x.starts_at <= now) && (!x.ends_at || x.ends_at >= now) && (x.usage_limit == null || x.used_count < x.usage_limit));
  if (!d) return null;
  const label = d.code ?? "AUTO";
  const min = d.min_spend ?? undefined;
  if (d.kind === "percent") return { code: label, kind: "percent", value: d.value, minSpend: min, automatic: true } as Discount;
  if (d.kind === "fixed") return { code: label, kind: "fixed", value: d.value, minSpend: min, automatic: true } as Discount;
  return { code: label, kind: "free_shipping", minSpend: min, automatic: true } as Discount;
}
