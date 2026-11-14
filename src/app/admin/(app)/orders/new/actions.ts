"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseService } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { getCountry } from "@/lib/geo";
import { EU_COUNTRIES, cleanVatNumber } from "@/lib/vat-regime";
import { checkVies } from "@/lib/server/vies";

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
  /** "manual" = market, DM, transfer… · "faire" = B2B wholesale order placed on Faire */
  channel: "manual" | "faire";
  company: string;
  faireOrder: string;
  commissionPct: number;
};

type Result = { ok: true; id: string; number: string } | { ok: false; error: string };

/** Creates an order by hand (market sale, Instagram DM, bank transfer…). Stock is reserved like a checkout order. */
export async function createManualOrder(f: ManualOrderInput): Promise<Result> {
  const session = await requireAdmin();
  const lines = f.lines.filter((l) => l.variantId && l.quantity > 0);
  if (!lines.length) return { ok: false, error: "Add at least one product." };
  const faire = f.channel === "faire";
  if (faire && !f.company.trim()) return { ok: false, error: "Add the retailer’s company name." };
  if (!faire && !f.firstName.trim()) return { ok: false, error: "Add the customer’s first name." };
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
  // B2B to another EU country with a VIES-valid VAT number = intra-EU supply, no Portuguese VAT (art. 14.º RITI).
  // Otherwise: Portugal / EU without a valid number → 23% PT VAT included; outside the EU → export, no VAT.
  const euOther = (EU_COUNTRIES as readonly string[]).includes(f.country) && f.country !== "PT";
  const vatNumber = cleanVatNumber(f.nif, f.country);
  const vies = faire && euOther && vatNumber ? await checkVies(f.country, vatNumber) : null;
  const intraEu = faire && euOther && vies?.valid === true;
  const vatRate = intraEu ? 0 : faire ? (c.zone === "PT" || c.zone === "EU" ? 0.23 : 0) : c.zone === "PT" || c.zone === "EU" ? c.vat : 0;
  const vat = Math.round(total - total / (1 + vatRate));

  const { data, error: e2 } = await sb.rpc("place_order", {
    p: {
      status: f.paid ? "paid" : "pending_payment",
      email,
      locale: f.locale,
      country: f.country,
      address: { country: f.country, firstName: f.firstName.trim(), lastName: f.lastName.trim(), address1: f.address1.trim(), address2: "", postal: f.postal.trim(), city: f.city.trim(), state: "", phone: f.phone.trim(), company: f.company.trim() },
      nif: (faire ? vatNumber : f.nif.trim()) ?? "",
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
      payment_method: faire ? "faire" : f.paymentMethod,
      payment_ref: faire && f.faireOrder.trim() ? `faire-${f.faireOrder.trim()}` : `manual-${session.email}`,
      items,
    },
  });
  if (e2) return { ok: false, error: /out_of_stock/.test(e2.message) ? "Not enough stock for one of the products." : e2.message };
  const order = data as { id: string; number: string };
  const commission = faire ? Math.round(((subtotal - discount) * Math.min(100, Math.max(0, f.commissionPct))) / 100) : null;
  await sb
    .from("orders")
    .update({
      source: faire ? "faire" : "manual",
      ...(faire ? { external_id: f.faireOrder.trim() || null, fees_cost: commission, vies_valid: vies?.valid ?? null } : {}),
      ...(f.test ? { test: true } : {}),
    })
    .eq("id", order.id);
  const how = faire
    ? `Faire order${f.faireOrder.trim() ? ` ${f.faireOrder.trim()}` : ""} entered by ${session.name}. Commission ${f.commissionPct}%.${euOther ? (intraEu ? ` VIES: VAT number valid${vies?.name ? ` (${vies.name})` : ""}, intra-EU supply without VAT.` : vies?.valid === false ? " VIES: VAT number INVALID, Portuguese VAT applied." : vatNumber ? " VIES unavailable now, Portuguese VAT applied: check the number again before invoicing." : " No VAT number, Portuguese VAT applied.") : ""}`
    : `Created manually by ${session.name}`;
  await sb.from("order_events").insert({ order_id: order.id, kind: "note", body: `${how}${f.note.trim() ? ` ${f.note.trim().slice(0, 1000)}` : ""}`, author: session.mode === "live" ? session.userId : null });
  invalidateCatalog();
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, id: order.id, number: order.number };
}

export type ReadOrder = {
  source: "faire" | "other";
  faire_order_number: string;
  retailer_company: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  vat_number: string;
  currency: string;
  shipping: number;
  discount: number;
  /** product/variant: catalogue ids matched by Gemini ("" when nothing in the catalogue fits). */
  lines: { description: string; quantity: number; unit_price: number; product: string; variant: string }[];
};

const orderSchema = {
  type: "OBJECT",
  properties: {
    source: { type: "STRING", enum: ["faire", "other"] },
    faire_order_number: { type: "STRING" },
    retailer_company: { type: "STRING" },
    first_name: { type: "STRING" },
    last_name: { type: "STRING" },
    email: { type: "STRING" },
    phone: { type: "STRING" },
    address: { type: "STRING" },
    postal_code: { type: "STRING" },
    city: { type: "STRING" },
    country: { type: "STRING" },
    vat_number: { type: "STRING" },
    currency: { type: "STRING" },
    shipping: { type: "NUMBER" },
    discount: { type: "NUMBER" },
    lines: { type: "ARRAY", items: { type: "OBJECT", properties: { description: { type: "STRING" }, quantity: { type: "NUMBER" }, unit_price: { type: "NUMBER" }, product_ref: { type: "STRING" }, variant_ref: { type: "STRING" } }, required: ["description", "quantity", "unit_price", "product_ref", "variant_ref"] } },
  },
  required: ["source", "first_name", "last_name", "country", "lines"],
};

const orderPrompt = `This document is an order placed with a small Portuguese ceramics shop (the SELLER): usually a Faire wholesale order (PDF, packing slip, email or screenshot), sometimes another purchase order.
Extract the BUYER and the items exactly as written. Rules:
- source: "faire" if it is a Faire order, else "other". faire_order_number: the Faire order id (e.g. BNXYZ12345), else "".
- retailer_company: the buyer shop or company name (for Faire, the retailer), else "".
- first_name and last_name: the buyer contact person. address, postal_code, city: the SHIPPING address. country: ISO 3166-1 alpha-2 code (e.g. DE, FR, US).
- vat_number: the buyer VAT or tax number if shown, else "".
- lines: one per item: product description as written (include colour, size or variant), quantity, unit price per item WITHOUT VAT (the wholesale price for Faire).
- shipping and discount: amounts charged to the buyer, 0 if not shown. currency: ISO code (EUR, USD...).
- Never invent data: use "" or 0 when something is not in the document.
- product_ref and variant_ref: match each line to the shop CATALOGUE below (refs like P3 and P3.2). Match on what the item IS (e.g. snail, seahorse, sardine, wine stopper), not on shared words like ceramic, handmade or colourful. Pick the variant whose label fits the colour, size or option in the line. If no catalogue product is the same kind of item, use "" for both: never guess.`;

/** Reads an order document (Faire PDF, screenshot, purchase order) with Gemini to pre-fill the new order form. */
export async function readOrderDocument(form: FormData): Promise<{ ok: true; order: ReadOrder } | { ok: false; error: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof Blob) || !file.size) return { ok: false, error: "Choose a file first." };
  const mime = file.type || "application/pdf";
  if (!/^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/.test(mime)) return { ok: false, error: "Upload a PDF or an image (PNG, JPG, WebP)." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "The file is larger than 8 MB." };
  const { geminiConfigured, generateJsonFromFile } = await import("@/lib/server/gemini");
  if (!geminiConfigured()) return { ok: false, error: "Gemini isn’t configured (GEMINI_API_KEY)." };
  try {
    // The catalogue goes in the prompt with short refs, so Gemini can match each line to a product and variant.
    const { data: ps } = await supabaseService().from("products").select("id, name, variants(id, options)").neq("status", "archived").order("created_at");
    const refs = new Map<string, { product: string; variant: string }>();
    const catalogue = ((ps ?? []) as { id: string; name: { en: string }; variants: { id: string; options: Record<string, string> | null }[] }[])
      .map((p, i) => {
        refs.set(`P${i + 1}`, { product: p.id, variant: "" });
        const vs = p.variants.map((v, j) => {
          refs.set(`P${i + 1}.${j + 1}`, { product: p.id, variant: v.id });
          return `P${i + 1}.${j + 1} ${Object.values(v.options ?? {}).join(" / ") || "default"}`;
        });
        return `P${i + 1} ${p.name.en} [${vs.join("; ")}]`;
      })
      .join("\n");
    type Raw = Omit<ReadOrder, "lines"> & { lines: { description: string; quantity: number; unit_price: number; product_ref: string; variant_ref: string }[] };
    const raw = await generateJsonFromFile<Raw>(file, mime, `${orderPrompt}\n\nCATALOGUE:\n${catalogue}`, orderSchema);
    const lines = (raw.lines ?? []).filter((l) => l.description).map(({ product_ref, variant_ref, ...l }) => {
      const p = refs.get(product_ref?.trim() ?? "");
      const v = refs.get(variant_ref?.trim() ?? "");
      return { ...l, product: p?.product ?? "", variant: v && v.product === p?.product ? v.variant : "" };
    });
    return { ok: true, order: { ...raw, lines } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
