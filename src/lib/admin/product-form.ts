import type { L, ProductOption } from "../types";
import type { ShippingProfile } from "../geo";

export type MediaItem = { url: string; kind: "image" | "video"; alt: L };
export type VariantRow = { id?: string; options: Record<string, string>; sku: string; price: number; compareAt: number | null; stock: number; imageIndex: number | null };

/** Everything the product editor edits; money in EUR cents. */
export type ProductForm = {
  id?: string;
  slug: string;
  status: "draft" | "active" | "archived";
  collectionId: string | null;
  name: L;
  short: L;
  description: L;
  details: { dimensions: L; materials: L; care: L };
  media: MediaItem[];
  options: ProductOption[];
  variants: VariantRow[];
  colors: string[];
  tags: string[];
  shipping: ShippingProfile;
  wallPiece: boolean;
  foodSafe: boolean;
  hidden: boolean;
  pairsWith: string[];
  seo: { title: L; description: L };
  bestsellerRank: number;
};

export const emptyL = (): L => ({ en: "", pt: "" });

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const variantKey = (o: Record<string, string>) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));

/** Cartesian product of option values. */
export function combinations(options: ProductOption[]) {
  let combos: Record<string, string>[] = [{}];
  for (const opt of options) {
    if (!opt.values.length) continue;
    combos = combos.flatMap((c) => opt.values.map((v) => ({ ...c, [opt.name]: v.value })));
  }
  return combos;
}

export const emptyProduct = (): ProductForm => ({
  slug: "",
  status: "draft",
  collectionId: null,
  name: emptyL(),
  short: emptyL(),
  description: emptyL(),
  details: { dimensions: emptyL(), materials: emptyL(), care: emptyL() },
  media: [],
  options: [],
  variants: [{ options: {}, sku: "", price: 0, compareAt: null, stock: 0, imageIndex: null }],
  colors: [],
  tags: [],
  shipping: "standard",
  wallPiece: false,
  foodSafe: false,
  hidden: false,
  pairsWith: [],
  seo: { title: emptyL(), description: emptyL() },
  bestsellerRank: 0,
});
