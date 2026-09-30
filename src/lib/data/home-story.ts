/**
 * Homepage storytelling copy (EN/PT). Places and process are generic to
 * Portuguese ceramics; replace with your own makers' details when ready.
 */
import type { L } from "../types";

export type Step = { n: string; word: string; title: L; body: L; icon: "clay" | "dry" | "kiln" | "brush" | "glaze" | "parcel" };

export const process: { eyebrow: L; title: L; intro: L; steps: Step[]; outro: L } = {
  eyebrow: { en: "How a sardine is made", pt: "Como nasce uma sardinha" },
  title: { en: "From clay to your table, in six slow steps", pt: "Do barro à sua mesa, em seis passos lentos" },
  intro: {
    en: "No factory line, no shortcuts. Every piece passes through the same patient hands, over about three weeks.",
    pt: "Sem linhas de montagem, sem atalhos. Cada peça passa pelas mesmas mãos pacientes, ao longo de cerca de três semanas.",
  },
  steps: [
    {
      n: "01",
      word: "barro",
      icon: "clay",
      title: { en: "Pressed from local clay", pt: "Prensado em barro local" },
      body: { en: "Soft red clay is pressed by hand into plaster moulds, then each edge is smoothed with a damp sponge.", pt: "O barro é prensado à mão em moldes de gesso e cada aresta é alisada com uma esponja húmida." },
    },
    {
      n: "02",
      word: "secagem",
      icon: "dry",
      title: { en: "Left to dry, slowly", pt: "Seca devagar" },
      body: { en: "Pieces rest on wooden racks for several days. Rushing this step is how cracks are born.", pt: "As peças descansam em prateleiras de madeira durante vários dias. É a pressa que cria as fissuras." },
    },
    {
      n: "03",
      word: "chacota",
      icon: "kiln",
      title: { en: "First firing", pt: "Primeira cozedura" },
      body: { en: "Fired to around 1000 °C, the clay turns into biscuit: hard, pale and ready to take colour.", pt: "Cozida a cerca de 1000 °C, a peça torna-se chacota: dura, clara e pronta para receber cor." },
    },
    {
      n: "04",
      word: "pintura",
      icon: "brush",
      title: { en: "Painted freehand", pt: "Pintada à mão livre" },
      body: { en: "Scales, eyes and azulejo patterns are painted one brushstroke at a time. No stencils, no transfers.", pt: "Escamas, olhos e padrões de azulejo pintados pincelada a pincelada. Sem stencils, sem decalques." },
    },
    {
      n: "05",
      word: "vidrado",
      icon: "glaze",
      title: { en: "Glazed & fired again", pt: "Vidrada e cozida outra vez" },
      body: { en: "Dipped in glaze and fired a second time, which gives the deep, glassy shine you can almost see your face in.", pt: "Mergulhada em vidrado e cozida uma segunda vez: é daqui que vem o brilho profundo, quase de espelho." },
    },
    {
      n: "06",
      word: "embrulho",
      icon: "parcel",
      title: { en: "Wrapped by hand", pt: "Embrulhada à mão" },
      body: { en: "Checked, wrapped in paper and packed with care in our studio, then sent to your door.", pt: "Revista, embrulhada em papel e embalada com cuidado no nosso atelier, a caminho da sua porta." },
    },
  ],
  outro: { en: "That’s why no two are ever quite the same.", pt: "É por isso que nunca há duas iguais." },
};

export const places: { eyebrow: L; title: L; body: L; pins: { id: string; name: string; lon: number; lat: number; craft: L; note: L }[] } = {
  eyebrow: { en: "Where it comes from", pt: "De onde vem" },
  title: { en: "A small map of big traditions", pt: "Um pequeno mapa de grandes tradições" },
  body: {
    en: "Everything we sell is made in Portugal, in small workshops where these crafts have been passed down for generations.",
    pt: "Tudo o que vendemos é feito em Portugal, em pequenas oficinas onde estes ofícios passam de geração em geração.",
  },
  pins: [
    {
      id: "caldas",
      name: "Caldas da Rainha",
      lon: -9.14,
      lat: 39.4,
      craft: { en: "Ceramics & glazes", pt: "Cerâmica e vidrados" },
      note: { en: "A town famous for its playful ceramics since the 19th century. Our sardines and tableware are pressed and fired here.", pt: "Uma cidade famosa pela sua cerâmica irreverente desde o século XIX. As nossas sardinhas e loiça são prensadas e cozidas aqui." },
    },
    {
      id: "lisboa",
      name: "Lisboa",
      lon: -9.14,
      lat: 38.72,
      craft: { en: "Our studio", pt: "O nosso atelier" },
      note: { en: "Where we design new glazes, photograph every piece and wrap each order by hand.", pt: "Onde desenhamos novos vidrados, fotografamos cada peça e embrulhamos cada encomenda à mão." },
    },
    {
      id: "alentejo",
      name: "Alentejo",
      lon: -7.91,
      lat: 38.57,
      craft: { en: "Straw & palm weaving", pt: "Cestaria em palha e palma" },
      note: { en: "Wide golden plains where baskets and bags are still woven by hand, a skill learned at kitchen tables.", pt: "Planícies douradas onde cestos e sacos ainda são tecidos à mão, um saber aprendido à mesa da cozinha." },
    },
  ],
};

export const imperfect = {
  eyebrow: { en: "Imperfect by design", pt: "Imperfeitas de propósito" },
  title: { en: "Painted by hand, so there are no twins", pt: "Pintadas à mão, por isso não há gémeas" },
  body: {
    en: "Because every piece is painted freehand and fired in a real kiln, each one comes out a little different. We think that’s the whole point.",
    pt: "Como cada peça é pintada à mão livre e cozida num forno a sério, cada uma sai ligeiramente diferente. Para nós, é essa a graça.",
  },
  notes: [
    { en: "a bolder brushstroke", pt: "uma pincelada mais forte" },
    { en: "glaze pooled a little deeper", pt: "vidrado mais carregado" },
    { en: "a tiny kiss from the kiln", pt: "um beijinho do forno" },
  ] as L[],
  cta: { en: "Shop ceramic sardines", pt: "Ver sardinhas de cerâmica" },
};

export const ribbon: L[] = [
  { en: "Feito à mão em Portugal", pt: "Feito à mão em Portugal" },
  { en: "Painted freehand", pt: "Pintado à mão livre" },
  { en: "Fired twice", pt: "Cozido duas vezes" },
  { en: "Small batches", pt: "Pequenas séries" },
  { en: "Wrapped with care", pt: "Embrulhado com carinho" },
];

export const seal: L = { en: "Handmade in Portugal · Small batches · ", pt: "Feito à mão em Portugal · Pequenas séries · " };
