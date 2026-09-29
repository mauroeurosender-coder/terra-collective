"use client";

import { useEffect, useState } from "react";
import { Download, Package, Trash2 } from "lucide-react";
import { usePrefs } from "../providers";
import { SardineLine } from "../illustrations";

/**
 * Passwordless sign-in (Supabase magic link). Once signed in, customers see
 * their orders and can export or delete their data (GDPR arts. 15, 17, 20).
 */
export function AccountView() {
  const { dict, locale } = usePrefs();
  const a = dict.account;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    // Prefill from the order just placed (kept in sessionStorage, never in the URL).
    const raw = sessionStorage.getItem("tc_last_order");
    const id = requestAnimationFrame(() => raw && setEmail(JSON.parse(raw).email ?? ""));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="container-x grid gap-12 pt-10 md:grid-cols-2 md:gap-20 md:pt-16">
      <div>
        <h1 className="headline text-5xl md:text-6xl">{a.title}</h1>
        <div className="mt-10 rounded-[var(--radius-card)] bg-paper p-6 md:p-8">
          <h2 className="text-xl font-semibold">{a.signIn}</h2>
          <p className="mt-1 mb-5 text-ink-soft">{a.body}</p>
          {state === "sent" ? (
            <p role="status" className="rounded-xl bg-olive-tint px-4 py-3 font-medium">{a.sent}</p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setState("sending");
                const res = await fetch("/api/auth/magic-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale }) });
                setState(res.ok ? "sent" : "error");
              }}
            >
              <label htmlFor="acc-email" className="sr-only">{dict.forms.email}</label>
              <input id="acc-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field rounded-full" aria-invalid={state === "error"} />
              <button type="submit" disabled={state === "sending"} className="btn-primary">{a.send}</button>
            </form>
          )}
          {state === "error" && <p className="mt-2 text-sm text-coral-ink">{dict.checkout.invalidEmail}</p>}
        </div>
      </div>
      <div className="space-y-4 md:pt-24">
        {[
          { icon: Package, title: a.orders, body: locale === "pt" ? "Acompanhe encomendas, descarregue faturas e volte a encomendar." : "Track orders, download invoices and reorder favourites." },
          { icon: Download, title: a.export, body: locale === "pt" ? "Receba uma cópia de todos os seus dados em JSON." : "Get a copy of all your data as JSON." },
          { icon: Trash2, title: a.delete, body: locale === "pt" ? "Apagamos a conta e anonimizamos encomendas (as faturas são guardadas 10 anos por lei)." : "We delete your account and anonymise orders (invoices are kept 10 years by law)." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-line p-5">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-azulejo" />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
        <SardineLine className="h-8 w-20 text-azulejo/50" />
      </div>
    </div>
  );
}
