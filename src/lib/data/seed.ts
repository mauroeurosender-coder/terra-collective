/**
 * Seed catalogue. Mirrors the Supabase schema (supabase/migrations) so the
 * storefront runs with zero configuration; `npm run db:seed` loads the same
 * data into Supabase.
 */
import type { Collection, JournalPost, Product, ProductOption, Review, Variant } from "../types";

import { swatches } from "../swatches";
export { swatches };

const color = (key: keyof typeof swatches, en: string, pt: string) => ({
  value: key,
  label: { en, pt },
  swatch: swatches[key],
});

const C = {
  blue: color("blue", "Azulejo Blue", "Azul Azulejo"),
  coral: color("coral", "Sardine Coral", "Coral Sardinha"),
  mustard: color("mustard", "Mustard", "Mostarda"),
  olive: color("olive", "Olive", "Azeitona"),
  white: color("white", "Pearl White", "Branco Pérola"),
  rose: color("rose", "Soft Rose", "Rosa Suave"),
  natural: color("natural", "Natural", "Natural"),
};

const colorOption = (...values: (typeof C)[keyof typeof C][]): ProductOption => ({
  name: "color",
  label: { en: "Glaze", pt: "Vidrado" },
  values,
});

/** Cartesian product of option values → variants. */
function build(
  prefix: string,
  options: ProductOption[],
  price: (o: Record<string, string>) => number,
  stock: (o: Record<string, string>) => number = () => 12,
  image: (o: Record<string, string>) => number | undefined = () => undefined,
): Variant[] {
  let combos: Record<string, string>[] = [{}];
  for (const opt of options) {
    combos = combos.flatMap((c) => opt.values.map((v) => ({ ...c, [opt.name]: v.value })));
  }
  return combos.map((o) => {
    const code = Object.values(o).map((v) => v.slice(0, 3).toUpperCase()).join("-");
    return {
      id: `${prefix}-${Object.values(o).join("-") || "default"}`,
      sku: `TC-${prefix.toUpperCase()}${code ? "-" + code : ""}`,
      options: o,
      price: price(o),
      stock: stock(o),
      image: image(o),
    };
  });
}

const colorIdx = (order: string[]) => (o: Record<string, string>) => {
  const i = order.indexOf(o.color);
  return i === -1 ? undefined : i;
};

/* ----------------------------------------------------------------- */

export const collections: Collection[] = [
  {
    slug: "ceramic-sardines",
    name: { en: "Ceramic Sardines", pt: "Sardinhas de Cerâmica" },
    blurb: {
      en: "Glossy, hand-painted sardines for walls, shelves and good luck.",
      pt: "Sardinhas vidradas, pintadas à mão, para paredes, prateleiras e boa sorte.",
    },
    image: "/products/sardine-wall-decor/1.svg",
    accent: "bg-azulejo-tint",
  },
  {
    slug: "tableware",
    name: { en: "Tableware", pt: "Mesa" },
    blurb: {
      en: "Olive dishes, oil bottles and little boxes that make a table sing.",
      pt: "Pratos para azeitonas, galheteiros e caixinhas que alegram a mesa.",
    },
    image: "/products/ceramic-oil-bottle/1.svg",
    accent: "bg-mustard-tint",
  },
  {
    slug: "straw-bags",
    name: { en: "Straw Bags", pt: "Cestos de Palha" },
    blurb: {
      en: "Handwoven in the Alentejo, made for markets and beaches.",
      pt: "Tecidos à mão no Alentejo, para o mercado e para a praia.",
    },
    image: "/products/teresa-mini-straw-bag/1.svg",
    accent: "bg-rose-tint",
  },
  {
    slug: "gifts",
    name: { en: "Gifts", pt: "Presentes" },
    blurb: {
      en: "Small, joyful things from Portugal — easy to wrap, easy to love.",
      pt: "Pequenas alegrias de Portugal — fáceis de embrulhar, fáceis de gostar.",
    },
    image: "/products/tinned-fish-playing-cards/1.svg",
    accent: "bg-olive-tint",
  },
];

const wallCare = {
  en: "Wipe with a soft, dry cloth. Not for outdoor use. Each piece has a pre-drilled keyhole on the back: hang on a single 3–4 mm screw or picture hook, angled slightly upwards. For the Statement size use a wall plug rated for 5 kg.",
  pt: "Limpar com um pano macio e seco. Não usar no exterior. Cada peça tem um furo de fechadura no verso: pendure num parafuso de 3–4 mm ou gancho de quadros, ligeiramente inclinado para cima. Para o tamanho Statement use uma bucha para 5 kg.",
};

const foodCare = {
  en: "Lead-free glaze, food-safe. Dishwasher safe on a gentle cycle; hand-washing keeps the glaze glossy for longer. Not suitable for microwave or oven. Avoid sudden temperature changes.",
  pt: "Vidrado sem chumbo, próprio para alimentos. Pode ir à máquina em programa suave; lavar à mão mantém o brilho por mais tempo. Não adequado para micro-ondas ou forno. Evite mudanças bruscas de temperatura.",
};

const decorCare = {
  en: "Decorative piece. Wipe with a soft, damp cloth. Not for food use.",
  pt: "Peça decorativa. Limpar com um pano macio e húmido. Não usar com alimentos.",
};

const strawCare = {
  en: "Spot clean with a damp cloth and let dry naturally in the shade. Stuff with paper when storing to keep the shape. If it gets squashed, mist lightly with water and reshape.",
  pt: "Limpar pontualmente com um pano húmido e deixar secar à sombra. Guardar com papel no interior para manter a forma. Se amachucar, borrife ligeiramente com água e volte a moldar.",
};

const sardineColors = ["blue", "coral", "mustard", "olive", "white"];
const vesselColors = ["blue", "mustard", "white"];

export const products: Product[] = [
  {
    id: "p01",
    slug: "sardine-wall-decor",
    collection: "ceramic-sardines",
    name: { en: "Ceramic Sardine Wall Décor", pt: "Sardinha de Cerâmica para Parede" },
    short: {
      en: "Our signature sardine, hand-painted and glazed to a mirror shine.",
      pt: "A nossa sardinha de assinatura, pintada à mão com vidrado espelhado.",
    },
    description: {
      en: "The sardine is Lisbon's summer mascot, and ours is dressed for the occasion. Each fish is pressed by hand in fine white stoneware, painted brushstroke by brushstroke, then fired twice for a deep, glassy glaze that catches the light. Hang one alone as a little wink on the wall, or build a shoal across a hallway.",
      pt: "A sardinha é a mascote do verão lisboeta, e a nossa vem a rigor. Cada peixe é prensado à mão em grés branco fino, pintado pincelada a pincelada e cozido duas vezes para um vidrado profundo e brilhante. Pendure uma sozinha, ou crie um cardume ao longo do corredor.",
    },
    details: {
      dimensions: {
        en: "Small 12 × 5 cm · Medium 20 × 8 cm · Large 32 × 12 cm · Statement 60 × 22 cm. Sizes vary by a few millimetres.",
        pt: "Pequena 12 × 5 cm · Média 20 × 8 cm · Grande 32 × 12 cm · Statement 60 × 22 cm. As medidas variam alguns milímetros.",
      },
      materials: {
        en: "Fine white stoneware, lead-free glossy glaze, pre-drilled keyhole hanger.",
        pt: "Grés branco fino, vidrado brilhante sem chumbo, furo de fechadura para pendurar.",
      },
      care: wallCare,
    },
    images: sardineColors.map((c) => `/products/sardine-wall-decor/${c}.svg`).concat("/products/sardine-wall-decor/detail.svg"),
    colors: ["blue", "coral", "mustard", "olive", "white"],
    options: [
      {
        name: "size",
        label: { en: "Size", pt: "Tamanho" },
        values: [
          { value: "small", label: { en: "Small", pt: "Pequena" } },
          { value: "medium", label: { en: "Medium", pt: "Média" } },
          { value: "large", label: { en: "Large", pt: "Grande" } },
          { value: "statement", label: { en: "Statement", pt: "Statement" } },
        ],
      },
      colorOption(C.blue, C.coral, C.mustard, C.olive, C.white),
    ],
    variants: build(
      "swd",
      [
        { name: "size", label: { en: "", pt: "" }, values: ["small", "medium", "large", "statement"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
        { name: "color", label: { en: "", pt: "" }, values: sardineColors.map((v) => ({ value: v, label: { en: v, pt: v } })) },
      ],
      (o) => ({ small: 1900, medium: 4200, large: 8900, statement: 24000 })[o.size]!,
      (o) => (o.size === "statement" ? (o.color === "blue" ? 1 : o.color === "white" ? 0 : 2) : o.color === "olive" && o.size === "large" ? 0 : 9),
      colorIdx(sardineColors),
    ),
    shipping: "standard",
    tags: ["sardine", "wall", "bestseller", "handpainted"],
    createdAt: "2026-03-02",
    bestseller: 1,
    rating: 4.9,
    reviewCount: 212,
    pairsWith: ["sardine-set-of-5", "sardine-ornament"],
    wallPiece: true,
  },
  {
    id: "p02",
    slug: "sardine-set-of-5",
    collection: "ceramic-sardines",
    name: { en: "Set of 5 Handmade Ceramic Sardines", pt: "Conjunto de 5 Sardinhas de Cerâmica" },
    short: {
      en: "A little shoal of five, ready to swim across your wall.",
      pt: "Um pequeno cardume de cinco, pronto a nadar pela sua parede.",
    },
    description: {
      en: "Five medium sardines, each painted with its own pattern: scales, stripes, polka dots, azulejo flowers and a plain gloss. Hung in a diagonal line they look like they're swimming, and people always ask where they're from. Choose a palette and we'll mix the five for you.",
      pt: "Cinco sardinhas médias, cada uma com o seu padrão: escamas, riscas, bolinhas, flores de azulejo e vidrado liso. Penduradas em diagonal parecem nadar, e toda a gente pergunta de onde vieram. Escolha uma paleta e nós combinamos as cinco.",
    },
    details: {
      dimensions: { en: "Each approx. 20 × 8 cm.", pt: "Cada uma aprox. 20 × 8 cm." },
      materials: { en: "Fine white stoneware, lead-free glossy glaze, keyhole hangers.", pt: "Grés branco fino, vidrado brilhante sem chumbo, furos para pendurar." },
      care: wallCare,
    },
    images: ["/products/sardine-set-of-5/1.svg", "/products/sardine-set-of-5/2.svg", "/products/sardine-set-of-5/3.svg"],
    colors: ["blue", "coral", "mustard", "multi"],
    options: [
      {
        name: "color",
        label: { en: "Palette", pt: "Paleta" },
        values: [
          { value: "blue", label: { en: "Classic Blues", pt: "Azuis Clássicos" }, swatch: swatches.blue },
          { value: "coral", label: { en: "Sunset", pt: "Pôr do Sol" }, swatch: "linear-gradient(135deg,#E8704A,#E9B949)" },
          { value: "multi", label: { en: "Festa (mixed)", pt: "Festa (mista)" }, swatch: swatches.multi },
        ],
      },
    ],
    variants: build(
      "s5",
      [{ name: "color", label: { en: "", pt: "" }, values: ["blue", "coral", "multi"].map((v) => ({ value: v, label: { en: v, pt: v } })) }],
      () => 17900,
      (o) => (o.color === "coral" ? 3 : 8),
      (o) => ({ blue: 0, coral: 1, multi: 2 })[o.color],
    ).map((v) => ({ ...v, compareAt: 21000 })),
    shipping: "standard",
    tags: ["sardine", "wall", "set", "gift"],
    createdAt: "2026-05-18",
    bestseller: 2,
    rating: 4.95,
    reviewCount: 88,
    pairsWith: ["sardine-wall-decor", "tinned-fish-playing-cards"],
    wallPiece: true,
  },
  {
    id: "p03",
    slug: "ceramic-oil-bottle",
    collection: "tableware",
    name: { en: "Handmade Ceramic Oil Bottle", pt: "Garrafa de Azeite em Cerâmica" },
    short: {
      en: "A glossy, round-bellied bottle for your best olive oil.",
      pt: "Uma garrafa redonda e brilhante para o seu melhor azeite.",
    },
    description: {
      en: "Thrown on the wheel in Caldas da Rainha and glazed inside and out, this bottle keeps olive oil away from light, which is how it should be kept. The cork stopper has a ceramic top, and a hand-painted sardine swims around the shoulder.",
      pt: "Torneada nas Caldas da Rainha e vidrada por dentro e por fora, esta garrafa protege o azeite da luz, como deve ser. A rolha de cortiça tem topo em cerâmica e uma sardinha pintada à mão nada à volta do ombro.",
    },
    details: {
      dimensions: { en: "Height 22 cm · Ø 10 cm · Capacity approx. 500 ml.", pt: "Altura 22 cm · Ø 10 cm · Capacidade aprox. 500 ml." },
      materials: { en: "Stoneware, lead-free food-safe glaze, natural Portuguese cork.", pt: "Grés, vidrado sem chumbo próprio para alimentos, cortiça portuguesa natural." },
      care: foodCare,
    },
    images: vesselColors.map((c) => `/products/ceramic-oil-bottle/${c}.svg`).concat("/products/ceramic-oil-bottle/detail.svg"),
    colors: ["blue", "mustard", "white"],
    options: [colorOption(C.blue, C.mustard, C.white)],
    variants: build(
      "cob",
      [{ name: "color", label: { en: "", pt: "" }, values: vesselColors.map((v) => ({ value: v, label: { en: v, pt: v } })) }],
      () => 4900,
      (o) => (o.color === "mustard" ? 3 : 14),
      colorIdx(vesselColors),
    ),
    shipping: "standard",
    tags: ["kitchen", "olive oil", "food-safe"],
    createdAt: "2026-04-11",
    bestseller: 3,
    rating: 4.8,
    reviewCount: 64,
    pairsWith: ["olive-appetizer-dishes", "olive-oil-dispenser"],
    foodSafe: true,
  },
  {
    id: "p04",
    slug: "olive-appetizer-dishes",
    collection: "tableware",
    name: { en: "Portuguese Ceramic Olive & Appetizer Dish", pt: "Prato de Cerâmica para Azeitonas e Petiscos" },
    short: {
      en: "The sardine-shaped dish for olives, tremoços and everything in between.",
      pt: "O prato em forma de sardinha para azeitonas, tremoços e tudo o resto.",
    },
    description: {
      en: "A shallow, sardine-shaped dish with a little well for stones. We use ours for olives and lupini beans, but it's just as happy with salt, butter or rings. Buy one, or a set of three for a proper petiscos spread.",
      pt: "Um prato raso em forma de sardinha com uma pequena cova para os caroços. Usamos o nosso para azeitonas e tremoços, mas também serve para sal, manteiga ou anéis. Compre um, ou um conjunto de três para uns petiscos a sério.",
    },
    details: {
      dimensions: { en: "18 × 9 cm · depth 2.5 cm.", pt: "18 × 9 cm · profundidade 2,5 cm." },
      materials: { en: "Stoneware, lead-free food-safe glaze.", pt: "Grés, vidrado sem chumbo próprio para alimentos." },
      care: foodCare,
    },
    images: ["/products/olive-appetizer-dishes/blue.svg", "/products/olive-appetizer-dishes/olive.svg", "/products/olive-appetizer-dishes/set.svg"],
    colors: ["blue", "olive", "multi"],
    options: [
      {
        name: "set",
        label: { en: "Quantity", pt: "Quantidade" },
        values: [
          { value: "1", label: { en: "Single", pt: "Unidade" } },
          { value: "3", label: { en: "Set of 3", pt: "Conjunto de 3" } },
        ],
      },
      colorOption(C.blue, C.olive, { value: "multi", label: { en: "Mixed", pt: "Misto" }, swatch: swatches.multi }),
    ],
    variants: build(
      "oad",
      [
        { name: "set", label: { en: "", pt: "" }, values: ["1", "3"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
        { name: "color", label: { en: "", pt: "" }, values: ["blue", "olive", "multi"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
      ],
      (o) => (o.set === "3" ? 6500 : 2400),
      () => 20,
      (o) => ({ blue: 0, olive: 1, multi: 2 })[o.color],
    ),
    shipping: "standard",
    tags: ["kitchen", "petiscos", "food-safe"],
    createdAt: "2026-06-02",
    bestseller: 4,
    rating: 4.85,
    reviewCount: 41,
    pairsWith: ["ceramic-oil-bottle", "sardine-spoon-rest"],
    foodSafe: true,
  },
  {
    id: "p05",
    slug: "olive-oil-dispenser",
    collection: "tableware",
    name: { en: "Olive Oil Dispenser Bottle", pt: "Galheteiro de Azeite" },
    short: {
      en: "A slim pourer with a drip-free spout for everyday cooking.",
      pt: "Um galheteiro esguio com bico anti-pingo para o dia a dia.",
    },
    description: {
      en: "Tall and slim to sit beside the hob, with a stainless-steel drip-free spout that pours a fine, steady line. The glaze is painted with a single azulejo band, the pattern our grandmothers had in their kitchens.",
      pt: "Alto e esguio para ficar ao lado do fogão, com bico em inox anti-pingo que verte um fio fino e constante. O vidrado tem uma única faixa de azulejo pintada, o padrão das cozinhas das nossas avós.",
    },
    details: {
      dimensions: { en: "Height 26 cm (with spout) · Ø 7 cm · 350 ml.", pt: "Altura 26 cm (com bico) · Ø 7 cm · 350 ml." },
      materials: { en: "Stoneware, lead-free food-safe glaze, stainless-steel pourer.", pt: "Grés, vidrado sem chumbo próprio para alimentos, bico em inox." },
      care: foodCare,
    },
    images: ["/products/olive-oil-dispenser/blue.svg", "/products/olive-oil-dispenser/white.svg"],
    colors: ["blue", "white"],
    options: [colorOption(C.blue, C.white)],
    variants: build(
      "ood",
      [{ name: "color", label: { en: "", pt: "" }, values: ["blue", "white"].map((v) => ({ value: v, label: { en: v, pt: v } })) }],
      () => 3900,
      (o) => (o.color === "white" ? 0 : 11),
      colorIdx(["blue", "white"]),
    ),
    shipping: "standard",
    tags: ["kitchen", "olive oil", "food-safe"],
    createdAt: "2026-08-20",
    bestseller: 0,
    rating: 4.7,
    reviewCount: 12,
    pairsWith: ["ceramic-oil-bottle", "olive-appetizer-dishes"],
    foodSafe: true,
  },
  {
    id: "p06",
    slug: "yellow-trinket-box",
    collection: "tableware",
    name: { en: "Yellow Ceramic Trinket Box", pt: "Caixinha de Cerâmica Amarela" },
    short: {
      en: "A sunny lidded box with a sardine sleeping on top.",
      pt: "Uma caixinha amarela com uma sardinha a dormir na tampa.",
    },
    description: {
      en: "A little tin of sardines, in ceramic. The mustard-yellow base has a painted label, the lid is a sardine glazed in azulejo blue. We keep earrings in ours; it also works well for rings by the sink or for paperclips.",
      pt: "Uma lata de sardinhas, em cerâmica. A base mostarda tem um rótulo pintado e a tampa é uma sardinha em azul azulejo. Guardamos brincos na nossa; também serve para anéis junto ao lava-loiça ou para clipes.",
    },
    details: {
      dimensions: { en: "11 × 7 × 4 cm.", pt: "11 × 7 × 4 cm." },
      materials: { en: "Stoneware, lead-free glossy glaze.", pt: "Grés, vidrado brilhante sem chumbo." },
      care: decorCare,
    },
    images: ["/products/yellow-trinket-box/1.svg", "/products/yellow-trinket-box/2.svg"],
    colors: ["mustard"],
    options: [],
    variants: [{ id: "ytb-default", sku: "TC-YTB", options: {}, price: 2900, stock: 2 }],
    shipping: "small",
    tags: ["gift", "under-25", "trinket"],
    createdAt: "2026-09-10",
    bestseller: 6,
    rating: 5,
    reviewCount: 23,
    pairsWith: ["sardine-ornament", "tinned-fish-playing-cards"],
  },
  {
    id: "p07",
    slug: "teresa-mini-straw-bag",
    collection: "straw-bags",
    name: { en: "Teresa Mini Straw Bag", pt: "Cesto de Palha Teresa Mini" },
    short: {
      en: "A small, sturdy basket bag, handwoven in the Alentejo.",
      pt: "Um cesto pequeno e resistente, tecido à mão no Alentejo.",
    },
    description: {
      en: "Teresa is our small everyday basket: wallet, keys, sunglasses and a bunch of flowers from the market. It's woven by hand from sun-dried palm leaves by a family of weavers near Beja. Choose woven straw handles or soft leather ones made in Porto.",
      pt: "A Teresa é o nosso cesto pequeno para todos os dias: carteira, chaves, óculos de sol e um ramo de flores do mercado. É tecida à mão com folha de palmeira seca ao sol por uma família de artesãs perto de Beja. Escolha asas em palha ou em pele macia feita no Porto.",
    },
    details: {
      dimensions: { en: "28 × 20 × 12 cm · handle drop 14 cm.", pt: "28 × 20 × 12 cm · altura das asas 14 cm." },
      materials: { en: "Palm leaf, cotton lining; leather handles from Porto (optional).", pt: "Folha de palmeira, forro em algodão; asas em pele do Porto (opcional)." },
      care: strawCare,
    },
    images: ["/products/teresa-mini-straw-bag/1.svg", "/products/teresa-mini-straw-bag/2.svg", "/products/teresa-mini-straw-bag/3.svg"],
    colors: ["natural", "blue", "coral"],
    options: [
      {
        name: "color",
        label: { en: "Trim", pt: "Detalhe" },
        values: [
          { value: "natural", label: { en: "Natural", pt: "Natural" }, swatch: swatches.natural },
          { value: "blue", label: { en: "Blue stripe", pt: "Risca azul" }, swatch: swatches.blue },
          { value: "coral", label: { en: "Coral stripe", pt: "Risca coral" }, swatch: swatches.coral },
        ],
      },
      {
        name: "handles",
        label: { en: "Handles", pt: "Asas" },
        values: [
          { value: "straw", label: { en: "Woven straw", pt: "Palha" } },
          { value: "leather", label: { en: "Leather", pt: "Pele" } },
        ],
      },
    ],
    variants: build(
      "tmb",
      [
        { name: "color", label: { en: "", pt: "" }, values: ["natural", "blue", "coral"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
        { name: "handles", label: { en: "", pt: "" }, values: ["straw", "leather"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
      ],
      (o) => (o.handles === "leather" ? 8800 : 6500),
      (o) => (o.color === "coral" && o.handles === "leather" ? 1 : 6),
      (o) => ({ natural: 0, blue: 1, coral: 2 })[o.color],
    ),
    shipping: "textile",
    tags: ["bag", "summer", "handwoven"],
    createdAt: "2026-05-01",
    bestseller: 5,
    rating: 4.9,
    reviewCount: 57,
    pairsWith: ["alice-straw-bag", "tinned-fish-playing-cards"],
  },
  {
    id: "p08",
    slug: "alice-straw-bag",
    collection: "straw-bags",
    name: { en: "Alice Straw Bag", pt: "Cesto de Palha Alice" },
    short: {
      en: "The roomy shoulder basket for beach days and market runs.",
      pt: "O cesto de ombro espaçoso para a praia e para o mercado.",
    },
    description: {
      en: "Alice is the big sister: long handles to wear on the shoulder, a wide base that stands on its own, and room for a towel, a book and a bottle of vinho verde. Same weavers, same palm leaf, same care.",
      pt: "A Alice é a irmã mais velha: asas compridas para usar ao ombro, base larga que fica de pé sozinha e espaço para toalha, livro e uma garrafa de vinho verde. As mesmas artesãs, a mesma palma, o mesmo cuidado.",
    },
    details: {
      dimensions: { en: "Small 38 × 28 × 14 cm · Large 46 × 32 × 16 cm · handle drop 24 cm.", pt: "Pequeno 38 × 28 × 14 cm · Grande 46 × 32 × 16 cm · altura das asas 24 cm." },
      materials: { en: "Palm leaf, cotton lining with inner pocket.", pt: "Folha de palmeira, forro em algodão com bolso interior." },
      care: strawCare,
    },
    images: ["/products/alice-straw-bag/1.svg", "/products/alice-straw-bag/2.svg"],
    colors: ["natural", "blue"],
    options: [
      {
        name: "size",
        label: { en: "Size", pt: "Tamanho" },
        values: [
          { value: "small", label: { en: "Small", pt: "Pequeno" } },
          { value: "large", label: { en: "Large", pt: "Grande" } },
        ],
      },
      {
        name: "color",
        label: { en: "Trim", pt: "Detalhe" },
        values: [
          { value: "natural", label: { en: "Natural", pt: "Natural" }, swatch: swatches.natural },
          { value: "blue", label: { en: "Blue stripe", pt: "Risca azul" }, swatch: swatches.blue },
        ],
      },
    ],
    variants: build(
      "asb",
      [
        { name: "size", label: { en: "", pt: "" }, values: ["small", "large"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
        { name: "color", label: { en: "", pt: "" }, values: ["natural", "blue"].map((v) => ({ value: v, label: { en: v, pt: v } })) },
      ],
      (o) => (o.size === "large" ? 8800 : 6500),
      () => 7,
      (o) => ({ natural: 0, blue: 1 })[o.color],
    ),
    shipping: "textile",
    tags: ["bag", "summer", "handwoven", "beach"],
    createdAt: "2026-04-20",
    bestseller: 7,
    rating: 4.8,
    reviewCount: 36,
    pairsWith: ["teresa-mini-straw-bag"],
  },
  {
    id: "p09",
    slug: "tinned-fish-playing-cards",
    collection: "gifts",
    name: { en: "Retro Tinned Fish Playing Cards", pt: "Cartas de Jogar Conservas Retro" },
    short: {
      en: "A full deck illustrated with vintage Portuguese tin labels.",
      pt: "Um baralho completo ilustrado com rótulos antigos de conservas.",
    },
    description: {
      en: "Fifty-four cards, each face a tribute to the golden age of Portuguese canneries: sardines, mackerel, tuna and octopus in their Sunday best. Printed in Porto on linen-finish card, boxed in a tin-style case. A good stocking filler, and a nice extra in a bigger gift.",
      pt: "Cinquenta e quatro cartas, cada uma uma homenagem à época de ouro das conserveiras portuguesas: sardinhas, cavala, atum e polvo em traje domingueiro. Impressas no Porto em cartão acabamento linho, numa caixa estilo lata. Ótimas para o sapatinho e como extra num presente maior.",
    },
    details: {
      dimensions: { en: "Standard poker size, 63 × 88 mm.", pt: "Tamanho poker padrão, 63 × 88 mm." },
      materials: { en: "310 gsm linen-finish card, printed in Porto.", pt: "Cartão 310 g acabamento linho, impresso no Porto." },
      care: { en: "Keep dry. Shuffle with joy.", pt: "Manter seco. Baralhar com alegria." },
    },
    images: ["/products/tinned-fish-playing-cards/1.svg", "/products/tinned-fish-playing-cards/2.svg"],
    colors: ["multi"],
    options: [],
    variants: [{ id: "tfc-default", sku: "TC-TFC", options: {}, price: 1600, stock: 40 }],
    shipping: "small",
    tags: ["gift", "under-25", "paper"],
    createdAt: "2026-07-14",
    bestseller: 8,
    rating: 4.9,
    reviewCount: 74,
    pairsWith: ["yellow-trinket-box", "sardine-ornament"],
  },
  {
    id: "p10",
    slug: "sardine-ornament",
    collection: "ceramic-sardines",
    name: { en: "Mini Sardine Ornaments", pt: "Mini Sardinhas Decorativas" },
    short: {
      en: "Palm-sized sardines on a cotton loop, for trees, doors and gifts.",
      pt: "Sardinhas do tamanho da palma da mão, com fita de algodão, para árvores, portas e presentes.",
    },
    description: {
      en: "Our smallest sardines, each with a cotton loop. Tie one to a gift, hang a few on a branch or on the Christmas tree. Buy one, three or five; sets come in mixed glazes.",
      pt: "As nossas sardinhas mais pequenas, com fita de algodão. Ate uma a um presente, pendure algumas num ramo ou na árvore de Natal. Compre uma, três ou cinco; os conjuntos vêm em vidrados mistos.",
    },
    details: {
      dimensions: { en: "Each 8 × 3.5 cm.", pt: "Cada 8 × 3,5 cm." },
      materials: { en: "Stoneware, lead-free glossy glaze, cotton cord.", pt: "Grés, vidrado brilhante sem chumbo, fio de algodão." },
      care: decorCare,
    },
    images: ["/products/sardine-ornament/1.svg", "/products/sardine-ornament/2.svg"],
    colors: ["multi"],
    options: [
      {
        name: "set",
        label: { en: "Quantity", pt: "Quantidade" },
        values: [
          { value: "1", label: { en: "1 piece", pt: "1 peça" } },
          { value: "3", label: { en: "Set of 3", pt: "Conjunto de 3" } },
          { value: "5", label: { en: "Set of 5", pt: "Conjunto de 5" } },
        ],
      },
    ],
    variants: build(
      "orn",
      [{ name: "set", label: { en: "", pt: "" }, values: ["1", "3", "5"].map((v) => ({ value: v, label: { en: v, pt: v } })) }],
      (o) => ({ "1": 1200, "3": 3200, "5": 4900 })[o.set]!,
      () => 30,
      (o) => (o.set === "1" ? 0 : 1),
    ),
    shipping: "small",
    tags: ["sardine", "gift", "under-25", "christmas"],
    createdAt: "2026-09-22",
    bestseller: 9,
    rating: 4.8,
    reviewCount: 19,
    pairsWith: ["tinned-fish-playing-cards", "sardine-wall-decor"],
  },
  {
    id: "p11",
    slug: "sardine-spoon-rest",
    collection: "tableware",
    name: { en: "Sardine Spoon Rest", pt: "Descanso de Colher Sardinha" },
    short: {
      en: "Somewhere cheerful to put the wooden spoon down.",
      pt: "Um sítio alegre para pousar a colher de pau.",
    },
    description: {
      en: "A deep, glossy sardine that catches drips beside the stove. It's also nice as a soap dish or a spot for tea bags.",
      pt: "Uma sardinha funda e brilhante que apanha os pingos junto ao fogão. Também serve como saboneteira ou para saquetas de chá.",
    },
    details: {
      dimensions: { en: "20 × 8 cm · depth 2 cm.", pt: "20 × 8 cm · profundidade 2 cm." },
      materials: { en: "Stoneware, lead-free food-safe glaze.", pt: "Grés, vidrado sem chumbo próprio para alimentos." },
      care: foodCare,
    },
    images: ["/products/sardine-spoon-rest/coral.svg", "/products/sardine-spoon-rest/blue.svg"],
    colors: ["coral", "blue"],
    options: [colorOption(C.coral, C.blue)],
    variants: build(
      "ssr",
      [{ name: "color", label: { en: "", pt: "" }, values: ["coral", "blue"].map((v) => ({ value: v, label: { en: v, pt: v } })) }],
      () => 2200,
      () => 15,
      colorIdx(["coral", "blue"]),
    ),
    shipping: "small",
    tags: ["kitchen", "under-25", "food-safe"],
    createdAt: "2026-09-01",
    bestseller: 0,
    rating: 4.7,
    reviewCount: 9,
    pairsWith: ["olive-appetizer-dishes", "ceramic-oil-bottle"],
    foodSafe: true,
  },
  {
    id: "p12",
    slug: "azulejo-coaster-set",
    collection: "gifts",
    name: { en: "Azulejo Tile Coasters, Set of 4", pt: "Bases de Copo Azulejo, Conjunto de 4" },
    short: {
      en: "Four hand-glazed tiles with cork backs, each a different pattern.",
      pt: "Quatro azulejos vidrados à mão com base em cortiça, cada um com um padrão.",
    },
    description: {
      en: "Four real azulejo tiles in four patterns, hand-glazed in cobalt blue on bright white and backed with Portuguese cork so they won't scratch the table. Tied with cotton ribbon and ready to give.",
      pt: "Quatro azulejos verdadeiros com quatro padrões, vidrados à mão em azul cobalto sobre branco e com base em cortiça portuguesa para não riscar a mesa. Atados com fita de algodão, prontos a oferecer.",
    },
    details: {
      dimensions: { en: "Each 10 × 10 cm.", pt: "Cada 10 × 10 cm." },
      materials: { en: "Glazed ceramic tile, natural cork backing.", pt: "Azulejo vidrado, base em cortiça natural." },
      care: { en: "Wipe clean. Hot mugs welcome.", pt: "Limpar com pano. Canecas quentes são bem-vindas." },
    },
    images: ["/products/azulejo-coaster-set/1.svg", "/products/azulejo-coaster-set/2.svg"],
    colors: ["blue"],
    options: [],
    variants: [{ id: "acs-default", sku: "TC-ACS", options: {}, price: 3400, stock: 18 }],
    shipping: "small",
    tags: ["gift", "azulejo", "cork"],
    createdAt: "2026-06-28",
    bestseller: 10,
    rating: 4.85,
    reviewCount: 31,
    pairsWith: ["tinned-fish-playing-cards", "ceramic-oil-bottle"],
  },
  {
    id: "p13",
    slug: "gift-card",
    collection: "gifts",
    name: { en: "Terra Gift Card", pt: "Cartão Oferta Terra" },
    short: { en: "Delivered by email, valid for 2 years.", pt: "Enviado por email, válido por 2 anos." },
    description: { en: "Let them choose. Our digital gift card arrives by email with your message and can be used on anything in the shop.", pt: "Deixe-os escolher. O nosso cartão oferta digital chega por email com a sua mensagem e pode ser usado em qualquer peça da loja." },
    details: {
      dimensions: { en: "Digital.", pt: "Digital." },
      materials: { en: "Valid for 2 years from purchase.", pt: "Válido por 2 anos a partir da compra." },
      care: { en: "—", pt: "—" },
    },
    images: ["/products/gift-card/1.svg"],
    colors: [],
    options: [
      {
        name: "set",
        label: { en: "Amount", pt: "Valor" },
        values: ["25", "50", "100", "150"].map((v) => ({ value: v, label: { en: `€${v}`, pt: `${v} €` } })),
      },
    ],
    variants: ["25", "50", "100", "150"].map((v) => ({ id: `gc-${v}`, sku: `TC-GC-${v}`, options: { set: v }, price: Number(v) * 100, stock: 9999 })),
    shipping: "digital",
    tags: ["gift"],
    createdAt: "2026-01-01",
    bestseller: 0,
    rating: 5,
    reviewCount: 0,
    pairsWith: [],
    hidden: true,
  },
];

/* ----------------------------------------------------------------- */

export const reviews: Review[] = [
  { id: "r1", productSlug: "sardine-wall-decor", author: "Hannah W.", country: "GB", rating: 5, title: "Even prettier in person", body: "The glaze is so glossy it almost looks wet. Arrived beautifully wrapped. I've already ordered two more for the kitchen.", date: "2026-09-12", photo: "/reviews/r1.svg", featured: true, reply: "Thank you Hannah! A shoal of three is the perfect number." },
  { id: "r2", productSlug: "sardine-set-of-5", author: "Marta S.", country: "PT", rating: 5, title: "Lindas!", body: "Comprei o conjunto Festa para a casa de férias e ficou incrível na parede da entrada. Chegou em dois dias.", date: "2026-09-02", photo: "/reviews/r2.svg", featured: true },
  { id: "r3", productSlug: "ceramic-oil-bottle", author: "James K.", country: "US", rating: 5, title: "Beautiful and practical", body: "Keeps the oil dark and looks gorgeous next to the stove. The little sardine on the shoulder is a lovely touch.", date: "2026-08-28", featured: true },
  { id: "r4", productSlug: "teresa-mini-straw-bag", author: "Sophie L.", country: "FR", rating: 5, title: "Parfait pour le marché", body: "Very well made, sturdy, and the leather handles are soft. Gets compliments every weekend.", date: "2026-08-17", photo: "/reviews/r4.svg", featured: true },
  { id: "r5", productSlug: "sardine-wall-decor", author: "Lukas B.", country: "DE", rating: 4, title: "Lovely, slight colour difference", body: "My mustard one is a touch deeper than the photo, but that's handmade for you. Hanging was easy.", date: "2026-08-09" },
  { id: "r6", productSlug: "tinned-fish-playing-cards", author: "Inês R.", country: "PT", rating: 5, title: "Presente perfeito", body: "Ofereci ao meu pai e ele adorou. A caixa é lindíssima.", date: "2026-07-30", featured: true },
  { id: "r7", productSlug: "olive-appetizer-dishes", author: "Clara M.", country: "ES", rating: 5, title: "So cute on the table", body: "Bought the set of three in mixed colours. Everyone at dinner wanted to know where they came from.", date: "2026-07-21", photo: "/reviews/r7.svg" },
  { id: "r8", productSlug: "yellow-trinket-box", author: "Emma T.", country: "IE", rating: 5, title: "Tiny joy", body: "Holds my rings by the sink. The sardine lid makes me smile every morning.", date: "2026-09-18" },
];

/* ----------------------------------------------------------------- */

export const journal: JournalPost[] = [
  {
    slug: "how-a-sardine-is-made",
    title: { en: "How a sardine is made: from clay to glaze", pt: "Como nasce uma sardinha: do barro ao vidrado" },
    excerpt: {
      en: "Two firings, five days and a very steady hand. A morning in the studio with our painters.",
      pt: "Duas cozeduras, cinco dias e uma mão muito firme. Uma manhã no atelier com as nossas pintoras.",
    },
    cover: "/journal/studio.svg",
    category: { en: "Behind the scenes", pt: "Nos bastidores" },
    author: "Terra Collective",
    date: "2026-09-15",
    readingMinutes: 5,
    blocks: [
      { type: "p", text: { en: "Every sardine starts as a slab of fine white stoneware, pressed by hand into a plaster mould we carved ourselves. It dries for two days before its first firing at 980°C, which turns it into bisque: pale, porous and ready for colour.", pt: "Cada sardinha começa como uma placa de grés branco fino, prensada à mão num molde de gesso que nós próprios esculpimos. Seca durante dois dias antes da primeira cozedura a 980°C, que a transforma em chacota: pálida, porosa e pronta para a cor." } },
      { type: "h2", text: { en: "Painting, one brushstroke at a time", pt: "Pintar, uma pincelada de cada vez" } },
      { type: "p", text: { en: "Our painters work freehand. Scales, stripes and azulejo flowers are never traced, so no two fish are the same. A single Statement sardine can take a whole afternoon.", pt: "As nossas pintoras trabalham à mão livre. Escamas, riscas e flores de azulejo nunca são decalcadas, por isso não há dois peixes iguais. Uma sardinha Statement pode levar uma tarde inteira." } },
      { type: "image", src: "/journal/painting.svg", alt: { en: "Hands painting blue scales on a ceramic sardine", pt: "Mãos a pintar escamas azuis numa sardinha de cerâmica" }, caption: { en: "Cobalt scales, painted freehand.", pt: "Escamas em cobalto, pintadas à mão livre." } },
      { type: "quote", text: { en: "If two sardines look identical, one of us wasn't paying attention.", pt: "Se duas sardinhas forem iguais, alguém estava distraído." } },
      { type: "h2", text: { en: "The second firing", pt: "A segunda cozedura" } },
      { type: "p", text: { en: "A clear, lead-free glaze goes on last. At 1,200°C it melts into glass and gives the colours the wet, glossy look people notice first. It's also why we can't promise the exact shade you see on screen: the kiln decides the details.", pt: "Por fim, um vidrado transparente sem chumbo. A 1.200°C derrete em vidro e dá às cores aquele brilho molhado que salta à vista. É também por isso que não prometemos o tom exato do ecrã: os pormenores são do forno." } },
      { type: "products", slugs: ["sardine-wall-decor", "sardine-set-of-5", "sardine-ornament"] },
    ],
  },
  {
    slug: "petiscos-table-guide",
    title: { en: "Setting a petiscos table, the Portuguese way", pt: "Como pôr uma mesa de petiscos" },
    excerpt: {
      en: "Olives, good bread, a bottle of oil and small plates for sharing. Our guide to a slow Portuguese evening.",
      pt: "Azeitonas, pão bom, um fio de azeite e pratinhos para partilhar. O nosso guia para um serão sem pressa.",
    },
    cover: "/journal/table.svg",
    category: { en: "At the table", pt: "À mesa" },
    author: "Terra Collective",
    date: "2026-08-30",
    readingMinutes: 4,
    blocks: [
      { type: "p", text: { en: "Petiscos are Portugal's small plates: a little of everything, eaten slowly with friends. The only rules are to keep portions small and to keep the wine coming.", pt: "Os petiscos são os pratinhos de Portugal: um pouco de tudo, comido devagar com amigos. As únicas regras: porções pequenas e vinho sempre a correr." } },
      { type: "h2", text: { en: "Start with olives and oil", pt: "Comece com azeitonas e azeite" } },
      { type: "p", text: { en: "Put out a dish of garlicky olives, a bowl of tremoços and a good bottle of Alentejo olive oil for the bread. Serve the oil in a bottle you'd be happy to leave on the table.", pt: "Um prato de azeitonas com alho, uma taça de tremoços e uma boa garrafa de azeite alentejano para o pão. Sirva o azeite numa garrafa que tenha gosto em deixar na mesa." } },
      { type: "products", slugs: ["olive-appetizer-dishes", "ceramic-oil-bottle", "olive-oil-dispenser"] },
      { type: "h2", text: { en: "Then the tins", pt: "Depois, as latas" } },
      { type: "p", text: { en: "Open a few tins of good conservas and serve them straight from the tin with lemon, parsley and toast.", pt: "Abra umas boas latas de conservas e sirva-as na própria lata, com limão, salsa e tostas." } },
    ],
  },
  {
    slug: "gift-guide-under-50",
    title: { en: "The Terra gift guide: joyful things under €50", pt: "Guia de presentes Terra: alegrias até 50 €" },
    excerpt: {
      en: "Easy to wrap, easy to post, and very Portuguese. Our favourite small gifts this season.",
      pt: "Fáceis de embrulhar, fáceis de enviar e muito portugueses. Os nossos presentes pequenos favoritos.",
    },
    cover: "/journal/gifts.svg",
    category: { en: "Gift guides", pt: "Guias de presentes" },
    author: "Terra Collective",
    date: "2026-09-24",
    readingMinutes: 3,
    blocks: [
      { type: "p", text: { en: "Everything below ships in our gift box, and you can add a handwritten note at checkout for €4.", pt: "Tudo o que está abaixo segue na nossa caixa de oferta, e pode juntar uma mensagem escrita à mão no checkout por 4 €." } },
      { type: "products", slugs: ["tinned-fish-playing-cards", "yellow-trinket-box", "sardine-ornament", "azulejo-coaster-set"] },
      { type: "h2", text: { en: "For the cook", pt: "Para quem cozinha" } },
      { type: "p", text: { en: "A sardine spoon rest and an oil bottle make a lovely pair. Tie them together with kitchen string.", pt: "Um descanso de colher sardinha e uma garrafa de azeite fazem um par encantador. Ate-os com fio de cozinha." } },
      { type: "products", slugs: ["sardine-spoon-rest", "ceramic-oil-bottle"] },
    ],
  },
];
