/**
 * Automated email sequences: types and default content (EN + pt-PT).
 * Saved in settings under "email_sequences"; edited in Admin → Marketing.
 * Plain module (no server imports) so the admin editor can use it too.
 *
 * Placeholders in subject/heading/body/button:
 *   {first_name} {items} {code} {product} {order_number}
 * Body: blank line = new paragraph. {items} becomes a list of products.
 */
import type { L } from "./types";

export type SequenceKey = "cart" | "welcome" | "post_purchase" | "winback" | "back_in_stock";

export type SequenceStep = {
  /** Hours after the trigger (cart left, sign-up, order placed, last order, back in stock). */
  delayHours: number;
  subject: L;
  heading: L;
  body: L;
  button: L;
  /** Discount code shown as {code}; create it in Marketing → Discounts. */
  code: string | null;
  /** Promotional email: only sent to people who agreed to marketing emails. */
  marketing: boolean;
};

export type Sequence = { enabled: boolean; steps: SequenceStep[] };
export type EmailSequences = Record<SequenceKey, Sequence>;

export const sequenceInfo: Record<SequenceKey, { name: string; trigger: string; audience: string }> = {
  cart: { name: "Abandoned cart", trigger: "hours after the cart was last changed", audience: "Shoppers who typed their email at checkout and didn’t order. Stops as soon as they order." },
  welcome: { name: "Welcome series", trigger: "hours after signing up", audience: "Newsletter subscribers (they opted in)." },
  post_purchase: { name: "After purchase", trigger: "hours after the order", audience: "Website customers. Promotional steps only if they accepted marketing emails." },
  winback: { name: "Win-back", trigger: "hours after their last order", audience: "Website customers who accepted marketing emails and haven’t ordered since." },
  back_in_stock: { name: "Back in stock", trigger: "hours after the product is back in stock", audience: "People who asked to be told when a product returns." },
};

const s = (
  delayHours: number,
  subject: [string, string],
  heading: [string, string],
  body: [string, string],
  button: [string, string],
  opts: { code?: string; marketing?: boolean } = {},
): SequenceStep => ({
  delayHours,
  subject: { en: subject[0], pt: subject[1] },
  heading: { en: heading[0], pt: heading[1] },
  body: { en: body[0], pt: body[1] },
  button: { en: button[0], pt: button[1] },
  code: opts.code ?? null,
  marketing: opts.marketing ?? false,
});

export const defaultSequences = (): EmailSequences => ({
  cart: {
    enabled: true,
    steps: [
      s(1, ["You left something in your cart", "Deixou algo no carrinho"], ["Still thinking it over?", "Ainda está a pensar?"],
        ["Hi {first_name}, we saved your cart for you:\n\n{items}\n\nEvery piece is glazed by hand in Portugal, so each one is a little different, and stock is small.", "Olá {first_name}, guardámos o seu carrinho:\n\n{items}\n\nCada peça é vidrada à mão em Portugal, por isso cada uma é um pouco diferente, e o stock é pequeno."],
        ["Return to your cart", "Voltar ao carrinho"]),
      s(24, ["Your pieces are still waiting", "As suas peças ainda estão à espera"], ["Made by hand, kept for you", "Feitas à mão, guardadas para si"],
        ["Your cart is still here:\n\n{items}\n\nQuestions about size, colour or shipping? Just reply to this email, a real person answers.", "O seu carrinho continua aqui:\n\n{items}\n\nDúvidas sobre tamanho, cor ou envio? Responda a este email, é uma pessoa real que responde."],
        ["Complete my order", "Concluir a encomenda"]),
      s(72, ["A little something to help you decide", "Uma pequena ajuda para decidir"], ["10% off your cart", "10% de desconto no seu carrinho"],
        ["If you’re still deciding, here’s 10% off with the code {code}, valid for the next few days.\n\n{items}", "Se ainda está a decidir, tem 10% de desconto com o código {code}, válido nos próximos dias.\n\n{items}"],
        ["Use my 10%", "Usar os meus 10%"], { code: "COMEBACK10", marketing: true }),
    ],
  },
  welcome: {
    enabled: true,
    steps: [
      s(0, ["Welcome to Terra Collective 🐟", "Bem-vindo à Terra Collective 🐟"], ["Little pieces of Portuguese sunshine", "Pequenos pedaços de sol português"],
        ["Thank you for joining us. We work with small makers in Portugal on glossy glazed ceramics, sardines and handwoven bags.\n\nAs a welcome, here’s 10% off your first order with the code {code}.", "Obrigado por se juntar a nós. Trabalhamos com pequenos artesãos em Portugal: cerâmica vidrada, sardinhas e cestos tecidos à mão.\n\nComo boas-vindas, tem 10% de desconto na primeira encomenda com o código {code}."],
        ["Shop the collection", "Ver a coleção"], { code: "WELCOME10", marketing: true }),
      s(48, ["Meet the hands behind every piece", "Conheça as mãos por trás de cada peça"], ["Made slowly, in small batches", "Feito devagar, em pequenas séries"],
        ["Each sardine is shaped, painted and glazed by hand, then fired twice. That’s why no two are exactly alike, and why we only make a few at a time.\n\nYour 10% code {code} is still waiting.", "Cada sardinha é moldada, pintada e vidrada à mão, e vai ao forno duas vezes. Por isso não há duas iguais, e fazemos poucas de cada vez.\n\nO seu código de 10% {code} continua à espera."],
        ["Read our story", "Ler a nossa história"], { code: "WELCOME10", marketing: true }),
      s(120, ["Our most loved pieces", "As peças mais amadas"], ["What everyone is choosing", "O que todos estão a escolher"],
        ["Sets of glazed sardines for the wall, olive dishes for the table and tins of cards for game night: these are the pieces people come back for.\n\nLast reminder: {code} gives you 10% off.", "Conjuntos de sardinhas vidradas para a parede, pratos para azeitonas e latas de cartas para noites de jogo: são as peças a que todos voltam.\n\nÚltimo lembrete: {code} dá-lhe 10% de desconto."],
        ["See the best-sellers", "Ver os mais vendidos"], { code: "WELCOME10", marketing: true }),
    ],
  },
  post_purchase: {
    enabled: true,
    steps: [
      s(48, ["Thank you, and how to care for your pieces", "Obrigado, e como cuidar das suas peças"], ["Thank you for order {order_number}", "Obrigado pela encomenda {order_number}"],
        ["We’re packing your order with care:\n\n{items}\n\nCare tips: glazed ceramics like a gentle hand wash and a soft cloth. Avoid sudden temperature changes. Wall pieces only need a dust now and then.", "Estamos a embalar a sua encomenda com cuidado:\n\n{items}\n\nCuidados: a cerâmica vidrada prefere lavagem à mão e um pano macio. Evite mudanças bruscas de temperatura. As peças de parede só precisam de tirar o pó de vez em quando."],
        ["View my order", "Ver a encomenda"]),
      s(336, ["How are your new pieces settling in?", "Como estão as suas novas peças?"], ["Would you leave a review?", "Deixa-nos uma opinião?"],
        ["We hope your pieces have found their place. A short review helps other people discover handmade Portuguese ceramics, and helps our makers a lot.\n\n{items}", "Esperamos que as suas peças já tenham encontrado o seu lugar. Uma opinião curta ajuda outras pessoas a descobrir a cerâmica portuguesa feita à mão, e ajuda muito os nossos artesãos.\n\n{items}"],
        ["Write a review", "Escrever uma opinião"]),
      s(720, ["Pieces that pair well with yours", "Peças que combinam com as suas"], ["Made to go together", "Feitas para combinar"],
        ["Your {product} has a few friends: matching colours, sets for the table and little gifts. Have a look at what pairs well.", "A sua peça {product} tem algumas amigas: cores a condizer, conjuntos para a mesa e pequenos presentes. Veja o que combina."],
        ["See what pairs well", "Ver o que combina"], { marketing: true }),
    ],
  },
  winback: {
    enabled: true,
    steps: [
      s(2160, ["We miss you at Terra Collective", "Temos saudades suas"], ["New pieces since your last visit", "Peças novas desde a sua última visita"],
        ["It’s been a while. Our makers have glazed new colours and sets since your last order.\n\nHere’s 10% off to welcome you back: {code}", "Já passou algum tempo. Os nossos artesãos criaram novas cores e conjuntos desde a sua última encomenda.\n\nTem 10% de desconto para voltar: {code}"],
        ["See what’s new", "Ver as novidades"], { code: "COMEBACK10", marketing: true }),
    ],
  },
  back_in_stock: {
    enabled: true,
    steps: [
      s(0, ["{product} is back in stock", "{product} está de volta"], ["It’s back!", "Está de volta!"],
        ["Good news: {product} is available again. We only make a few at a time, so it may not last long.", "Boas notícias: {product} está novamente disponível. Fazemos poucas de cada vez, por isso pode esgotar depressa."],
        ["Shop it now", "Comprar agora"]),
    ],
  },
});

/** Saved settings merged over the defaults (new sequences/fields get their defaults). */
export function mergeSequences(saved: unknown): EmailSequences {
  const d = defaultSequences();
  if (!saved || typeof saved !== "object") return d;
  const out = { ...d };
  for (const k of Object.keys(d) as SequenceKey[]) {
    const v = (saved as Partial<EmailSequences>)[k];
    if (v && Array.isArray(v.steps)) out[k] = { enabled: v.enabled !== false, steps: v.steps.map((st) => ({ ...d[k].steps[0], ...st })) };
  }
  return out;
}
