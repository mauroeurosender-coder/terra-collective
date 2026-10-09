/**
 * Rules and schema for generating website-friendly product names + SEO fields
 * from long Etsy titles. Plain module (no imports) so scripts can use it too.
 */

export type SeoInput = { id: string; etsyTitle: string; collection: string; tags: string[]; options: string[]; description: string };
export type SeoProposal = {
  name_en: string;
  name_pt: string;
  seo_title_en: string;
  seo_title_pt: string;
  meta_en: string;
  meta_pt: string;
  slug: string;
  generated_at?: string;
};

export const SEO_RULES = `You write product names and SEO fields for "Terra Collective", an online shop of handmade Portuguese goods (glossy glazed ceramics, sardines, tableware, straw bags, gifts).
The products were imported from Etsy with long keyword-stuffed titles. For each product write:

name_en: the product name shown on the website. 3–6 words, max 45 characters, Title Case. Natural grammar: keep "&" / "and" and prepositions (e.g. "Stoneware Salt & Pepper Shakers", not "Salt Pepper Shakers Set"). What it is + the one detail that makes it different (colour, shape, set size, motif, named model like "Teresa" or "Justina"). No commas, no colons, no marketing words (unique, perfect, gift, decor, aesthetic, boho), and do NOT add "Handmade" or "Portuguese" unless it is part of what the product is (e.g. "Portuguese Tile Coasters"). If the product comes in several colours (see options), don't put one colour in the name.
name_pt: the same name in natural, grammatical European Portuguese (pt-PT, not Brazilian; current spelling, e.g. "joias"; "saco"/"cesto", never "sacola"), with prepositions ("de", "em", "e"), e.g. "Saleiro e Pimenteiro em Grés", "Sardinha de Cerâmica Azul e Laranja", "Galheteiro de Vidro Verde", "Cesto de Palha Teresa".
seo_title_en: max 60 characters for Google. The name plus the strongest search phrase, e.g. "Blue & Orange Ceramic Sardine, Handmade in Portugal".
seo_title_pt: the same in European Portuguese, max 60 characters, e.g. "Sardinha de Cerâmica Azul e Laranja, Feita à Mão".
meta_en: 120–155 characters, a natural factual sentence that starts with the product itself (not "Discover…" or "Elevate…") with the main search terms (handmade, Portuguese, material, use, gift idea if it fits). No keyword lists.
meta_pt: the same in European Portuguese, 120–155 characters.
slug: from name_en, lowercase, words joined by hyphens, max 50 characters, only a-z 0-9 and hyphens.

Every product must get a DIFFERENT name and slug — when two products are similar, use the distinguishing detail. Keep facts true to the title/description; never invent materials or sizes.`;

export const SEO_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          name_en: { type: "STRING" },
          name_pt: { type: "STRING" },
          seo_title_en: { type: "STRING" },
          seo_title_pt: { type: "STRING" },
          meta_en: { type: "STRING" },
          meta_pt: { type: "STRING" },
          slug: { type: "STRING" },
        },
        required: ["id", "name_en", "name_pt", "seo_title_en", "seo_title_pt", "meta_en", "meta_pt", "slug"],
      },
    },
  },
  required: ["items"],
};

export function seoPrompt(batch: SeoInput[], takenNames: string[]) {
  return `${SEO_RULES}

Names already used on the site (don't reuse): ${takenNames.slice(0, 200).join(" | ") || "none"}

Products (JSON):
${JSON.stringify(batch.map((p, i) => ({ id: `p${i + 1}`, etsy_title: p.etsyTitle, collection: p.collection, tags: p.tags.slice(0, 13), options: p.options.slice(0, 12), description: p.description.slice(0, 500) })))}

Return {"items":[...]} with one entry per product, copying each "id" exactly.`;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50).replace(/-$/, "");

/** Trims to limits and makes slugs unique against the given set (which it updates). */
export function cleanProposal(p: SeoProposal, usedSlugs: Set<string>): SeoProposal {
  const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, ""));
  let slug = slugify(p.slug || p.name_en) || "product";
  let k = 2;
  while (usedSlugs.has(slug)) slug = `${slugify(p.slug || p.name_en).slice(0, 46)}-${k++}`;
  usedSlugs.add(slug);
  return {
    name_en: cut(p.name_en.trim(), 60),
    name_pt: cut(p.name_pt.trim(), 70),
    seo_title_en: cut(p.seo_title_en.trim(), 65),
    seo_title_pt: cut(p.seo_title_pt.trim(), 65),
    meta_en: cut(p.meta_en.trim(), 160),
    meta_pt: cut(p.meta_pt.trim(), 160),
    slug,
    generated_at: new Date().toISOString(),
  };
}
