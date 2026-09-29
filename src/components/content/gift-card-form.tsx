"use client";

import { useState } from "react";
import type { ProductLite } from "@/lib/data/catalog";
import { useCart } from "@/lib/store/cart";
import { usePrefs } from "../providers";

export function GiftCardForm({ product }: { product: ProductLite }) {
  const { dict, locale, price } = usePrefs();
  const add = useCart((s) => s.add);
  const [amount, setAmount] = useState(product.variants[1].id);
  const [to, setTo] = useState("");
  const v = product.variants.find((x) => x.id === amount)!;
  const pt = locale === "pt";

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        add({
          variantId: v.id,
          slug: product.slug,
          name: product.name,
          variantLabel: { en: `€${v.options.set}${to ? ` · for ${to}` : ""}`, pt: `${v.options.set} €${to ? ` · para ${to}` : ""}` },
          image: product.images[0],
          price: v.price,
          shipping: product.shipping,
          maxQty: 10,
        });
      }}
    >
      <fieldset>
        <legend className="label">{pt ? "Valor" : "Amount"}</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {product.variants.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === amount} onClick={() => setAmount(x.id)} className="chip min-w-20">
              {price(x.price, { raw: true })}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="gc-to" className="label">{pt ? "Para (opcional)" : "Recipient name (optional)"}</label>
        <input id="gc-to" value={to} onChange={(e) => setTo(e.target.value)} className="field" maxLength={60} />
      </div>
      <p className="text-sm text-ink-soft">
        {pt ? "Enviado por email logo após a compra, com a sua mensagem. Válido por 2 anos. Sem portes." : "Emailed right after purchase with your message. Valid for 2 years. No shipping."}
      </p>
      <button type="submit" className="btn-primary w-full">{dict.product.addToCart} · {price(v.price, { raw: true })}</button>
    </form>
  );
}
