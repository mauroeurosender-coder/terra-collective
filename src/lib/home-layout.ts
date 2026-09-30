/**
 * Editable homepage: an ordered list of sections, saved in settings.home_layout.
 * Built-in sections keep their design and expose their texts; custom sections
 * (text, image + text, products, quote, banner) can be added any number of times.
 */
import type { L } from "./types";
import type { Step } from "./data/home-story";
import { imperfect, places, process, ribbon } from "./data/home-story.ts";

export type Button = { label: L; href: string };
export type Pin = { id: string; name: string; lon: number; lat: number; craft: L; note: L };

type Base = { id: string; enabled: boolean };
export type HomeSection = Base &
  (
    | { type: "hero" }
    | { type: "ribbon"; items: L[] }
    | { type: "collections"; title: L }
    | { type: "process"; eyebrow: L; title: L; intro: L; outro: L; steps: Step[]; showStats: boolean }
    | { type: "bestsellers"; title: L; sub: L; count: number }
    | { type: "imperfect"; eyebrow: L; title: L; body: L; cta: Button; notes: L[]; images: string[] }
    | { type: "gifts"; title: L }
    | { type: "places"; eyebrow: L; title: L; body: L; pins: Pin[] }
    | { type: "reviews"; title: L; showInstagram: boolean }
    | { type: "journal"; title: L }
    | { type: "newsletter"; title: L; body: L }
    | { type: "text"; eyebrow: L; title: L; body: L; button: Button; align: "left" | "center"; background: Background }
    | { type: "image-text"; eyebrow: L; title: L; body: L; button: Button; image: string; imageSide: "left" | "right"; background: Background }
    | { type: "products"; title: L; sub: L; slugs: string[] }
    | { type: "quote"; text: L; author: string; background: Background }
    | { type: "banner"; title: L; body: L; button: Button; image: string }
  );
export type SectionType = HomeSection["type"];
export type Background = "cream" | "paper" | "tint" | "blue";

const E = (): L => ({ en: "", pt: "" });
const noButton = (): Button => ({ label: E(), href: "" });
const uid = () => Math.random().toString(36).slice(2, 9);

/** Every section type: label, description, whether it can be added more than once, and its fields for the editor. */
export type FieldKind = "l" | "lm" | "text" | "href" | "image" | "images" | "llist" | "steps" | "pins" | "products" | "number" | "bool" | "select" | "button";
export type Field = { key: string; label: string; kind: FieldKind; hint?: string; options?: [string, string][] };

const bg: Field = { key: "background", label: "Background", kind: "select", options: [["cream", "Cream"], ["paper", "White"], ["tint", "Soft colour"], ["blue", "Brand colour"]] };

export const sectionTypes: Record<SectionType, { label: string; description: string; repeatable: boolean; fields: Field[]; make: () => HomeSection }> = {
  hero: { label: "Hero", description: "Big headline and photo at the top. Edit its text and photo in the Homepage hero panel below.", repeatable: false, fields: [], make: () => ({ id: "hero", enabled: true, type: "hero" }) },
  ribbon: {
    label: "Scrolling ribbon",
    description: "A moving band of short handwritten phrases.",
    repeatable: true,
    fields: [{ key: "items", label: "Phrases", kind: "llist" }],
    make: () => ({ id: `ribbon-${uid()}`, enabled: true, type: "ribbon", items: ribbon }),
  },
  collections: {
    label: "Collections",
    description: "Tiles for your featured collections (choose which in the Collections tab).",
    repeatable: false,
    fields: [{ key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" }],
    make: () => ({ id: "collections", enabled: true, type: "collections", title: E() }),
  },
  process: {
    label: "How it’s made",
    description: "The making process as illustrated steps.",
    repeatable: false,
    fields: [
      { key: "eyebrow", label: "Small heading", kind: "l" },
      { key: "title", label: "Title", kind: "l" },
      { key: "intro", label: "Introduction", kind: "lm" },
      { key: "steps", label: "Steps", kind: "steps" },
      { key: "outro", label: "Closing line (handwritten)", kind: "l" },
      { key: "showStats", label: "Show the three numbers and “Read our story” button", kind: "bool" },
    ],
    make: () => ({ id: "process", enabled: true, type: "process", ...process, showStats: true }),
  },
  bestsellers: {
    label: "Bestsellers",
    description: "A carousel of your best-selling products.",
    repeatable: false,
    fields: [
      { key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" },
      { key: "sub", label: "Subtitle", kind: "l" },
      { key: "count", label: "How many products", kind: "number" },
    ],
    make: () => ({ id: "bestsellers", enabled: true, type: "bestsellers", title: E(), sub: E(), count: 8 }),
  },
  imperfect: {
    label: "Imperfect by design",
    description: "Three photos side by side with handwritten notes.",
    repeatable: false,
    fields: [
      { key: "eyebrow", label: "Small heading", kind: "l" },
      { key: "title", label: "Title", kind: "l" },
      { key: "body", label: "Text", kind: "lm" },
      { key: "cta", label: "Button", kind: "button" },
      { key: "images", label: "Three photos", kind: "images" },
      { key: "notes", label: "Handwritten notes (one per photo)", kind: "llist" },
    ],
    make: () => ({
      id: "imperfect",
      enabled: true,
      type: "imperfect",
      eyebrow: imperfect.eyebrow,
      title: imperfect.title,
      body: imperfect.body,
      cta: { label: imperfect.cta, href: "/collections/ceramic-sardines" },
      notes: imperfect.notes,
      images: ["blue", "coral", "mustard"].map((c) => `/products/sardine-wall-decor/${c}.svg`),
    }),
  },
  gifts: {
    label: "Gifts by budget",
    description: "Three tiles: under €25, under €50, statement pieces.",
    repeatable: false,
    fields: [{ key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" }],
    make: () => ({ id: "gifts", enabled: true, type: "gifts", title: E() }),
  },
  places: {
    label: "Map of Portugal",
    description: "Hand-drawn map with clickable places.",
    repeatable: false,
    fields: [
      { key: "eyebrow", label: "Small heading", kind: "l" },
      { key: "title", label: "Title", kind: "l" },
      { key: "body", label: "Text", kind: "lm" },
      { key: "pins", label: "Places on the map", kind: "pins" },
    ],
    make: () => ({ id: "places", enabled: true, type: "places", ...places }),
  },
  reviews: {
    label: "Reviews (postcards)",
    description: "Featured reviews as postcards, optionally with the Instagram grid.",
    repeatable: false,
    fields: [
      { key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" },
      { key: "showInstagram", label: "Show the Instagram grid", kind: "bool" },
    ],
    make: () => ({ id: "reviews", enabled: true, type: "reviews", title: E(), showInstagram: true }),
  },
  journal: {
    label: "Journal",
    description: "Your three latest journal posts.",
    repeatable: false,
    fields: [{ key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" }],
    make: () => ({ id: "journal", enabled: true, type: "journal", title: E() }),
  },
  newsletter: {
    label: "Newsletter sign-up",
    description: "Email sign-up with the welcome discount.",
    repeatable: false,
    fields: [
      { key: "title", label: "Title", kind: "l", hint: "Leave empty for the default" },
      { key: "body", label: "Text", kind: "l", hint: "Leave empty for the default" },
    ],
    make: () => ({ id: "newsletter", enabled: true, type: "newsletter", title: E(), body: E() }),
  },
  text: {
    label: "Text block",
    description: "A heading, a paragraph and an optional button.",
    repeatable: true,
    fields: [
      { key: "eyebrow", label: "Small heading", kind: "l" },
      { key: "title", label: "Title", kind: "l" },
      { key: "body", label: "Text", kind: "lm" },
      { key: "button", label: "Button (optional)", kind: "button" },
      { key: "align", label: "Alignment", kind: "select", options: [["center", "Centred"], ["left", "Left"]] },
      bg,
    ],
    make: () => ({ id: `text-${uid()}`, enabled: true, type: "text", eyebrow: E(), title: { en: "A new section", pt: "Uma nova secção" }, body: E(), button: noButton(), align: "center", background: "cream" }),
  },
  "image-text": {
    label: "Image + text",
    description: "A photo beside a heading, text and button.",
    repeatable: true,
    fields: [
      { key: "image", label: "Photo", kind: "image" },
      { key: "imageSide", label: "Photo on the", kind: "select", options: [["left", "Left"], ["right", "Right"]] },
      { key: "eyebrow", label: "Small heading", kind: "l" },
      { key: "title", label: "Title", kind: "l" },
      { key: "body", label: "Text", kind: "lm" },
      { key: "button", label: "Button (optional)", kind: "button" },
      bg,
    ],
    make: () => ({ id: `imagetext-${uid()}`, enabled: true, type: "image-text", image: "/lifestyle/studio-portrait.svg", imageSide: "left", eyebrow: E(), title: { en: "A new story", pt: "Uma nova história" }, body: E(), button: noButton(), background: "cream" }),
  },
  products: {
    label: "Hand-picked products",
    description: "A row of products you choose.",
    repeatable: true,
    fields: [
      { key: "title", label: "Title", kind: "l" },
      { key: "sub", label: "Subtitle", kind: "l" },
      { key: "slugs", label: "Products", kind: "products" },
    ],
    make: () => ({ id: `products-${uid()}`, enabled: true, type: "products", title: { en: "Our favourites", pt: "Os nossos favoritos" }, sub: E(), slugs: [] }),
  },
  quote: {
    label: "Big quote",
    description: "A large handwritten quote, e.g. from a maker or a customer.",
    repeatable: true,
    fields: [
      { key: "text", label: "Quote", kind: "lm" },
      { key: "author", label: "Who said it", kind: "text" },
      bg,
    ],
    make: () => ({ id: `quote-${uid()}`, enabled: true, type: "quote", text: { en: "Every sardine has its own little personality.", pt: "Cada sardinha tem a sua própria personalidade." }, author: "", background: "tint" }),
  },
  banner: {
    label: "Colour banner",
    description: "A bold banner in your brand colour with a button, e.g. for a launch or sale.",
    repeatable: true,
    fields: [
      { key: "title", label: "Title", kind: "l" },
      { key: "body", label: "Text", kind: "l" },
      { key: "button", label: "Button", kind: "button" },
      { key: "image", label: "Image (optional)", kind: "image" },
    ],
    make: () => ({ id: `banner-${uid()}`, enabled: true, type: "banner", title: { en: "New glazes are here", pt: "Chegaram novos vidrados" }, body: E(), button: { label: { en: "Shop now", pt: "Ver agora" }, href: "/shop" }, image: "" }),
  },
};

export const defaultHomeLayout = (): HomeSection[] =>
  (["hero", "ribbon", "collections", "process", "bestsellers", "imperfect", "gifts", "places", "reviews", "journal", "newsletter"] as SectionType[]).map((t) => {
    const s = sectionTypes[t].make();
    return { ...s, id: t };
  });

/** Towns for map pins (so nobody has to type coordinates). */
export const towns: { name: string; lon: number; lat: number }[] = [
  { name: "Viana do Castelo", lon: -8.83, lat: 41.69 },
  { name: "Braga", lon: -8.43, lat: 41.55 },
  { name: "Guimarães", lon: -8.3, lat: 41.44 },
  { name: "Porto", lon: -8.61, lat: 41.15 },
  { name: "Aveiro", lon: -8.65, lat: 40.64 },
  { name: "Viseu", lon: -7.91, lat: 40.66 },
  { name: "Coimbra", lon: -8.43, lat: 40.21 },
  { name: "Leiria", lon: -8.81, lat: 39.74 },
  { name: "Alcobaça", lon: -8.98, lat: 39.55 },
  { name: "Caldas da Rainha", lon: -9.14, lat: 39.4 },
  { name: "Óbidos", lon: -9.16, lat: 39.36 },
  { name: "Sintra", lon: -9.39, lat: 38.8 },
  { name: "Lisboa", lon: -9.14, lat: 38.72 },
  { name: "Setúbal", lon: -8.89, lat: 38.52 },
  { name: "Évora", lon: -7.91, lat: 38.57 },
  { name: "Alentejo", lon: -7.91, lat: 38.57 },
  { name: "Redondo", lon: -7.55, lat: 38.65 },
  { name: "Estremoz", lon: -7.59, lat: 38.84 },
  { name: "Beja", lon: -7.86, lat: 38.02 },
  { name: "Faro", lon: -7.93, lat: 37.02 },
  { name: "Tavira", lon: -7.65, lat: 37.13 },
  { name: "Lagos", lon: -8.67, lat: 37.1 },
];

/** Accepts saved layouts from older versions: unknown types are dropped, missing fields fall back to defaults. */
export function normalizeLayout(saved: unknown): HomeSection[] {
  if (!Array.isArray(saved) || !saved.length) return defaultHomeLayout();
  return saved
    .filter((s) => s && typeof s === "object" && (s as { type: string }).type in sectionTypes)
    .map((s) => {
      const x = s as HomeSection;
      return { ...sectionTypes[x.type].make(), ...x } as HomeSection;
    });
}
