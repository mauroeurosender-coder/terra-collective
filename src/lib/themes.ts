/**
 * Seasonal storefront themes. A theme swaps colour tokens, the announcement
 * bar, the homepage hero copy, a hero stamp and an optional decoration.
 * Products, prices and checkout are unaffected. Activated or scheduled from
 * /admin/content?tab=themes.
 */
import type { L } from "./types";

export type Decoration = "none" | "snow" | "confetti" | "hearts" | "petals";

export type Theme = {
  id: string;
  name: string;
  description: string;
  when: string; // hint shown in the admin
  swatch: string[];
  palette: Record<string, string>; // CSS custom properties (Tailwind colour tokens)
  announcement: L;
  hero: { eyebrow: L; title: L; body: L; cta: L; ctaHref: string };
  stamp: L;
  decoration: Decoration;
  promoHint?: string;
};

const blue = { "--color-azulejo": "#2e5aac", "--color-azulejo-deep": "#234789", "--color-azulejo-tint": "#e6edf8" };

export const themes: Theme[] = [
  {
    id: "default",
    name: "Everyday",
    description: "The standard Terra Collective look.",
    when: "All year",
    swatch: ["#2e5aac", "#e8704a", "#e9b949", "#faf7f2"],
    palette: blue,
    announcement: { en: "", pt: "" },
    hero: { eyebrow: { en: "", pt: "" }, title: { en: "", pt: "" }, body: { en: "", pt: "" }, cta: { en: "", pt: "" }, ctaHref: "/shop" },
    stamp: { en: "", pt: "" },
    decoration: "none",
  },
  {
    id: "christmas",
    name: "Christmas",
    description: "Deep green and berry red, gentle falling snow, gift-led messaging.",
    when: "Mid-November → 24 December",
    swatch: ["#1e6b4f", "#c8323a", "#e9b949", "#faf7f2"],
    palette: { "--color-azulejo": "#1e6b4f", "--color-azulejo-deep": "#154d39", "--color-azulejo-tint": "#e3f0ea", "--color-coral": "#c8323a", "--color-coral-ink": "#9e1f27", "--color-coral-tint": "#f8e1e2" },
    announcement: { en: "Order by 18 December for Christmas delivery · Free gift wrapping", pt: "Encomende até 18 de dezembro para receber antes do Natal · Embrulho oferta grátis" },
    hero: {
      eyebrow: { en: "Christmas gifts, handmade in Portugal", pt: "Presentes de Natal, feitos à mão em Portugal" },
      title: { en: "Gifts glazed with love this Christmas", pt: "Presentes vidrados com carinho este Natal" },
      body: { en: "Sardines for the tree, tableware for the feast and little treasures for every stocking, wrapped by hand and shipped across Europe.", pt: "Sardinhas para a árvore, loiça para a consoada e pequenos tesouros para cada meia, embrulhados à mão e enviados para toda a Europa." },
      cta: { en: "Shop Christmas gifts", pt: "Ver presentes de Natal" },
      ctaHref: "/collections/gifts",
    },
    stamp: { en: "Feliz Natal!", pt: "Feliz Natal!" },
    decoration: "snow",
    promoHint: "Pair with an automatic free-gift-wrap or free-shipping promotion.",
  },
  {
    id: "black-friday",
    name: "Black Friday",
    description: "Bold black and mustard, sale-first messaging. Pair it with an automatic promotion.",
    when: "Last Friday of November → Cyber Monday",
    swatch: ["#1c1c1c", "#e9b949", "#ffffff", "#f5f2ec"],
    palette: { "--color-azulejo": "#1c1c1c", "--color-azulejo-deep": "#000000", "--color-azulejo-tint": "#efece6", "--color-mustard": "#f2c14e", "--color-mustard-tint": "#fcf0cf" },
    announcement: { en: "Black Friday · 20% off everything, this weekend only", pt: "Black Friday · 20% em tudo, só este fim de semana" },
    hero: {
      eyebrow: { en: "Black Friday weekend", pt: "Fim de semana Black Friday" },
      title: { en: "20% off every handmade piece", pt: "20% em todas as peças feitas à mão" },
      body: { en: "Our only sale of the year. Small batches, so when a glaze is gone, it’s gone.", pt: "A nossa única promoção do ano. Pequenas séries: quando um vidrado esgota, esgotou." },
      cta: { en: "Shop the sale", pt: "Ver promoção" },
      ctaHref: "/shop",
    },
    stamp: { en: "−20%", pt: "−20%" },
    decoration: "none",
    promoHint: "Create an automatic 20% promotion in Marketing with the same dates, so the discount matches the banner.",
  },
  {
    id: "easter",
    name: "Easter (Páscoa)",
    description: "Soft lavender and pastels with drifting petals.",
    when: "Two weeks before Easter",
    swatch: ["#5b5fb0", "#e7b8b0", "#e9b949", "#faf7f2"],
    palette: { "--color-azulejo": "#5b5fb0", "--color-azulejo-deep": "#44478f", "--color-azulejo-tint": "#ecebf8" },
    announcement: { en: "Easter table pieces are here · Free shipping in Portugal over €60", pt: "Chegaram as peças para a mesa de Páscoa · Portes grátis em Portugal acima de 60 €" },
    hero: {
      eyebrow: { en: "Easter in Portugal", pt: "Páscoa em Portugal" },
      title: { en: "A springtime table, glazed by hand", pt: "Uma mesa de primavera, vidrada à mão" },
      body: { en: "Pastel plates, olive dishes for the folar and little gifts for the ones you love.", pt: "Pratos em tons pastel, taças de azeitonas para o folar e pequenos presentes para quem gosta." },
      cta: { en: "Shop tableware", pt: "Ver loiça de mesa" },
      ctaHref: "/collections/tableware",
    },
    stamp: { en: "Boa Páscoa!", pt: "Boa Páscoa!" },
    decoration: "petals",
  },
  {
    id: "valentines",
    name: "Valentine’s Day",
    description: "Warm rose red with floating hearts.",
    when: "1 → 14 February",
    swatch: ["#b8325a", "#e7b8b0", "#e9b949", "#faf7f2"],
    palette: { "--color-azulejo": "#b8325a", "--color-azulejo-deep": "#8f2445", "--color-azulejo-tint": "#fbe7ee" },
    announcement: { en: "Valentine’s gifts · Order by 10 February · Free gift note", pt: "Presentes de São Valentim · Encomende até 10 de fevereiro · Postal grátis" },
    hero: {
      eyebrow: { en: "For someone you love", pt: "Para quem gosta" },
      title: { en: "Say it with a sardine", pt: "Diga-o com uma sardinha" },
      body: { en: "In Portugal, a sardine is a love letter. Choose a glaze, add a note, and we’ll wrap it by hand.", pt: "Em Portugal, uma sardinha é uma carta de amor. Escolha o vidrado, junte uma mensagem e nós embrulhamos à mão." },
      cta: { en: "Shop gifts", pt: "Ver presentes" },
      ctaHref: "/collections/gifts",
    },
    stamp: { en: "Com amor", pt: "Com amor" },
    decoration: "hearts",
  },
  {
    id: "mothers-day",
    name: "Mother’s Day (Dia da Mãe)",
    description: "Plum and rose, gift-led. In Portugal it’s the first Sunday of May.",
    when: "Late April → first Sunday of May",
    swatch: ["#8e4a82", "#e7b8b0", "#e9b949", "#faf7f2"],
    palette: { "--color-azulejo": "#8e4a82", "--color-azulejo-deep": "#6c3663", "--color-azulejo-tint": "#f5e8f2" },
    announcement: { en: "Dia da Mãe is on the first Sunday of May · Order early for gift wrapping", pt: "O Dia da Mãe é no primeiro domingo de maio · Encomende cedo para embrulho oferta" },
    hero: {
      eyebrow: { en: "Dia da Mãe", pt: "Dia da Mãe" },
      title: { en: "Something handmade for Mãe", pt: "Algo feito à mão para a Mãe" },
      body: { en: "Glossy tableware, woven bags and little keepsakes, each one made by a maker we know by name.", pt: "Loiça vidrada, cestos tecidos e pequenas recordações, cada uma feita por um artesão que conhecemos pelo nome." },
      cta: { en: "Shop gifts for Mum", pt: "Ver presentes para a Mãe" },
      ctaHref: "/collections/gifts",
    },
    stamp: { en: "Obrigada, Mãe", pt: "Obrigada, Mãe" },
    decoration: "petals",
  },
  {
    id: "santos-populares",
    name: "Santos Populares",
    description: "June sardine season: festival blue with confetti. Very on-brand!",
    when: "1 → 30 June",
    swatch: ["#2e5aac", "#e8704a", "#e9b949", "#6b7f3a"],
    palette: { ...blue, "--color-coral": "#ef6a3f" },
    announcement: { en: "It’s sardine season! Santos Populares favourites are back", pt: "É época de sardinhas! Os favoritos dos Santos Populares estão de volta" },
    hero: {
      eyebrow: { en: "Santos Populares · June in Lisbon", pt: "Santos Populares · junho em Lisboa" },
      title: { en: "Sardine season is here", pt: "Chegou a época da sardinha" },
      body: { en: "Paper garlands, manjericos and grilled sardines on every corner. Bring the festa home with a glazed sardine of your own.", pt: "Arraiais, manjericos e sardinhas assadas em cada esquina. Leve a festa para casa com uma sardinha vidrada." },
      cta: { en: "Shop ceramic sardines", pt: "Ver sardinhas de cerâmica" },
      ctaHref: "/collections/ceramic-sardines",
    },
    stamp: { en: "Viva o Santo António!", pt: "Viva o Santo António!" },
    decoration: "confetti",
  },
  {
    id: "summer-sale",
    name: "Summer sale",
    description: "Sea teal, light and airy. Pair with a percentage promotion.",
    when: "July → August",
    swatch: ["#0f6f7d", "#e9b949", "#e8704a", "#faf7f2"],
    palette: { "--color-azulejo": "#0f6f7d", "--color-azulejo-deep": "#0a525c", "--color-azulejo-tint": "#dff1f3" },
    announcement: { en: "Summer sale · 15% off tableware and bags", pt: "Saldos de verão · 15% em loiça e cestos" },
    hero: {
      eyebrow: { en: "Summer sale", pt: "Saldos de verão" },
      title: { en: "Long lunches, sunny tables", pt: "Almoços longos, mesas ao sol" },
      body: { en: "Everything you need for the terrace, straw bags for the beach and a few last pieces from spring’s glazes.", pt: "Tudo para a esplanada, cestos para a praia e as últimas peças dos vidrados da primavera." },
      cta: { en: "Shop the sale", pt: "Ver saldos" },
      ctaHref: "/shop",
    },
    stamp: { en: "−15%", pt: "−15%" },
    decoration: "none",
    promoHint: "Create an automatic 15% promotion in Marketing for the same dates.",
  },
];

export type ThemeSettings = {
  active: string;
  schedule: { id: string; start: string; end: string }[]; // ISO dates (inclusive)
  custom: Record<string, { announcement?: L; hero?: Partial<Theme["hero"]>; stamp?: L }>;
};

export const defaultThemeSettings = (): ThemeSettings => ({ active: "default", schedule: [], custom: {} });

/** Scheduled theme for today wins; otherwise the manually active one. Admin edits are merged over the preset. */
export function resolveTheme(s: ThemeSettings | undefined, preview?: string | null, now = new Date()): Theme {
  const today = now.toISOString().slice(0, 10);
  const scheduled = s?.schedule?.find((x) => x.start <= today && today <= x.end)?.id;
  const id = (preview && themes.some((t) => t.id === preview) && preview) || scheduled || s?.active || "default";
  const base = themes.find((t) => t.id === id) ?? themes[0];
  const c = s?.custom?.[base.id];
  if (!c) return base;
  const nonEmpty = (l?: L) => (l && (l.en || l.pt) ? l : undefined);
  return {
    ...base,
    announcement: nonEmpty(c.announcement) ?? base.announcement,
    stamp: nonEmpty(c.stamp) ?? base.stamp,
    hero: {
      eyebrow: nonEmpty(c.hero?.eyebrow) ?? base.hero.eyebrow,
      title: nonEmpty(c.hero?.title) ?? base.hero.title,
      body: nonEmpty(c.hero?.body) ?? base.hero.body,
      cta: nonEmpty(c.hero?.cta) ?? base.hero.cta,
      ctaHref: c.hero?.ctaHref || base.hero.ctaHref,
    },
  };
}
