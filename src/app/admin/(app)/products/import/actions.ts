"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateCatalog } from "@/lib/data/source";
import { parseCsv, toObjects } from "@/lib/admin/csv";
import { combinations, slugify } from "@/lib/admin/product-form";
import type { ProductOption } from "@/lib/types";

export type ImportResult = { ok: boolean; format?: "etsy" | "terra"; created: number; updated: number; skipped: string[]; warnings: string[]; error?: string };

const money = (s: string) => Math.round(parseFloat((s || "0").replace(",", ".")) * 100) || 0;

function optionName(etsyName: string, taken: Set<string>): ProductOption["name"] {
  const n = etsyName.toLowerCase();
  const guess: ProductOption["name"] = /size|tamanho|dimens/.test(n) ? "size" : /colou?r|glaze|cor|finish/.test(n) ? "color" : /handle|asa/.test(n) ? "handles" : "set";
  if (!taken.has(guess)) return guess;
  return (["set", "handles", "size", "color"] as const).find((x) => !taken.has(x))!;
}

export async function importCsv(text: string): Promise<ImportResult> {
  await requireAdmin();
  const res: ImportResult = { ok: true, created: 0, updated: 0, skipped: [], warnings: [] };
  const rows = toObjects(parseCsv(text));
  if (!rows.length) return { ...res, ok: false, error: "The file is empty." };
  const sb = await supabaseServer();
  const headers = Object.keys(rows[0]);

  // Our own export: bulk-update price / compare-at / stock by SKU.
  if (headers.includes("sku") && headers.includes("price_eur")) {
    res.format = "terra";
    for (const r of rows) {
      if (!r.sku) continue;
      const patch: Record<string, number | null> = {};
      if (r.price_eur !== "") patch.price = money(r.price_eur);
      patch.compare_at = r.compare_at_eur ? money(r.compare_at_eur) : null;
      if (r.stock !== "") patch.stock = Math.max(0, parseInt(r.stock, 10) || 0);
      const { data, error } = await sb.from("variants").update(patch).eq("sku", r.sku).select("id");
      if (error || !data?.length) res.skipped.push(`${r.sku}: ${error?.message ?? "SKU not found"}`);
      else res.updated++;
    }
  } else if (headers.includes("TITLE") && headers.includes("PRICE")) {
    // Etsy "Download data → Listings" CSV. Creates DRAFT products so you can review before publishing.
    res.format = "etsy";
    for (const r of rows) {
      const title = r.TITLE?.trim();
      if (!title) continue;
      if (r.CURRENCY_CODE && r.CURRENCY_CODE !== "EUR") res.warnings.push(`“${title}” was priced in ${r.CURRENCY_CODE}; prices were imported as-is in EUR. Please check them.`);
      const taken = new Set<string>();
      const options: ProductOption[] = [];
      for (const n of [1, 2]) {
        const name = r[`VARIATION ${n} NAME`] || r[`VARIATION ${n} TYPE`];
        const values = (r[`VARIATION ${n} VALUES`] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
        if (!name || !values.length) continue;
        const key = optionName(name, taken);
        taken.add(key);
        options.push({ name: key, label: { en: name, pt: name }, values: values.map((v) => ({ value: slugify(v) || v, label: { en: v, pt: v } })) });
      }
      let slug = slugify(title).slice(0, 60);
      const { data: clash } = await sb.from("products").select("id").eq("slug", slug).maybeSingle();
      if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      const description = (r.DESCRIPTION ?? "").replace(/\r/g, "");
      const { data: p, error } = await sb
        .from("products")
        .insert({
          slug,
          status: "draft",
          name: { en: title, pt: title },
          short: { en: description.split(/(?<=[.!?])\s/)[0]?.slice(0, 160) ?? "", pt: "" },
          description: { en: description, pt: "" },
          details: { materials: { en: r.MATERIALS ?? "", pt: "" } },
          options,
          tags: (r.TAGS ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
          etsy_listing_id: r.LISTING_ID || null,
        })
        .select("id")
        .single();
      if (error || !p) {
        res.skipped.push(`${title}: ${error?.message ?? "failed"}`);
        continue;
      }
      const images = Array.from({ length: 10 }, (_, i) => r[`IMAGE${i + 1}`]).filter((u) => u && /^https:\/\//.test(u));
      if (images.length) await sb.from("product_media").insert(images.map((url, i) => ({ product_id: p.id, url, kind: "image", position: i })));
      const qty = Math.max(0, parseInt(r.QUANTITY, 10) || 0);
      const base = (r.SKU || `TC-${slug.slice(0, 8).toUpperCase()}`).replace(/\s+/g, "-");
      const combos = combinations(options);
      const { error: ve } = await sb.from("variants").insert(
        combos.map((o, i) => ({
          id: `${slug.slice(0, 24)}-${Object.values(o).join("-") || "default"}-${Math.random().toString(36).slice(2, 5)}`,
          product_id: p.id,
          sku: combos.length > 1 ? `${base}-${Object.values(o).map((v) => v.slice(0, 3).toUpperCase()).join("-")}` : base,
          options: o,
          price: money(r.PRICE),
          stock: qty,
          position: i,
        })),
      );
      if (ve) res.warnings.push(`“${title}”: variants not created (${ve.message}).`);
      if (combos.length > 1 && qty) res.warnings.push(`“${title}”: Etsy only exports one quantity (${qty}); it was set on every variant. Adjust per variant.`);
      res.created++;
    }
  } else {
    return { ...res, ok: false, error: "Unrecognised file. Use Etsy’s listings CSV (Shop Manager → Settings → Options → Download data) or a CSV exported from here." };
  }
  invalidateCatalog();
  revalidatePath("/admin/products");
  return res;
}
