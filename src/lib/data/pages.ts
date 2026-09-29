/**
 * Editable page content (becomes the `pages` table + admin "Content" editor).
 * Legal texts are sensible starting drafts — have them reviewed before launch.
 */
import type { L } from "../types";

export type Section = { h?: L; p: L[]; list?: L[] };
export type ContentPage = { title: L; intro: L; sections: Section[]; updated?: string };

const l = (en: string, pt: string): L => ({ en, pt });

export const pages: Record<string, ContentPage> = {
  "shipping-returns": {
    title: l("Shipping & Returns", "Envios e Devoluções"),
    intro: l(
      "Every order is packed by hand in our Lisbon studio. Fragile pieces are wrapped in recycled paper and double-boxed, so they arrive in one piece.",
      "Todas as encomendas são embaladas à mão no nosso atelier em Lisboa. As peças frágeis são envolvidas em papel reciclado e seguem em caixa dupla, para chegarem inteiras.",
    ),
    sections: [
      {
        h: l("Delivery times & costs", "Prazos e custos de entrega"),
        p: [l("We dispatch within 1 business day. Shipping costs are shown on every product page and in your cart before checkout, so there are no surprises.", "Expedimos no prazo de 1 dia útil. Os portes aparecem em cada página de produto e no carrinho antes do checkout, sem surpresas.")],
        list: [
          l("Portugal: 1–3 business days · from €3.90 · free over €60", "Portugal: 1–3 dias úteis · desde 3,90 € · grátis acima de 60 €"),
          l("European Union: 3–7 business days · from €7.90 · free over €150", "União Europeia: 3–7 dias úteis · desde 7,90 € · grátis acima de 150 €"),
          l("United Kingdom: 4–8 business days · from €11.90", "Reino Unido: 4–8 dias úteis · desde 11,90 €"),
          l("United States: 6–12 business days · from €14.90", "Estados Unidos: 6–12 dias úteis · desde 14,90 €"),
          l("Rest of the world: 7–15 business days · from €17.90", "Resto do mundo: 7–15 dias úteis · desde 17,90 €"),
        ],
      },
      {
        h: l("Taxes & duties", "Impostos e taxas"),
        p: [
          l("Prices for Portugal and the EU include VAT. We handle EU VAT through the OSS scheme, so there's nothing extra to pay on delivery.", "Os preços para Portugal e UE incluem IVA. Tratamos o IVA europeu através do regime OSS, por isso não há nada a pagar na entrega."),
          l("UK orders include UK VAT. For the US and elsewhere, prices are shown without EU VAT; local import duties may apply.", "As encomendas para o Reino Unido incluem o IVA britânico. Para os EUA e outros destinos, os preços não incluem IVA da UE; podem aplicar-se taxas de importação locais."),
        ],
      },
      {
        h: l("Returns", "Devoluções"),
        p: [
          l("You have 30 days from delivery to return unused items in their original packaging (the legal EU minimum is 14 days; we give you more). Returns within Portugal are free; for other countries the return shipping is at your cost.", "Tem 30 dias após a entrega para devolver artigos não usados na embalagem original (o mínimo legal na UE é de 14 dias; damos-lhe mais). As devoluções em Portugal são gratuitas; nos outros países os portes de devolução são por conta do cliente."),
          l("Email us with your order number and we'll send instructions. Refunds are issued to the original payment method within 14 days of receiving the return.", "Envie-nos um email com o número da encomenda e enviamos as instruções. O reembolso é feito pelo método de pagamento original até 14 dias após recebermos a devolução."),
        ],
      },
      {
        h: l("Arrived broken?", "Chegou partido?"),
        p: [l("It rarely happens, but ceramics are ceramics. Send us a photo within 7 days of delivery and we'll send a replacement or a full refund. There's no need to return the broken piece.", "Raramente acontece, mas cerâmica é cerâmica. Envie-nos uma foto até 7 dias após a entrega e enviamos uma peça nova ou o reembolso total. Não precisa de devolver a peça partida.")],
      },
    ],
  },
  "care-guide": {
    title: l("Care Guide", "Guia de Cuidados"),
    intro: l("A little care keeps the glaze glossy for years.", "Um pouco de cuidado mantém o vidrado brilhante durante anos."),
    sections: [
      {
        h: l("Tableware", "Loiça de mesa"),
        p: [l("All our tableware uses lead-free, food-safe glazes. It's dishwasher safe on a gentle cycle, but hand-washing keeps the shine for longer. Not suitable for the microwave or oven. Avoid sudden changes of temperature, such as a cold dish into hot water.", "Toda a nossa loiça usa vidrados sem chumbo, próprios para alimentos. Pode ir à máquina em programa suave, mas lavar à mão mantém o brilho por mais tempo. Não adequada para micro-ondas ou forno. Evite mudanças bruscas de temperatura, como passar um prato frio para água quente.")],
      },
      {
        h: l("Wall sardines: how to hang", "Sardinhas de parede: como pendurar"),
        p: [l("Each sardine has a keyhole slot on the back.", "Cada sardinha tem um furo de fechadura no verso.")],
        list: [
          l("Small–Large: one 3–4 mm screw or picture hook, angled slightly upward.", "Pequena a Grande: um parafuso de 3–4 mm ou gancho de quadros, ligeiramente inclinado para cima."),
          l("Statement: use a wall plug rated for at least 5 kg.", "Statement: use uma bucha para pelo menos 5 kg."),
          l("For a shoal, hang them on a gentle diagonal, 8–12 cm apart.", "Para um cardume, pendure-as numa diagonal suave, com 8–12 cm entre elas."),
          l("Indoors only; frost can crack the glaze.", "Apenas no interior; a geada pode rachar o vidrado."),
        ],
      },
      {
        h: l("Straw bags", "Cestos de palha"),
        p: [l("Spot clean with a damp cloth and let dry in the shade. Stuff with paper when storing. If it gets squashed, mist lightly with water and reshape by hand.", "Limpe pontualmente com um pano húmido e deixe secar à sombra. Guarde com papel no interior. Se amachucar, borrife ligeiramente com água e volte a moldar à mão.")],
      },
      {
        h: l("Why every piece is different", "Porque é que cada peça é diferente"),
        p: [l("Our pieces are pressed, painted and glazed by hand. Small variations in colour, glaze pooling and brushwork are part of the process, not defects.", "As nossas peças são prensadas, pintadas e vidradas à mão. Pequenas variações de cor, acumulação de vidrado e pinceladas fazem parte do processo, não são defeitos.")],
      },
    ],
  },
  "our-story": {
    title: l("Our Story", "A Nossa História"),
    intro: l(
      "Terra Collective started with one sardine, painted as a birthday present, and a friend asking where she could buy one.",
      "A Terra Collective começou com uma sardinha, pintada como prenda de anos, e uma amiga a perguntar onde podia comprar uma.",
    ),
    sections: [
      {
        h: l("Modern Portuguese, made by hand", "Português moderno, feito à mão"),
        p: [
          l("We love the things Portugal has always made well: glossy glazes, azulejo blues, woven palm and tinned fish in beautiful packaging. We design pieces that feel fresh and bright, then make them with the workshops that know these crafts best.", "Adoramos o que Portugal sempre fez bem: vidrados brilhantes, azuis de azulejo, palma entrançada e conservas em latas bonitas. Desenhamos peças frescas e luminosas e fazemo-las com as oficinas que melhor conhecem estes ofícios."),
          l("Our ceramics are fine glazed stoneware, pressed and painted in family studios in Caldas da Rainha and Lisbon. Our straw bags are woven by a family of weavers in the Alentejo. Our playing cards are printed in Porto.", "A nossa cerâmica é grés vidrado fino, prensado e pintado em ateliers familiares nas Caldas da Rainha e em Lisboa. Os cestos são tecidos por uma família de artesãs no Alentejo. As cartas são impressas no Porto."),
        ],
      },
      {
        h: l("Small batches, fair pay", "Pequenas séries, pagamento justo"),
        p: [l("We make in small batches and restock often, so nothing is wasted. Every maker sets their own price, and we pay it.", "Produzimos em pequenas séries e repomos com frequência, para nada se desperdiçar. Cada artesão define o seu preço, e nós pagamo-lo.")],
      },
    ],
  },
  terms: {
    title: l("Terms & Conditions", "Termos e Condições"),
    intro: l("These terms apply to all purchases made on this website.", "Estes termos aplicam-se a todas as compras realizadas neste website."),
    updated: "2026-09-28",
    sections: [
      { h: l("Seller", "Vendedor"), p: [l("Terra Collective, Rua das Flores 00, 1200-000 Lisboa, Portugal · NIF PT000000000 · hello@terracollective.pt", "Terra Collective, Rua das Flores 00, 1200-000 Lisboa, Portugal · NIF PT000000000 · hello@terracollective.pt")] },
      { h: l("Orders & prices", "Encomendas e preços"), p: [l("Prices are in euros and, for EU customers, include VAT at the applicable rate. The contract is concluded when we confirm your order by email.", "Os preços estão em euros e, para clientes da UE, incluem IVA à taxa aplicável. O contrato considera-se celebrado quando confirmamos a encomenda por email.")] },
      { h: l("Right of withdrawal", "Direito de livre resolução"), p: [l("EU consumers may withdraw from the contract within 14 days of delivery without giving a reason (Decreto-Lei n.º 24/2014). We extend this to 30 days. See Shipping & Returns for how to return an item.", "Os consumidores da UE podem resolver o contrato no prazo de 14 dias após a entrega sem indicar motivo (Decreto-Lei n.º 24/2014). Alargamos este prazo para 30 dias. Consulte Envios e Devoluções para saber como devolver.")] },
      { h: l("Legal guarantee", "Garantia legal"), p: [l("Goods are covered by the legal guarantee of conformity for 3 years (Decreto-Lei n.º 84/2021). Natural variations of handmade pieces are not defects.", "Os bens beneficiam da garantia legal de conformidade de 3 anos (Decreto-Lei n.º 84/2021). As variações naturais das peças feitas à mão não constituem defeitos.")] },
      { h: l("Disputes", "Litígios"), p: [l("In case of dispute, consumers may use an alternative dispute resolution entity: CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (www.cniacc.pt), or the EU Online Dispute Resolution platform. You can also use the Livro de Reclamações Eletrónico.", "Em caso de litígio, o consumidor pode recorrer a uma entidade de resolução alternativa de litígios: CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (www.cniacc.pt), ou à plataforma europeia de resolução de litígios em linha. Pode também usar o Livro de Reclamações Eletrónico.")] },
    ],
  },
  privacy: {
    title: l("Privacy Policy", "Política de Privacidade"),
    intro: l("We collect only what we need to deliver your order and, if you ask us to, to send you news.", "Recolhemos apenas o necessário para entregar a sua encomenda e, se o pedir, para lhe enviar novidades."),
    updated: "2026-09-28",
    sections: [
      { h: l("What we collect", "O que recolhemos"), p: [l("Name, email, delivery address, phone number and, if you provide it, your NIF for invoicing. Payments are processed by Stripe; we never see or store your card details.", "Nome, email, morada de entrega, telefone e, se o indicar, o NIF para faturação. Os pagamentos são processados pela Stripe; nunca vemos nem guardamos os dados do seu cartão.")] },
      { h: l("Why", "Para quê"), p: [l("To fulfil your order (contract), to issue invoices (legal obligation), and to send newsletters only if you opt in (consent).", "Para cumprir a encomenda (contrato), emitir faturas (obrigação legal) e enviar newsletters apenas se o autorizar (consentimento).")] },
      { h: l("Analytics", "Estatísticas"), p: [l("With your consent we use first-party, privacy-friendly analytics. We don't use advertising trackers or sell data.", "Com o seu consentimento usamos estatísticas próprias que respeitam a privacidade. Não usamos rastreadores publicitários nem vendemos dados.")] },
      { h: l("Your rights", "Os seus direitos"), p: [l("You can access, export, correct or delete your data at any time from your account page or by emailing us. You may also complain to the CNPD (www.cnpd.pt).", "Pode aceder, exportar, corrigir ou apagar os seus dados a qualquer momento na página da conta ou por email. Pode também apresentar reclamação à CNPD (www.cnpd.pt).")] },
      { h: l("Processors", "Subcontratantes"), p: [l("Supabase (hosting & database, EU region), Stripe (payments), Resend (email), InvoiceXpress or Moloni (certified invoicing), CTT and DHL (delivery).", "Supabase (alojamento e base de dados, região UE), Stripe (pagamentos), Resend (email), InvoiceXpress ou Moloni (faturação certificada), CTT e DHL (entregas).")] },
    ],
  },
  cookies: {
    title: l("Cookie Policy", "Política de Cookies"),
    intro: l("We keep cookies to a minimum.", "Usamos o mínimo de cookies possível."),
    updated: "2026-09-28",
    sections: [
      { h: l("Essential", "Essenciais"), p: [l("Language, currency, delivery country, your cart and your cookie choice. These are needed for the shop to work and don't require consent.", "Idioma, moeda, país de entrega, carrinho e a sua escolha de cookies. São necessários para a loja funcionar e não requerem consentimento.")] },
      { h: l("Analytics (optional)", "Estatísticas (opcional)"), p: [l("If you accept, we record anonymous page and product views to understand what people like. No third-party trackers, no cross-site profiles.", "Se aceitar, registamos visualizações anónimas de páginas e produtos para percebermos o que as pessoas gostam. Sem rastreadores de terceiros nem perfis entre sites.")] },
    ],
  },
};

export type FaqGroup = { title: L; items: { q: L; a: L }[] };

export const faq: FaqGroup[] = [
  {
    title: l("Our pieces", "As nossas peças"),
    items: [
      { q: l("Are your ceramics handmade?", "A vossa cerâmica é feita à mão?"), a: l("Yes. Every piece is pressed or thrown, painted and glazed by hand in Portugal, so each one is slightly different.", "Sim. Cada peça é prensada ou torneada, pintada e vidrada à mão em Portugal, por isso cada uma é ligeiramente diferente.") },
      { q: l("Is it terracotta?", "É barro/terracota?"), a: l("No. Our pieces are fine white stoneware with a glossy, glass-like glaze, not rustic terracotta.", "Não. As nossas peças são em grés branco fino com vidrado brilhante, não barro rústico.") },
      { q: l("Is the tableware food-safe?", "A loiça é própria para alimentos?"), a: l("Yes. All tableware uses lead-free, food-safe glazes and is dishwasher safe on a gentle cycle.", "Sim. Toda a loiça usa vidrados sem chumbo próprios para alimentos e pode ir à máquina em programa suave.") },
    ],
  },
  {
    title: l("Orders & delivery", "Encomendas e entregas"),
    items: [
      { q: l("How long does delivery take?", "Quanto tempo demora a entrega?"), a: l("1–3 business days in Portugal, 3–7 in the EU, 4–15 elsewhere. You'll see an exact estimate on each product page.", "1–3 dias úteis em Portugal, 3–7 na UE, 4–15 no resto do mundo. Verá uma estimativa exata em cada página de produto.") },
      { q: l("What if something arrives broken?", "E se algo chegar partido?"), a: l("Send us a photo within 7 days and we'll replace it or refund you in full.", "Envie-nos uma foto em 7 dias e substituímos ou reembolsamos na totalidade.") },
      { q: l("Can I add a gift message?", "Posso juntar uma mensagem de oferta?"), a: l("Yes. Add gift wrap on the product page, in your cart or at checkout and we'll handwrite your message on a card.", "Sim. Adicione embrulho na página do produto, no carrinho ou no checkout e escrevemos a sua mensagem à mão num cartão.") },
    ],
  },
  {
    title: l("Payments & invoices", "Pagamentos e faturas"),
    items: [
      { q: l("Which payment methods do you accept?", "Que métodos de pagamento aceitam?"), a: l("Cards, Apple Pay, Google Pay, PayPal, Klarna and, in Portugal, MB WAY and Multibanco.", "Cartões, Apple Pay, Google Pay, PayPal, Klarna e, em Portugal, MB WAY e Multibanco.") },
      { q: l("Can I get an invoice with my NIF?", "Posso ter fatura com NIF?"), a: l("Of course. Add your NIF at checkout and a certified invoice is emailed automatically.", "Claro. Indique o NIF no checkout e a fatura certificada é enviada automaticamente por email.") },
    ],
  },
];
