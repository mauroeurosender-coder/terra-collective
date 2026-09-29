import type { Locale } from "./config";
import type { ShippingProfile } from "./geo";

export type L = Record<Locale, string>;

export type CollectionSlug = "ceramic-sardines" | "tableware" | "straw-bags" | "gifts";

export type Collection = {
  slug: CollectionSlug;
  name: L;
  blurb: L;
  image: string;
  accent: string; // tailwind bg class used for tiles
  featured?: boolean;
};

export type ColorKey = "blue" | "coral" | "mustard" | "olive" | "white" | "rose" | "natural" | "multi";

export type ProductOption = {
  name: "size" | "color" | "set" | "handles";
  label: L;
  values: { value: string; label: L; swatch?: string }[];
};

export type Variant = {
  id: string;
  sku: string;
  options: Partial<Record<ProductOption["name"], string>>;
  price: number; // EUR cents, PT VAT inclusive
  compareAt?: number;
  stock: number;
  image?: number; // index into product.images
};

export type Product = {
  id: string;
  slug: string;
  collection: CollectionSlug;
  name: L;
  short: L;
  description: L;
  details: { dimensions: L; materials: L; care: L };
  images: string[];
  video?: string;
  colors: ColorKey[];
  options: ProductOption[];
  variants: Variant[];
  shipping: ShippingProfile;
  tags: string[];
  createdAt: string;
  bestseller: number; // lower = better selling; 0 = not ranked
  rating: number;
  reviewCount: number;
  pairsWith: string[];
  wallPiece?: boolean;
  foodSafe?: boolean;
  /** Not listed in collections/search (e.g. gift cards). */
  hidden?: boolean;
};

export type Review = {
  id: string;
  productSlug: string;
  author: string;
  country: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  photo?: string;
  featured?: boolean;
  reply?: string;
  verified?: boolean;
};

export type JournalBlock =
  | { type: "p"; text: L }
  | { type: "h2"; text: L }
  | { type: "quote"; text: L }
  | { type: "image"; src: string; alt: L; caption?: L }
  | { type: "products"; slugs: string[] }
  | { type: "gallery"; images: string[]; caption?: L }
  | { type: "video"; url: string; caption?: L };

export type JournalPost = {
  slug: string;
  title: L;
  excerpt: L;
  cover: string;
  category: L;
  author: string;
  date: string;
  readingMinutes: number;
  blocks: JournalBlock[];
};
