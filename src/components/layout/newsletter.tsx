"use client";

import { useState } from "react";
import clsx from "clsx";
import { store } from "@/lib/config";
import { fmt } from "@/lib/i18n";
import { usePrefs } from "../providers";

export function NewsletterForm({ tone = "light", source = "footer" }: { tone?: "light" | "dark"; source?: string }) {
  const { dict, locale } = usePrefs();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, locale, source }),
    });
    if (!res.ok) return setState("error");
    const data = await res.json();
    setCode(data.code);
    setState("done");
  }

  if (state === "done")
    return (
      <p role="status" className={clsx("rounded-2xl px-5 py-4 text-sm font-medium", tone === "dark" ? "bg-white/10" : "bg-azulejo-tint text-ink")}>
        {fmt(dict.newsletter.success, { code })}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className="flex gap-2">
        <label htmlFor={`nl-${source}`} className="sr-only">
          {dict.newsletter.placeholder}
        </label>
        <input
          id={`nl-${source}`}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          aria-invalid={state === "error"}
          aria-describedby={state === "error" ? `nl-${source}-err` : undefined}
          placeholder={dict.newsletter.placeholder}
          className={clsx("field rounded-full", tone === "dark" && "border-white/20 bg-white/10 text-white placeholder:text-white/60")}
        />
        <button type="submit" disabled={state === "loading"} className={tone === "dark" ? "btn bg-cream text-ink hover:bg-white" : "btn-primary"}>
          {dict.newsletter.cta}
        </button>
      </div>
      {state === "error" && (
        <p id={`nl-${source}-err`} className={clsx("mt-2 text-sm", tone === "dark" ? "text-rose" : "text-coral-ink")}>
          {dict.newsletter.invalid}
        </p>
      )}
      <p className={clsx("mt-3 text-xs", tone === "dark" ? "text-white/70" : "text-ink-soft")}>{dict.newsletter.consent}</p>
    </form>
  );
}

export const newsletterPercent = store.newsletterDiscountPercent;
