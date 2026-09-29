"use client";

import { useState } from "react";
import { countries } from "@/lib/geo";
import { usePrefs } from "../providers";

export function EnquiryForm({ kind }: { kind: "contact" | "wholesale" }) {
  const { dict, locale, country } = usePrefs();
  const f = dict.forms;
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [type, setType] = useState<"wholesale" | "custom" | "contact">(kind === "wholesale" ? "wholesale" : "contact");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setState("sending");
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, kind: type }) });
    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent")
    return (
      <p role="status" className="rounded-[var(--radius-card)] bg-olive-tint px-6 py-8 text-lg font-medium">
        {f.sent}
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      {kind === "wholesale" && (
        <fieldset>
          <legend className="label">{f.type}</legend>
          <div className="flex flex-wrap gap-2">
            {(["wholesale", "custom"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className="chip">
                {f[t]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className="label">{f.name}</label>
          <input id="enq-name" name="name" required autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="enq-email" className="label">{f.email}</label>
          <input id="enq-email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
      </div>
      {kind === "wholesale" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="enq-company" className="label">{f.company}</label>
              <input id="enq-company" name="company" required autoComplete="organization" className="field" />
            </div>
            <div>
              <label htmlFor="enq-web" className="label">{f.website}</label>
              <input id="enq-web" name="website" autoComplete="url" className="field" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="enq-country" className="label">{f.country}</label>
              <select id="enq-country" name="country" defaultValue={country} className="field">
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name[locale]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="enq-qty" className="label">{f.quantity}</label>
              <input id="enq-qty" name="quantity" inputMode="numeric" className="field" />
            </div>
          </div>
        </>
      )}
      <div>
        <label htmlFor="enq-msg" className="label">{f.message}</label>
        <textarea id="enq-msg" name="message" required rows={6} className="field" />
      </div>
      {state === "error" && <p role="alert" className="text-sm text-coral-ink">{dict.checkout.invalidEmail}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary">
        {state === "sending" ? dict.common.loading : f.send}
      </button>
    </form>
  );
}
