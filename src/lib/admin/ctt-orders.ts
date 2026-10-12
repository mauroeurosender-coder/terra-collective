import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeSettings } from "../settings";
import { defaultCustoms } from "../customs";
import { lineUnit, type OrderRow } from "./profit";

/** Orders waiting to be shipped, with everything the CTT file needs (weights, customs lines). */

export type CttLine = { productId: string | null; name: string; desc: string; hs: string; qty: number; value: number; grams: number | null; known: boolean };
export type CttOrder = {
  id: string;
  number: string;
  source: string;
  createdAt: string;
  status: string;
  name: string;
  address: string;
  postal: string;
  city: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  grams: number | null; // products + box; null when a product has no weight
  lines: CttLine[];
};

const SELECT =
  "id, number, source, status, created_at, country, email, shipping_address, order_items(quantity, unit_price, name, variant_label, product_id, variants(cost, weight_g), products(id, name, customs_desc, hs_code, variants(cost, weight_g)))";

export async function loadCttOrders(sb: SupabaseClient, ids?: string[]) {
  let q = sb.from("orders").select(SELECT).eq("test", false).order("created_at");
  q = ids ? q.in("id", ids) : q.in("status", ["paid", "packing"]);
  const [{ data }, { data: sets }] = await Promise.all([q, sb.from("settings").select("key, value")]);
  const settings = mergeSettings(sets ?? []);
  const fallbackEmail = settings.ctt.fallbackEmail || settings.store.email;
  const box = settings.profit.packagingWeight ?? 0;

  const orders: CttOrder[] = ((data ?? []) as any[]).map((o) => {
    const a = o.shipping_address ?? {};
    let grams: number | null = box;
    const lines: CttLine[] = (o.order_items ?? []).map((i: any) => {
      const unit = lineUnit(i as OrderRow["order_items"][number]);
      if (unit.weight == null) grams = null;
      else if (grams != null) grams += unit.weight * i.quantity;
      const def = defaultCustoms(i.products?.name?.en ?? i.name);
      return {
        productId: i.products?.id ?? i.product_id ?? null,
        name: i.name,
        desc: i.products?.customs_desc || def.desc,
        hs: i.products?.hs_code || def.hs,
        qty: i.quantity,
        value: (i.unit_price * i.quantity) / 100,
        grams: unit.weight == null ? null : unit.weight * i.quantity,
        known: Boolean(i.products?.customs_desc && i.products?.hs_code),
      };
    });
    const email = String(o.email ?? "");
    return {
      id: o.id,
      number: o.number,
      source: o.source,
      createdAt: o.created_at,
      status: o.status,
      name: [a.firstName, a.lastName].filter(Boolean).join(" ").trim(),
      address: [a.address1, a.address2].filter(Boolean).join(", "),
      postal: a.postal ?? "",
      city: a.city ?? "",
      region: a.state ?? "",
      country: o.country ?? a.country ?? "",
      // Etsy hides buyer emails (…@etsy.invalid): use the shop's own email instead.
      email: !email || /\.invalid$/i.test(email) ? fallbackEmail : email,
      phone: a.phone ?? "",
      grams,
      lines,
    };
  });
  return { orders, settings };
}
