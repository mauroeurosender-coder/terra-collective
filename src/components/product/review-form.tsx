"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";
import { usePrefs } from "../providers";

export function ReviewForm({ slug }: { slug: string }) {
  const { locale, country } = usePrefs();
  const pt = locale === "pt";
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  if (state === "done")
    return <p role="status" className="rounded-2xl bg-olive-tint px-4 py-3 text-sm font-medium">{pt ? "Obrigado! A sua opinião aparece depois de a revermos." : "Thank you! Your review will appear once we’ve checked it."}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn-outline">{pt ? "Escrever uma opinião" : "Write a review"}</button>;
  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-cream p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setState("error");
        setState("sending");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        const res = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, rating, slug, country }) });
        setState(res.ok ? "done" : "error");
      }}
    >
      <fieldset>
        <legend className="label">{pt ? "Classificação" : "Rating"}</legend>
        <div role="radiogroup" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} / 5`} onClick={() => setRating(n)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
              <Star className={clsx("h-6 w-6", n <= rating ? "fill-mustard stroke-mustard" : "stroke-ink/30")} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="rv-name" className="label">{pt ? "Nome" : "Name"}</label><input id="rv-name" name="name" required maxLength={60} className="field" /></div>
        <div><label htmlFor="rv-email" className="label">Email <span className="font-normal text-ink-soft">({pt ? "não é publicado" : "not published"})</span></label><input id="rv-email" name="email" type="email" required className="field" /></div>
      </div>
      <div><label htmlFor="rv-title" className="label">{pt ? "Título" : "Title"}</label><input id="rv-title" name="title" maxLength={120} className="field" /></div>
      <div><label htmlFor="rv-body" className="label">{pt ? "A sua opinião" : "Your review"}</label><textarea id="rv-body" name="body" required rows={4} maxLength={2000} className="field" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p role="alert" className="text-sm text-coral-ink">{pt ? "Escolha uma classificação e preencha os campos." : "Pick a rating and fill in the fields."}</p>}
      <button disabled={state === "sending"} className="btn-primary">{pt ? "Enviar" : "Submit review"}</button>
    </form>
  );
}
