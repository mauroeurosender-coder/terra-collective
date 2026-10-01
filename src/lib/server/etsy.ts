import "server-only";
import { supabaseService } from "../supabase/server";
import { store } from "../config";
import type { OrderStatus } from "../admin/types";

/**
 * Etsy Open API v3 integration.
 * - OAuth 2.0 (authorization code + PKCE), tokens kept in the private `integrations` table.
 * - Imports shop receipts as orders (source = 'etsy') and keeps their status in sync.
 * - Pushes tracking numbers back to Etsy when an Etsy order is marked shipped here.
 *
 * Env: ETSY_API_KEY (keystring), ETSY_SHARED_SECRET (optional; some Etsy apps require
 * "keystring:secret" in the x-api-key header).
 */

// ETSY_API_BASE only exists to test against a local mock server.
const API = process.env.ETSY_API_BASE ?? "https://api.etsy.com/v3";
export const ETSY_SCOPES = "transactions_r transactions_w listings_r shops_r profile_r email_r";

export type EtsyData = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // ms
  user_id?: number;
  shop_id?: number;
  shop_name?: string;
  connected_at?: string;
  last_sync_at?: string | null;
  last_sync_result?: string;
  options?: { reduceStock: boolean; pushTracking: boolean; importSince: string };
  pkce?: { verifier: string; state: string; created: number };
};

export const etsyConfigured = () => Boolean(process.env.ETSY_API_KEY);
export const etsyRedirectUri = () => `${store.url}/api/etsy/callback`;
const defaultOptions = (): NonNullable<EtsyData["options"]> => ({ reduceStock: true, pushTracking: true, importSince: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) });

export async function getEtsy(): Promise<EtsyData> {
  const { data } = await supabaseService().from("integrations").select("data").eq("provider", "etsy").maybeSingle();
  const d = (data?.data ?? {}) as EtsyData;
  return { ...d, options: { ...defaultOptions(), ...d.options } };
}

export async function saveEtsy(patch: Partial<EtsyData>) {
  const cur = await getEtsy();
  await supabaseService().from("integrations").upsert({ provider: "etsy", data: { ...cur, ...patch }, updated_at: new Date().toISOString() });
}

export async function disconnectEtsy() {
  const cur = await getEtsy();
  await supabaseService().from("integrations").upsert({ provider: "etsy", data: { options: cur.options }, updated_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ OAuth */

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function startEtsyAuth() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await saveEtsy({ pkce: { verifier, state, created: Date.now() } });
  const u = new URL("https://www.etsy.com/oauth/connect");
  u.search = new URLSearchParams({
    response_type: "code",
    redirect_uri: etsyRedirectUri(),
    scope: ETSY_SCOPES,
    client_id: process.env.ETSY_API_KEY!,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${API}/public/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.ETSY_API_KEY!, ...body }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Etsy sign-in failed: ${j.error_description ?? j.error ?? res.status}`);
  return j as { access_token: string; refresh_token: string; expires_in: number };
}

export async function finishEtsyAuth(code: string, state: string) {
  const cur = await getEtsy();
  if (!cur.pkce || cur.pkce.state !== state || Date.now() - cur.pkce.created > 15 * 60_000) throw new Error("The Etsy sign-in link expired. Please try again.");
  const t = await tokenRequest({ grant_type: "authorization_code", redirect_uri: etsyRedirectUri(), code, code_verifier: cur.pkce.verifier });
  const userId = Number(t.access_token.split(".")[0]);
  await saveEtsy({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000, user_id: userId, pkce: undefined, connected_at: new Date().toISOString() });
  const me = await etsyFetch<{ user_id: number; shop_id: number }>(`/application/users/me`);
  const shop = me.shop_id ? await etsyFetch<{ shop_name: string }>(`/application/shops/${me.shop_id}`) : null;
  await saveEtsy({ shop_id: me.shop_id, shop_name: shop?.shop_name });
}

/* ------------------------------------------------------------------ API calls */

let keyFormat: "plain" | "withSecret" | null = null;

async function accessToken() {
  const cur = await getEtsy();
  if (!cur.refresh_token) throw new Error("Etsy isn’t connected.");
  if (cur.access_token && cur.expires_at && cur.expires_at - Date.now() > 60_000) return cur.access_token;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: cur.refresh_token });
  await saveEtsy({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

export async function etsyFetch<T>(path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<T> {
  const token = await accessToken();
  const key = process.env.ETSY_API_KEY!;
  const secret = process.env.ETSY_SHARED_SECRET;
  const formats: ("plain" | "withSecret")[] = keyFormat ? [keyFormat] : secret ? ["withSecret", "plain"] : ["plain"];
  let last = "";
  for (const f of formats) {
    const res = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "x-api-key": f === "withSecret" ? `${key}:${secret}` : key,
        authorization: `Bearer ${token}`,
        ...(init.form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.form ? new URLSearchParams(init.form) : undefined,
      cache: "no-store",
    });
    if (res.ok) {
      keyFormat = f;
      return (await res.json()) as T;
    }
    last = `${res.status} ${(await res.text()).slice(0, 200)}`;
    if (res.status !== 401 && res.status !== 403) break;
  }
  throw new Error(`Etsy API error: ${last}`);
}

/* ------------------------------------------------------------------ Receipts → orders */

type Money = { amount: number; divisor: number; currency_code: string };
type Receipt = {
  receipt_id: number;
  status: string; // paid | completed | open | payment processing | canceled | fully refunded | partially refunded
  is_paid: boolean;
  is_shipped: boolean;
  create_timestamp: number;
  updated_timestamp: number;
  name: string;
  first_line: string | null;
  second_line: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country_iso: string | null;
  buyer_email: string | null;
  buyer_user_id: number;
  message_from_buyer: string | null;
  is_gift: boolean;
  gift_message: string | null;
  payment_method: string | null;
  grandtotal: Money;
  subtotal: Money;
  total_shipping_cost: Money;
  total_tax_cost: Money;
  total_vat_cost?: Money;
  discount_amt: Money;
  refunds?: { amount: Money }[];
  shipments?: { carrier_name: string; tracking_code: string; shipment_notification_timestamp: number }[];
  transactions: { listing_id: number; sku: string | null; title: string; quantity: number; price: Money; variations?: { formatted_name: string; formatted_value: string }[] }[];
};

const cents = (m?: Money | null) => (m ? Math.round((m.amount / (m.divisor || 100)) * 100) : 0);
const rank: Record<OrderStatus, number> = { pending_payment: 0, paid: 1, packing: 2, shipped: 3, delivered: 4, cancelled: 9, refunded: 9 };

/** Etsy receipt → our status. */
export function mapEtsyStatus(r: Receipt): OrderStatus {
  const s = r.status.toLowerCase();
  if (s.includes("canceled") || s.includes("cancelled")) return "cancelled";
  if (s === "fully refunded") return "refunded";
  if (r.is_shipped || (r.shipments?.length ?? 0) > 0) return "shipped";
  if (r.is_paid) return "paid";
  return "pending_payment";
}

export async function syncEtsyOrders(opts: { full?: boolean } = {}) {
  const sb = supabaseService();
  const cur = await getEtsy();
  if (!cur.shop_id) throw new Error("Etsy isn’t connected.");
  const since = opts.full || !cur.last_sync_at ? new Date(`${cur.options!.importSince}T00:00:00Z`) : new Date(new Date(cur.last_sync_at).getTime() - 10 * 60_000);
  const startedAt = new Date().toISOString();

  // Products & variants for matching (by SKU, then Etsy listing id).
  const [{ data: variants }, { data: products }] = await Promise.all([
    sb.from("variants").select("id, sku, product_id, options"),
    sb.from("products").select("id, etsy_listing_id, variants(id)"),
  ]);
  const bySku = new Map((variants ?? []).map((v) => [v.sku?.toUpperCase(), v]));
  const byListing = new Map((products ?? []).filter((p) => p.etsy_listing_id).map((p) => [String(p.etsy_listing_id), p]));

  let created = 0;
  let updated = 0;
  let unmatched = 0;
  for (let offset = 0; offset < 2000; offset += 100) {
    const page = await etsyFetch<{ count: number; results: Receipt[] }>(
      `/application/shops/${cur.shop_id}/receipts?min_last_modified=${Math.floor(since.getTime() / 1000)}&limit=100&offset=${offset}&sort_on=updated&sort_order=asc`,
    );
    for (const r of page.results) {
      const status = mapEtsyStatus(r);
      const refunded = Math.min(cents(r.grandtotal), (r.refunds ?? []).reduce((n, x) => n + cents(x.amount), 0));
      const ship = r.shipments?.[r.shipments.length - 1];
      const { data: existing } = await sb.from("orders").select("id, status, external_status, tracking_number, refunded_amount").eq("source", "etsy").eq("external_id", String(r.receipt_id)).maybeSingle();

      if (existing) {
        const patch: Record<string, unknown> = { external_status: r.status };
        const next = status;
        const curStatus = existing.status as OrderStatus;
        // Only move forward (never undo local "packing"), except cancellations/refunds which always apply.
        if (next !== curStatus && (rank[next] > rank[curStatus] || next === "cancelled" || next === "refunded")) {
          patch.status = next;
          if (next === "shipped") patch.shipped_at = new Date((ship?.shipment_notification_timestamp ?? r.updated_timestamp) * 1000).toISOString();
          if (next === "paid") patch.paid_at = new Date(r.updated_timestamp * 1000).toISOString();
        }
        if (ship && !existing.tracking_number) Object.assign(patch, { carrier: ship.carrier_name, tracking_number: ship.tracking_code });
        if (refunded !== existing.refunded_amount) patch.refunded_amount = refunded;
        const changed = patch.status || patch.tracking_number || patch.refunded_amount !== undefined || existing.external_status !== r.status;
        if (changed) {
          await sb.from("orders").update(patch).eq("id", existing.id);
          if (patch.status) await sb.from("order_events").insert({ order_id: existing.id, kind: "status", body: `Etsy: status changed to ${String(patch.status).replace("_", " ")} (${r.status})` });
          updated++;
        }
        continue;
      }

      // New order
      const [firstName, ...rest] = (r.name ?? "").trim().split(/\s+/);
      const email = (r.buyer_email || `etsy-buyer-${r.buyer_user_id}@etsy.invalid`).toLowerCase();
      const country = (r.country_iso ?? "PT").toUpperCase();
      const { data: cust } = await sb
        .from("customers")
        .upsert({ email, first_name: firstName ?? null, last_name: rest.join(" ") || null, country, tags: ["etsy"] }, { onConflict: "email" })
        .select("id")
        .single();
      const created_at = new Date(r.create_timestamp * 1000).toISOString();
      const { data: order, error } = await sb
        .from("orders")
        .insert({
          number: `ETSY-${r.receipt_id}`,
          source: "etsy",
          external_id: String(r.receipt_id),
          external_status: r.status,
          external_url: `https://www.etsy.com/your/orders/sold?order_id=${r.receipt_id}`,
          customer_id: cust?.id ?? null,
          status,
          email,
          locale: country === "PT" ? "pt" : "en",
          country,
          shipping_address: { country, firstName: firstName ?? "", lastName: rest.join(" "), address1: r.first_line ?? "", address2: r.second_line ?? "", postal: r.zip ?? "", city: r.city ?? "", state: r.state ?? "", phone: "" },
          subtotal: cents(r.subtotal),
          shipping: cents(r.total_shipping_cost),
          shipping_method: "etsy",
          gift_wrap: r.is_gift,
          gift_message: r.gift_message || null,
          discount_amount: cents(r.discount_amt),
          vat: cents(r.total_vat_cost ?? r.total_tax_cost),
          total: cents(r.grandtotal),
          refunded_amount: refunded,
          payment_method: r.payment_method ? `etsy · ${r.payment_method}` : "etsy",
          payment_ref: `etsy-${r.receipt_id}`,
          carrier: ship?.carrier_name ?? null,
          tracking_number: ship?.tracking_code ?? null,
          created_at,
          paid_at: r.is_paid ? created_at : null,
          shipped_at: ship ? new Date(ship.shipment_notification_timestamp * 1000).toISOString() : null,
        })
        .select("id")
        .single();
      if (error || !order) {
        // A concurrent sync may have inserted it already.
        if (error?.code !== "23505") console.error("[etsy] insert failed", r.receipt_id, error);
        continue;
      }
      const items = r.transactions.map((t) => {
        const v = (t.sku && bySku.get(t.sku.toUpperCase())) || null;
        const p = !v ? byListing.get(String(t.listing_id)) : null;
        const variantId = v?.id ?? (p && p.variants?.length === 1 ? p.variants[0].id : null);
        if (!variantId) unmatched++;
        return {
          order_id: order.id,
          product_id: v?.product_id ?? p?.id ?? null,
          variant_id: variantId,
          sku: t.sku,
          name: t.title,
          variant_label: (t.variations ?? []).map((x) => x.formatted_value).join(" · ") || null,
          unit_price: cents(t.price),
          quantity: t.quantity,
        };
      });
      await sb.from("order_items").insert(items);
      const notes = [`Imported from Etsy (receipt ${r.receipt_id}, ${r.status}).`, r.message_from_buyer ? `Buyer’s note: ${r.message_from_buyer}` : ""].filter(Boolean).join(" ");
      await sb.from("order_events").insert({ order_id: order.id, kind: "note", body: notes, created_at });
      if (cur.options!.reduceStock && status !== "cancelled" && status !== "refunded") {
        for (const it of items) if (it.variant_id) await sb.rpc("decrement_stock", { p_variant: it.variant_id, p_qty: it.quantity });
      }
      created++;
    }
    if (page.results.length < 100) break;
  }

  const result = `${created} new, ${updated} updated${unmatched ? `, ${unmatched} item${unmatched === 1 ? "" : "s"} not matched to a product` : ""}`;
  await saveEtsy({ last_sync_at: startedAt, last_sync_result: result });
  return { created, updated, unmatched, result };
}

/** Sends a tracking number to Etsy for an imported order (Etsy then notifies the buyer). */
export async function pushEtsyTracking(receiptId: string, carrier: string, tracking: string) {
  const cur = await getEtsy();
  if (!cur.shop_id || !cur.options?.pushTracking) return { sent: false, reason: "Etsy tracking sync is off" };
  await etsyFetch(`/application/shops/${cur.shop_id}/receipts/${receiptId}/tracking`, { method: "POST", form: { tracking_code: tracking, carrier_name: carrier, send_bcc: "false" } });
  return { sent: true };
}
