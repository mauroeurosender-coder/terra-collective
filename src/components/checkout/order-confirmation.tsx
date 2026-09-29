"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { CartLine } from "@/lib/store/cart";
import { fmt, href, t } from "@/lib/i18n";
import { formatEUR } from "@/lib/money";
import { usePrefs } from "../providers";
import { SardineLine, WaveDivider } from "../illustrations";

type LastOrder = {
  orderNumber: string;
  name: string;
  email: string;
  lines: CartLine[];
  totals: { subtotal: number; shipping: number; wrap: number; discountAmount: number; vat: number; total: number };
  payment: { method: string; multibanco?: { entity: string; reference: string; expiresAt: string }; demo: boolean };
};

export function OrderConfirmation() {
  const { locale, dict } = usePrefs();
  const s = dict.success;
  const [order, setOrder] = useState<LastOrder | null | undefined>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem("tc_last_order");
    // Reading sessionStorage must happen after mount to keep SSR output stable.
    const id = requestAnimationFrame(() => setOrder(raw ? JSON.parse(raw) : null));
    return () => cancelAnimationFrame(id);
  }, []);

  if (order === undefined) return <div className="min-h-[60vh]" />;
  if (order === null)
    return (
      <div className="container-x py-24 text-center">
        <Link href={href(locale)} className="btn-primary">{dict.common.backHome}</Link>
      </div>
    );

  const money = (c: number) => formatEUR(c, locale);
  return (
    <div className="container-x max-w-3xl py-12 md:py-20">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-olive" />
        <h1 className="headline mt-5 text-4xl md:text-5xl">{fmt(s.title, { name: order.name })}</h1>
        <p className="mt-4 text-lg text-ink-soft">{fmt(s.body, { order: order.orderNumber, email: order.email })}</p>
        <p className="hand mt-4">{locale === "pt" ? "obrigado por apoiar o feito à mão" : "thank you for supporting handmade"}</p>
      </div>

      {order.payment.multibanco && (
        <section className="mt-10 rounded-[var(--radius-card)] border-2 border-azulejo bg-paper p-6" aria-labelledby="mb-h">
          <h2 id="mb-h" className="text-lg font-semibold">{s.multibanco}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div><dt className="text-xs text-ink-soft">{s.entity}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{order.payment.multibanco.entity}</dd></div>
            <div><dt className="text-xs text-ink-soft">{s.reference}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{order.payment.multibanco.reference}</dd></div>
            <div><dt className="text-xs text-ink-soft">{s.amount}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{money(order.totals.total)}</dd></div>
          </dl>
        </section>
      )}

      <section className="mt-10 rounded-[var(--radius-card)] bg-paper p-6 md:p-8">
        <ul className="space-y-4">
          {order.lines.map((l) => (
            <li key={l.variantId} className="flex items-center gap-4">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{t(l.name, locale)} × {l.quantity}</p>
                {l.variantLabel[locale] && <p className="text-ink-soft">{l.variantLabel[locale]}</p>}
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">{dict.checkout.subtotal}</dt><dd>{money(order.totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">{dict.checkout.shipping}</dt><dd>{order.totals.shipping ? money(order.totals.shipping) : dict.cart.shippingFree}</dd></div>
          {order.totals.wrap > 0 && <div className="flex justify-between"><dt className="text-ink-soft">{dict.checkout.giftWrap}</dt><dd>{money(order.totals.wrap)}</dd></div>}
          {order.totals.discountAmount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">{dict.checkout.discountLine}</dt><dd>−{money(order.totals.discountAmount)}</dd></div>}
          <div className="flex justify-between pt-2 text-base font-semibold"><dt>{dict.checkout.total}</dt><dd>{money(order.totals.total)}</dd></div>
        </dl>
      </section>

      <p className="mt-8 text-center text-ink-soft">{s.next}</p>

      <section className="mt-10 flex flex-col items-center gap-4 rounded-[var(--radius-card)] bg-azulejo-tint px-6 py-8 text-center md:flex-row md:text-left">
        <SardineLine className="h-10 w-24 shrink-0 text-azulejo" />
        <div className="flex-1">
          <h2 className="font-semibold">{s.account}</h2>
          <p className="text-sm text-ink-soft">{s.accountBody}</p>
        </div>
        <Link href={href(locale, "/account")} className="btn-accent shrink-0">{s.accountCta}</Link>
      </section>
      <WaveDivider className="mt-16 h-4 w-full text-azulejo/30" />
    </div>
  );
}
