import "server-only";
import { supabaseService } from "../supabase/server";
import { store } from "../config";

/**
 * Moloni (certified Portuguese invoicing) — creates DRAFT invoice-receipts for paid orders.
 * Drafts are not communicated to the AT until the owner finalises them in Moloni.
 *
 * Env: MOLONI_CLIENT_ID (Developer ID), MOLONI_CLIENT_SECRET.
 * API: https://www.moloni.pt/dev/ — OAuth2 authorization code; calls are POST
 * https://api.moloni.pt/v1/{endpoint}/?access_token=… with form-encoded (PHP-style) bodies.
 */

const API = "https://api.moloni.pt/v1";
const EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);

export type MoloniData = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  refresh_expires_at?: number;
  connected_at?: string;
  company_id?: number;
  company_name?: string;
  document_set_id?: number;
  document_set_name?: string;
  setup?: { tax23_id: number; unit_id: number; category_id: number; maturity_date_id: number; payment_method_id: number; language_pt: number; language_en: number };
  options?: { startFrom: string; channels: { web: boolean; etsy: boolean }; oss: boolean };
  last_run_at?: string;
  last_run_result?: string;
};

export const moloniConfigured = () => Boolean(process.env.MOLONI_CLIENT_ID && process.env.MOLONI_CLIENT_SECRET);
export const moloniRedirectUri = () => `${store.url}/api/moloni/callback`;

export async function getMoloni(): Promise<MoloniData> {
  const { data } = await supabaseService().from("integrations").select("data").eq("provider", "moloni").maybeSingle();
  const d = (data?.data ?? {}) as MoloniData;
  return { ...d, options: { startFrom: new Date().toISOString(), channels: { web: true, etsy: true }, oss: false, ...d.options } };
}

export async function saveMoloni(patch: Partial<MoloniData>) {
  const cur = await getMoloni();
  await supabaseService().from("integrations").upsert({ provider: "moloni", data: { ...cur, ...patch }, updated_at: new Date().toISOString() });
}

export async function disconnectMoloni() {
  const cur = await getMoloni();
  await supabaseService().from("integrations").upsert({ provider: "moloni", data: { options: cur.options }, updated_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ OAuth */

export function moloniAuthUrl() {
  const u = new URL(`${API}/authorize/`);
  u.search = new URLSearchParams({ response_type: "code", client_id: process.env.MOLONI_CLIENT_ID!, redirect_uri: moloniRedirectUri() }).toString();
  return u.toString();
}

async function grant(params: Record<string, string>) {
  const u = new URL(`${API}/grant/`);
  u.search = new URLSearchParams({ client_id: process.env.MOLONI_CLIENT_ID!, client_secret: process.env.MOLONI_CLIENT_SECRET!, ...params }).toString();
  const res = await fetch(u, { cache: "no-store" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error(`Moloni: ${j.error_description ?? j.error ?? res.status}`);
  return j as { access_token: string; refresh_token: string; expires_in: number };
}

export async function finishMoloniAuth(code: string) {
  const t = await grant({ grant_type: "authorization_code", redirect_uri: moloniRedirectUri(), code });
  await saveMoloni({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: Date.now() + t.expires_in * 1000,
    refresh_expires_at: Date.now() + 13 * 86_400_000,
    connected_at: new Date().toISOString(),
    // Only orders paid from now on are invoiced.
    options: { ...(await getMoloni()).options!, startFrom: new Date().toISOString() },
  });
  await autoSetup();
}

async function token() {
  const cur = await getMoloni();
  if (!cur.refresh_token) throw new Error("Moloni isn’t connected.");
  if (cur.access_token && cur.expires_at && cur.expires_at - Date.now() > 60_000) return cur.access_token;
  const t = await grant({ grant_type: "refresh_token", refresh_token: cur.refresh_token });
  await saveMoloni({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000, refresh_expires_at: Date.now() + 13 * 86_400_000 });
  return t.access_token;
}

/** PHP-style form encoding: products[0][taxes][0][tax_id]=… */
function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  return out;
}

export async function moloni<T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API}/${endpoint}/?access_token=${encodeURIComponent(await token())}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form(params),
    cache: "no-store",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Moloni ${endpoint}: ${res.status} ${JSON.stringify(j).slice(0, 300)}`);
  // Insert/update calls return { valid: 0, ... } with field errors on failure.
  if (j && typeof j === "object" && !Array.isArray(j) && "valid" in j && !(j as { valid: number }).valid) {
    throw new Error(`Moloni ${endpoint}: ${JSON.stringify(j).slice(0, 400)}`);
  }
  return j as T;
}

/* ------------------------------------------------------------------ One-time setup */

type Named = { name: string };

/** Picks the company, document set and the ids invoices need. Creates missing helpers (category, payment method). */
export async function autoSetup(choice: { company_id?: number; document_set_id?: number } = {}) {
  const companies = await moloni<({ company_id: number } & Named)[]>("companies/getAll");
  if (!companies.length) throw new Error("This Moloni account has no company.");
  // Never default to Moloni’s sample company (“Empresa Demonstração”).
  const company = companies.find((c) => c.company_id === choice.company_id) ?? companies.find((c) => !/demonstra|demo company/i.test(c.name)) ?? companies[0];
  const company_id = company.company_id;

  const [sets, taxes, units, cats, maturities, payments, languages] = await Promise.all([
    moloni<({ document_set_id: number } & Named)[]>("documentSets/getAll", { company_id }),
    moloni<{ tax_id: number; value: number; name: string; fiscal_zone?: string }[]>("taxes/getAll", { company_id }),
    moloni<{ unit_id: number; name: string; short_name: string }[]>("measurementUnits/getAll", { company_id }),
    moloni<({ category_id: number } & Named)[]>("productCategories/getAll", { company_id, parent_id: 0 }),
    moloni<{ maturity_date_id: number; days: number }[]>("maturityDates/getAll", { company_id }),
    moloni<({ payment_method_id: number } & Named)[]>("paymentMethods/getAll", { company_id }),
    moloni<{ language_id: number; code: string }[]>("languages/getAll", {}),
  ]);
  // Prefer an invoice-receipt series (e.g. FR2026) when none was chosen.
  const set = sets.find((s) => s.document_set_id === choice.document_set_id) ?? sets.find((s) => /^FR/i.test(s.name)) ?? sets[0];
  if (!set) throw new Error("Create a document series (Série) in Moloni first.");
  const tax23 = taxes.find((t) => Number(t.value) === 23 && (!t.fiscal_zone || t.fiscal_zone === "PT"));
  if (!tax23) throw new Error("No 23% VAT rate found in Moloni.");
  const unit = units.find((u) => /^(un|uni|unid)/i.test(u.short_name) || /unidade/i.test(u.name)) ?? units[0];
  if (!unit) throw new Error("Create a measurement unit (Unidade) in Moloni first.");
  let category = cats.find((c) => /terra collective|loja online/i.test(c.name));
  if (!category) {
    const r = await moloni<{ category_id: number }>("productCategories/insert", { company_id, parent_id: 0, name: "Loja online", description: "Artigos criados pela loja Terra Collective", pos_enabled: 0 });
    category = { category_id: r.category_id, name: "Loja online" };
  }
  const maturity = maturities.find((m) => Number(m.days) === 0) ?? maturities[0];
  if (!maturity) throw new Error("Create a payment term (Prazo de vencimento) in Moloni first.");
  let pm = payments.find((p) => /online|loja|etsy|cart/i.test(p.name));
  if (!pm) {
    const r = await moloni<{ payment_method_id: number }>("paymentMethods/insert", { company_id, name: "Pagamento online" });
    pm = { payment_method_id: r.payment_method_id, name: "Pagamento online" };
  }
  const langPt = languages.find((l) => /^pt/i.test(l.code))?.language_id ?? 1;
  const langEn = languages.find((l) => /^en/i.test(l.code))?.language_id ?? langPt;

  await saveMoloni({
    company_id,
    company_name: company.name,
    document_set_id: set.document_set_id,
    document_set_name: set.name,
    setup: { tax23_id: tax23.tax_id, unit_id: unit.unit_id, category_id: category.category_id, maturity_date_id: maturity.maturity_date_id, payment_method_id: pm.payment_method_id, language_pt: langPt, language_en: langEn },
  });
  return { companies: companies.map((c) => ({ id: c.company_id, name: c.name })), sets: sets.map((s) => ({ id: s.document_set_id, name: s.name })) };
}

/* ------------------------------------------------------------------ Invoices */

type Order = {
  id: string;
  number: string;
  source: string;
  status: string;
  email: string;
  locale: string;
  country: string;
  nif: string | null;
  shipping_address: { firstName?: string; lastName?: string; company?: string; address1?: string; address2?: string; postal?: string; city?: string };
  subtotal: number;
  shipping: number;
  gift_wrap: boolean;
  discount_amount: number;
  vat: number;
  total: number;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  order_items: { name: string; sku: string | null; variant_label: string | null; unit_price: number; quantity: number }[];
};

const euro = (c: number) => Math.round(c) / 100;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

let countryCache: Map<string, number> | null = null;
async function countryId(iso: string) {
  if (!countryCache) {
    const list = await moloni<{ country_id: number; iso_3166_1: string }[]>("countries/getAll", {});
    countryCache = new Map(list.map((c) => [c.iso_3166_1.toUpperCase(), c.country_id]));
  }
  return countryCache.get(iso.toUpperCase()) ?? countryCache.get("PT") ?? 1;
}

async function ensureCustomer(o: Order, m: MoloniData) {
  const company_id = m.company_id!;
  const s = m.setup!;
  const vat = o.nif && /^\d{9}$/.test(o.nif.replace(/\D/g, "")) ? o.nif.replace(/\D/g, "") : "999999990";
  if (vat !== "999999990") {
    const found = await moloni<{ customer_id: number }[]>("customers/getByVat", { company_id, vat });
    if (found.length) return found[0].customer_id;
  }
  const number = `${o.source === "etsy" ? "ETSY" : "WEB"}-${o.email.replace(/[^a-z0-9]/gi, "").slice(0, 20).toUpperCase()}`;
  const byNumber = await moloni<{ customer_id: number }[]>("customers/getByNumber", { company_id, number }).catch(() => []);
  if (byNumber.length) return byNumber[0].customer_id;
  const a = o.shipping_address ?? {};
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ") || a.company || "Consumidor final";
  const r = await moloni<{ customer_id: number }>("customers/insert", {
    company_id,
    vat,
    number,
    name,
    language_id: o.locale === "pt" || o.country === "PT" ? s.language_pt : s.language_en,
    address: [a.address1, a.address2].filter(Boolean).join(", ") || "Desconhecido",
    zip_code: a.postal || (o.country === "PT" ? "0000-000" : "0000"),
    city: a.city || "Desconhecido",
    country_id: await countryId(o.country),
    email: o.email.endsWith(".invalid") ? "" : o.email,
    website: "",
    phone: "",
    fax: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: o.source === "etsy" ? "Cliente Etsy" : "Cliente loja online",
    salesman_id: 0,
    price_class_id: 0,
    maturity_date_id: s.maturity_date_id,
    payment_day: 0,
    discount: 0,
    credit_limit: 0,
    payment_method_id: s.payment_method_id,
    delivery_method_id: 0,
    field_notes: "",
  });
  return r.customer_id;
}

async function ensureProduct(ref: string, name: string, m: MoloniData, taxed: boolean) {
  const company_id = m.company_id!;
  const reference = ref.slice(0, 30);
  const found = await moloni<{ product_id: number }[]>("products/getByReference", { company_id, reference });
  if (found.length) return found[0].product_id;
  const r = await moloni<{ product_id: number }>("products/insert", {
    company_id,
    category_id: m.setup!.category_id,
    type: reference === "PORTES" ? 2 : 1, // 2 = service
    name: name.slice(0, 250),
    summary: "",
    reference,
    ean: "",
    price: 0,
    unit_id: m.setup!.unit_id,
    has_stock: 0,
    stock: 0,
    minimum_stock: 0,
    pos_favorite: 0,
    at_product_category: reference === "PORTES" ? "S" : "M",
    ...(taxed ? { taxes: [{ tax_id: m.setup!.tax23_id, value: 23, order: 1, cumulative: 0 }] } : { exemption_reason: "M05" }),
  });
  return r.product_id;
}

/**
 * Builds the invoice so it matches what the shop actually charged:
 * - PT and EU (no OSS): 23% VAT included in the prices.
 * - Outside the EU: VAT-exempt export (M05), and without any tax a marketplace (Etsy) collected.
 */
export async function createDraftInvoice(o: Order) {
  const m = await getMoloni();
  if (!m.company_id || !m.setup || !m.document_set_id) throw new Error("Moloni isn’t set up.");
  const taxed = EU.has(o.country);
  if (m.options?.oss && taxed && o.country !== "PT") throw new Error(`OSS: encomenda para ${o.country}. Crie esta fatura manualmente com a taxa de IVA do país de destino.`);
  const marketplaceTax = o.source === "etsy" ? o.vat : 0;
  const invoiceTotal = o.total - marketplaceTax;
  const shippingGross = o.shipping + (o.gift_wrap && o.source !== "etsy" ? store.giftWrapPrice : 0);
  const listTotal = o.order_items.reduce((n, i) => n + i.unit_price * i.quantity, 0) || 1;
  // Lines must add up to what was charged. Real coupons show as a discount; anything else
  // (e.g. EU VAT removed from export prices) is reflected in the unit price, not as a fake discount.
  const itemsTarget = Math.max(0, invoiceTotal - shippingGross);
  const coupon = Math.max(0, o.discount_amount);
  const k = (itemsTarget + coupon) / listTotal;
  const discountPct = itemsTarget + coupon > 0 ? Math.max(0, Math.min(100, r6((coupon / (itemsTarget + coupon)) * 100))) : 0;
  const net = (gross: number) => (taxed ? r6(euro(gross) / 1.23) : r6(euro(gross)));
  const lineTax = taxed ? { taxes: [{ tax_id: m.setup.tax23_id, value: 23, order: 1, cumulative: 0 }] } : { exemption_reason: "M05" };

  const products: Record<string, unknown>[] = [];
  for (const it of o.order_items) {
    const ref = (it.sku || `ART-${it.name}`).replace(/[^A-Za-z0-9-]/g, "").slice(0, 30) || "ARTIGO";
    products.push({
      product_id: await ensureProduct(ref, it.name, m, taxed),
      name: [it.name, it.variant_label].filter(Boolean).join(" · ").slice(0, 250),
      qty: it.quantity,
      price: net(it.unit_price * k),
      discount: discountPct,
      order: products.length + 1,
      ...lineTax,
    });
  }
  if (shippingGross > 0) {
    products.push({ product_id: await ensureProduct("PORTES", "Portes de envio", m, taxed), name: "Portes de envio", qty: 1, price: net(shippingGross), discount: 0, order: products.length + 1, ...lineTax });
  }

  const date = (o.shipped_at ?? o.paid_at ?? o.created_at).slice(0, 10);
  const doc = await moloni<{ document_id: number }>("invoiceReceipts/insert", {
    company_id: m.company_id,
    date,
    expiration_date: date,
    document_set_id: m.document_set_id,
    customer_id: await ensureCustomer(o, m),
    your_reference: o.number,
    our_reference: o.number,
    products,
    payments: [{ payment_method_id: m.setup.payment_method_id, date, value: euro(invoiceTotal), notes: o.source === "etsy" ? "Pago via Etsy" : "Pago na loja online" }],
    notes: [
      `Encomenda ${o.number}${o.source === "etsy" ? " (Etsy)" : ""}.`,
      o.tracking_number ? `Enviado por ${o.carrier ?? "transportadora"}, n.º de seguimento ${o.tracking_number}.` : "",
      !taxed ? "Exportação de bens — isento ao abrigo do artigo 14.º do CIVA." : "",
      marketplaceTax ? `Imposto do país de destino (${euro(marketplaceTax).toFixed(2)} €) cobrado e entregue pela Etsy; não incluído nesta fatura.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    status: 0, // draft — finalise in Moloni
  });
  return doc.document_id;
}

/** Creates drafts for orders shipped since the start date (both channels per options), so the tracking number is on the invoice. Never twice per order. */
export async function invoicePendingOrders(limit = 20) {
  const sb = supabaseService();
  const m = await getMoloni();
  if (!m.company_id) return { created: 0, failed: 0, result: "not connected" };
  const channels = [m.options!.channels.web && "web", m.options!.channels.web && "manual", m.options!.channels.etsy && "etsy"].filter(Boolean) as string[];
  const { data: orders } = await sb
    .from("orders")
    .select("id, number, source, status, email, locale, country, nif, shipping_address, subtotal, shipping, gift_wrap, discount_amount, vat, total, created_at, paid_at, shipped_at, carrier, tracking_number, order_items(name, sku, variant_label, unit_price, quantity)")
    .in("status", ["shipped", "delivered"])
    .in("source", channels)
    .eq("test", false)
    .is("invoice_status", null)
    .gte("shipped_at", m.options!.startFrom)
    .order("shipped_at")
    .limit(limit);

  let created = 0;
  let failed = 0;
  for (const o of (orders ?? []) as unknown as Order[]) {
    // Claim the order first so a parallel run can't create a second draft.
    const { data: claimed } = await sb.from("orders").update({ invoice_status: "pending", invoice_attempted_at: new Date().toISOString() }).eq("id", o.id).is("invoice_status", null).select("id");
    if (!claimed?.length) continue;
    try {
      const id = await createDraftInvoice(o);
      await sb.from("orders").update({ invoice_status: "draft", invoice_ref: String(id), invoice_error: null }).eq("id", o.id);
      await sb.from("order_events").insert({ order_id: o.id, kind: "note", body: `Rascunho de fatura-recibo criado no Moloni (id ${id}). Reveja e finalize no Moloni.` });
      created++;
    } catch (e) {
      await sb.from("orders").update({ invoice_status: "error", invoice_error: (e as Error).message.slice(0, 500) }).eq("id", o.id);
      failed++;
    }
  }
  const result = `${created} rascunho${created === 1 ? "" : "s"} criado${created === 1 ? "" : "s"}${failed ? `, ${failed} com erro` : ""}`;
  await saveMoloni({ last_run_at: new Date().toISOString(), last_run_result: result });
  return { created, failed, result };
}

/** Lets the owner retry a failed order (or create one by hand for an older order). */
export async function retryInvoice(orderId: string) {
  const sb = supabaseService();
  const { data: o } = await sb.from("orders").select("invoice_status").eq("id", orderId).single();
  if (o?.invoice_status === "draft" || o?.invoice_status === "issued") throw new Error("This order already has an invoice in Moloni.");
  await sb.from("orders").update({ invoice_status: null, invoice_error: null }).eq("id", orderId);
  const { data: full } = await sb
    .from("orders")
    .select("id, number, source, status, email, locale, country, nif, shipping_address, subtotal, shipping, gift_wrap, discount_amount, vat, total, created_at, paid_at, shipped_at, carrier, tracking_number, order_items(name, sku, variant_label, unit_price, quantity)")
    .eq("id", orderId)
    .single();
  await sb.from("orders").update({ invoice_status: "pending", invoice_attempted_at: new Date().toISOString() }).eq("id", orderId);
  try {
    const id = await createDraftInvoice(full as unknown as Order);
    await sb.from("orders").update({ invoice_status: "draft", invoice_ref: String(id), invoice_error: null }).eq("id", orderId);
    await sb.from("order_events").insert({ order_id: orderId, kind: "note", body: `Rascunho de fatura-recibo criado no Moloni (id ${id}).` });
    return id;
  } catch (e) {
    await sb.from("orders").update({ invoice_status: "error", invoice_error: (e as Error).message.slice(0, 500) }).eq("id", orderId);
    throw e;
  }
}

/** Companies and document series, for the admin dropdowns. */
export async function moloniChoices(companyId?: number) {
  try {
    const companies = await moloni<{ company_id: number; name: string }[]>("companies/getAll");
    const cid = companyId ?? companies[0]?.company_id;
    const sets = cid ? await moloni<{ document_set_id: number; name: string }[]>("documentSets/getAll", { company_id: cid }) : [];
    return { companies: companies.map((c) => ({ id: c.company_id, name: c.name })), sets: sets.map((x) => ({ id: x.document_set_id, name: x.name })) };
  } catch {
    return { companies: [], sets: [] };
  }
}
