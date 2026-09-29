"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { ChevronDown, Gift, Lock, PackageCheck, RotateCcw, ShieldCheck, Tag } from "lucide-react";
import { store } from "@/lib/config";
import { countries, deliveryWindow, getCountry } from "@/lib/geo";
import { computeTotals, EXPRESS_SURCHARGE, type Discount, type ShippingMethod } from "@/lib/pricing";
import { emptyForm, methodsFor, validateCheckout, type CheckoutForm as Form, type FieldError, type PaymentMethod } from "@/lib/checkout";
import { cartCount, useCart } from "@/lib/store/cart";
import { fmt, href, t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { formatEUR } from "@/lib/money";
import { usePrefs } from "../providers";
import { SardineLine } from "../illustrations";

export function CheckoutForm() {
  const { locale, dict, country: prefCountry, setCountry, currency, settings } = usePrefs();
  const c = dict.checkout;
  const router = useRouter();
  const { lines, giftWrap, giftMessage, setGiftWrap, setGiftMessage, discountCode, setDiscount, clear } = useCart();
  // Cart rehydrates from localStorage after mount.
  const hydrated = useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
  const [form, setForm] = useState<Form>(() => emptyForm(prefCountry));
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [method, setMethod] = useState<ShippingMethod>("standard");
  const [discount, setDiscountObj] = useState<Discount | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Stable anonymous token so an abandoned cart can be restored from a reminder email.
  const [cartToken] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const t = localStorage.getItem("tc_cart_token") ?? crypto.randomUUID();
      localStorage.setItem("tc_cart_token", t);
      return t;
    } catch {
      return "";
    }
  });

  // Restore a cart from ?restore=<token> (abandoned-cart email link).
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("restore");
    if (!token) return;
    fetch(`/api/cart-capture?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.lines) && d.lines.length) useCart.setState({ lines: d.lines });
        try { localStorage.setItem("tc_cart_token", token); } catch {}
      });
  }, []);

  // Save the cart for reminders once a valid email is entered.
  useEffect(() => {
    if (!cartToken || !lines.length || !/^\S+@\S+\.\S+$/.test(form.email)) return;
    const t = setTimeout(() => {
      fetch("/api/cart-capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: cartToken, email: form.email, lines, value: computeTotals({ lines, country: form.country, giftWrap: false }).subtotal, country: form.country, locale }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [cartToken, form.email, form.country, lines, locale]);

  // Automatic promotion (no code needed), unless the shopper entered a code.
  useEffect(() => {
    if (discountCode) return;
    fetch("/api/discount").then((r) => (r.ok ? r.json() : null)).then((d) => d && setDiscountObj((cur) => cur ?? d));
  }, [discountCode]);

  // Re-apply a saved code (e.g. from the cart) once.
  useEffect(() => {
    if (!discountCode || discount) return;
    fetch("/api/discount", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: discountCode }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDiscountObj(d));
  }, [discountCode, discount]);

  const country = form.country;
  const methods = methodsFor(country);
  const activePayment = methods.includes(payment) ? payment : "card";
  const totals = computeTotals({ lines, country, giftWrap, discount, method });
  const errors = useMemo(() => validateCheckout(form, activePayment), [form, activePayment]);
  const cty = getCountry(country);
  const win = deliveryWindow(country, locale);
  const money = (cents: number) => formatEUR(cents, locale);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const errFor = (k: keyof Form) => ((touched[k] || submitted) && errors[k]) || null;
  const errText = (e: FieldError) =>
    e === "required" ? c.required : e === "email" ? c.invalidEmail : e === "postal" ? fmt(c.invalidPostal, { example: cty.postalExample ?? "" }) : e === "nif" ? c.invalidNif : c.invalidPhone;

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className?: string) => {
    const e = errFor(k);
    const id = `co-${k}`;
    return (
      <div className={className}>
        <label htmlFor={id} className="label">
          {label}
        </label>
        <input
          id={id}
          name={k}
          value={String(form[k])}
          onChange={(ev) => set(k, ev.target.value as never)}
          onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
          aria-invalid={!!e}
          aria-describedby={e ? `${id}-err` : undefined}
          className="field"
          {...props}
        />
        {e && (
          <p id={`${id}-err`} className="mt-1.5 text-sm text-coral-ink">
            {errText(e)}
          </p>
        )}
      </div>
    );
  };

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/discount", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    if (!res.ok) return setCodeError(true);
    const d = (await res.json()) as Discount;
    setDiscountObj(d);
    setDiscount(d.code);
    setCodeError(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      document.getElementById(`co-${first}`)?.focus();
      return;
    }
    setProcessing(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        form,
        payment: activePayment,
        method,
        giftWrap,
        giftMessage,
        discountCode: discount && !("automatic" in discount && discount.automatic) ? discount.code : null,
        locale,
        cartToken,
      }),
    });
    const data = await res.json();
    setProcessing(false);
    if (!res.ok) return setServerError(data.error ?? "error");
    track("purchase", { order: data.orderNumber, value: data.totals.total, items: lines.map((l) => ({ slug: l.slug, qty: l.quantity })) });
    sessionStorage.setItem(
      "tc_last_order",
      JSON.stringify({ ...data, name: form.firstName, email: form.email, lines, method, country, payment: { ...data.payment, method: activePayment } }),
    );
    clear();
    router.push(href(locale, `/checkout/success?order=${data.orderNumber}`));
  }

  if (!hydrated) return <div className="container-x min-h-[60vh] py-20 text-center text-ink-soft">{dict.common.loading}</div>;

  if (lines.length === 0)
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <SardineLine className="h-16 w-40 text-azulejo" />
        <p className="headline mt-6 text-3xl">{c.emptyCart}</p>
        <Link href={href(locale, "/shop")} className="btn-primary mt-8">
          {dict.cart.continue}
        </Link>
      </div>
    );

  const summary = (
    <div className="space-y-5">
      <ul className="space-y-4">
        {lines.map((l) => (
          <li key={l.variantId} className="flex items-center gap-4">
            <div className="relative h-18 w-16 shrink-0 rounded-xl bg-cream-deep">
              <Image src={l.image} alt="" fill sizes="64px" className="rounded-xl object-cover" />
              <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-ink-soft px-1 text-xs font-semibold text-white">{l.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{t(l.name, locale)}</p>
              {l.variantLabel[locale] && <p className="text-xs text-ink-soft">{l.variantLabel[locale]}</p>}
            </div>
            <p className="text-sm font-medium">{money(computeTotals({ lines: [l], country, giftWrap: false }).subtotal)}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-line bg-paper p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="h-4 w-4 accent-azulejo" />
          <Gift className="h-4 w-4 text-azulejo" />
          <span className="flex-1">{dict.product.giftWrap}</span>
          <span className="text-ink-soft">+{money(store.giftWrapPrice)}</span>
        </label>
        {giftWrap && (
          <textarea
            aria-label={dict.product.giftMessage}
            rows={2}
            maxLength={240}
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value)}
            placeholder={dict.product.giftMessagePh}
            className="field mt-3 resize-none text-sm"
          />
        )}
      </div>

      {!discount ? (
        codeOpen ? (
          <form onSubmit={applyCode} className="space-y-1.5">
            <div className="flex gap-2">
              <label htmlFor="co-code" className="sr-only">
                {c.discountPh}
              </label>
              <input id="co-code" value={code} onChange={(e) => { setCode(e.target.value); setCodeError(false); }} placeholder={c.discountPh} aria-invalid={codeError} className="field uppercase" autoFocus />
              <button type="submit" className="btn-outline min-h-11 px-5 py-2">
                {c.apply}
              </button>
            </div>
            {codeError && <p className="text-sm text-coral-ink">{c.discountInvalid}</p>}
          </form>
        ) : (
          <button type="button" onClick={() => setCodeOpen(true)} className="link inline-flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4" /> {c.discount}
          </button>
        )
      ) : (
        <p className="flex items-center justify-between rounded-xl bg-olive-tint px-4 py-2.5 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-olive" /> {"automatic" in discount && discount.automatic ? (locale === "pt" ? "Promoção aplicada" : "Promotion applied") : fmt(c.discountApplied, { code: discount.code })}
          </span>
          {!("automatic" in discount && discount.automatic) && (
            <button type="button" onClick={() => { setDiscountObj(null); setDiscount(null); }} className="text-ink-soft underline">
              {dict.cart.remove}
            </button>
          )}
        </p>
      )}

      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">{c.subtotal}</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{c.shipping}</dt>
          <dd>{totals.shipping === 0 ? dict.cart.shippingFree : money(totals.shipping)}</dd>
        </div>
        {totals.wrap > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{c.giftWrap}</dt>
            <dd>{money(totals.wrap)}</dd>
          </div>
        )}
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-olive">
            <dt>{c.discountLine}</dt>
            <dd>−{money(totals.discountAmount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-base font-semibold">{c.total}</dt>
          <dd className="text-2xl font-semibold">
            <span className="mr-1.5 text-xs font-normal text-ink-soft">EUR</span>
            {money(totals.total)}
          </dd>
        </div>
        <p className="text-xs text-ink-soft">{totals.vat > 0 ? fmt(c.vat, { amount: money(totals.vat) }) : c.vatExport}</p>
        {currency !== "EUR" && <p className="text-xs text-ink-soft">{dict.product.chargedEUR}</p>}
      </dl>
    </div>
  );

  const paymentLabels: Record<PaymentMethod, string> = { card: c.card, mbway: c.mbway, multibanco: c.multibanco, paypal: c.paypal, klarna: c.klarna };

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[1fr_minmax(380px,0.8fr)]">
      {/* Mobile summary toggle */}
      <div className="border-b border-line bg-paper lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((v) => !v)} aria-expanded={summaryOpen} aria-controls="mobile-summary" className="container-x flex w-full items-center justify-between py-4 text-sm font-medium text-azulejo">
          <span className="flex items-center gap-2">
            {summaryOpen ? c.hideSummary : c.showSummary} ({cartCount(lines)})
            <ChevronDown className={clsx("h-4 w-4 transition", summaryOpen && "rotate-180")} />
          </span>
          <span className="text-base font-semibold text-ink">{money(totals.total)}</span>
        </button>
        {summaryOpen && (
          <div id="mobile-summary" className="container-x pb-6">
            {summary}
          </div>
        )}
      </div>

      <form onSubmit={submit} noValidate className="px-4 py-8 sm:px-6 lg:py-12 lg:pr-14 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
        <div className="mx-auto max-w-xl space-y-10 lg:mr-0 lg:ml-auto">
          {/* Express */}
          <section aria-labelledby="express-h">
            <h2 id="express-h" className="mb-3 text-center text-sm font-medium text-ink-soft">
              {c.express}
            </h2>
            <div className="grid auto-cols-fr grid-flow-col gap-2">
              {settings.payments.applepay && <button type="button" className="btn min-h-12 bg-black px-2 text-white hover:bg-black/85">Apple Pay</button>}
              {settings.payments.googlepay && <button type="button" className="btn min-h-12 border border-ink/15 bg-white px-2 text-ink hover:border-ink/40">Google Pay</button>}
              {settings.payments.paypal && <button type="button" className="btn min-h-12 bg-[#FFC439] px-2 text-[#003087] hover:brightness-95">PayPal</button>}
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              {c.or}
              <span className="h-px flex-1 bg-line" />
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="contact-h" className="space-y-4">
            <h2 id="contact-h" className="headline text-2xl">{c.contact}</h2>
            {field("email", c.email, { type: "email", autoComplete: "email", inputMode: "email" })}
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} className="h-4 w-4 accent-azulejo" />
              {c.emailOptIn}
            </label>
          </section>

          {/* Delivery */}
          <section aria-labelledby="delivery-h" className="space-y-4">
            <h2 id="delivery-h" className="headline text-2xl">{c.delivery}</h2>
            <div>
              <label htmlFor="co-country" className="label">
                {c.country}
              </label>
              <select
                id="co-country"
                autoComplete="country"
                value={country}
                onChange={(e) => {
                  set("country", e.target.value);
                  setCountry(e.target.value);
                }}
                className="field"
              >
                {countries.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.name[locale]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("firstName", c.firstName, { autoComplete: "given-name" })}
              {field("lastName", c.lastName, { autoComplete: "family-name" })}
            </div>
            {field("company", c.company, { autoComplete: "organization" })}
            {field("address1", c.address, { autoComplete: "address-line1", placeholder: c.addressPh })}
            {field("address2", c.address2, { autoComplete: "address-line2" })}
            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
              {field("postal", c.postal, { autoComplete: "postal-code", placeholder: cty.postalExample })}
              {field("city", c.city, { autoComplete: "address-level2" })}
            </div>
            {cty.requiresState && field("state", c.state, { autoComplete: "address-level1" })}
            {field("phone", c.phone, { type: "tel", autoComplete: "tel", inputMode: "tel" })}
            {field("nif", c.nif, { inputMode: "numeric", autoComplete: "off", placeholder: country === "PT" ? "123456789" : "" })}
          </section>

          {/* Shipping method */}
          <section aria-labelledby="ship-h" className="space-y-3">
            <h2 id="ship-h" className="headline text-2xl">{c.shippingMethod}</h2>
            <div role="radiogroup" aria-labelledby="ship-h" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {(["standard", ...(totals.expressAvailable ? ["express"] : [])] as ShippingMethod[]).map((m) => {
                const base = computeTotals({ lines, country, giftWrap: false, discount, method: "standard" }).shipping;
                const cost = m === "express" ? base + EXPRESS_SURCHARGE : base;
                return (
                  <label key={m} className={clsx("flex cursor-pointer items-center gap-3 px-4 py-4", method === m && "bg-azulejo-tint/50")}>
                    <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 accent-azulejo" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">
                        {m === "express" ? (locale === "pt" ? "Expresso (dia útil seguinte)" : "Express (next business day)") : `${totals.zone.carrier}`}
                      </span>
                      <span className="block text-sm text-ink-soft">
                        {m === "express" ? (locale === "pt" ? "Encomendas até às 13h" : "Order before 1pm") : fmt(dict.product.arrives, { from: win.from, to: win.to })}
                      </span>
                    </span>
                    <span className="text-sm font-medium">{cost === 0 ? dict.cart.shippingFree : money(cost)}</span>
                  </label>
                );
              })}
            </div>
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <PackageCheck className="h-4 w-4 text-olive" /> {dict.cart.fragile}
            </p>
          </section>

          {/* Payment */}
          <section aria-labelledby="pay-h" className="space-y-3">
            <h2 id="pay-h" className="headline text-2xl">{c.payment}</h2>
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Lock className="h-4 w-4" /> {c.paymentNote}
            </p>
            <div role="radiogroup" aria-labelledby="pay-h" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {methods.map((m) => (
                <div key={m}>
                  <label className={clsx("flex cursor-pointer items-center gap-3 px-4 py-4", activePayment === m && "bg-azulejo-tint/50")}>
                    <input type="radio" name="payment" checked={activePayment === m} onChange={() => setPayment(m)} className="h-4 w-4 accent-azulejo" />
                    <span className="flex-1 text-sm font-medium">{paymentLabels[m]}</span>
                    {m === "card" && <span className="text-xs text-ink-soft">Visa · Mastercard · Amex</span>}
                  </label>
                  {activePayment === m && (
                    <div className="bg-cream px-4 py-4 text-sm text-ink-soft">
                      {m === "card" && (
                        <div id="payment-element" className="rounded-xl border border-dashed border-line bg-paper px-4 py-5 text-center">
                          <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-azulejo" />
                          {locale === "pt" ? "Os dados do cartão são introduzidos no formulário seguro da Stripe." : "Card details are entered in Stripe’s secure form."}
                        </div>
                      )}
                      {m === "mbway" && field("mbwayPhone", c.mbwayPhone, { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "912 345 678" })}
                      {m === "multibanco" && <p>{c.multibancoNote}</p>}
                      {m === "paypal" && <p>{c.paypalNote}</p>}
                      {m === "klarna" && <p>{c.klarnaNote}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {serverError && (
            <p role="alert" className="rounded-xl bg-coral-tint px-4 py-3 text-sm font-medium text-coral-ink">
              {serverError === "out_of_stock"
                ? locale === "pt" ? "Uma das peças acabou de esgotar. Atualize o carrinho." : "One of your pieces just sold out. Please update your cart."
                : locale === "pt" ? "Não foi possível concluir a encomenda. Tente novamente." : "We couldn’t place your order. Please try again."}
            </p>
          )}

          <div className="space-y-4">
            <button type="submit" disabled={processing} className="btn-primary w-full py-4 text-base">
              {processing ? c.processing : fmt(c.pay, { amount: money(totals.total) })}
            </button>
            <p className="rounded-xl bg-mustard-tint px-4 py-2.5 text-center text-xs text-ink">{c.testMode}</p>
            <ul className="grid grid-cols-3 gap-2 text-center text-xs text-ink-soft">
              <li className="flex flex-col items-center gap-1.5"><Lock className="h-4 w-4 text-azulejo" />{c.trust1}</li>
              <li className="flex flex-col items-center gap-1.5"><RotateCcw className="h-4 w-4 text-azulejo" />{c.trust2}</li>
              <li className="flex flex-col items-center gap-1.5"><PackageCheck className="h-4 w-4 text-azulejo" />{c.trust3}</li>
            </ul>
            <p className="text-center text-xs text-ink-soft">
              <Link href={href(locale, "/legal/terms")} className="link">{dict.footer.terms}</Link> ·{" "}
              <Link href={href(locale, "/shipping-returns")} className="link">{dict.footer.shipping}</Link> ·{" "}
              <Link href={href(locale, "/legal/privacy")} className="link">{dict.footer.privacy}</Link>
            </p>
          </div>
        </div>
      </form>

      {/* Desktop summary */}
      <aside aria-label={c.summary} className="hidden border-l border-line bg-paper lg:block">
        <div className="sticky top-0 max-w-md px-10 py-12">
          <h2 className="sr-only">{c.summary}</h2>
          {summary}
        </div>
      </aside>
    </div>
  );
}
