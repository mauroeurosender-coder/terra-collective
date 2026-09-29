"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { href } from "@/lib/i18n";
import { usePrefs } from "../providers";

const KEY = "tc_consent";
export type Consent = "all" | "essential";

export function getConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )tc_consent=(all|essential)/);
  return (m?.[1] as Consent) ?? null;
}

/** GDPR banner. Analytics only load after "all" (see lib/analytics). */
export function CookieBanner() {
  const { dict, locale } = usePrefs();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Read the cookie after mount so SSR and first client render match.
    const id = requestAnimationFrame(() => setShow(getConsent() === null));
    const reopen = () => setShow(true);
    window.addEventListener("tc:cookie-settings", reopen);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("tc:cookie-settings", reopen);
    };
  }, []);

  const choose = (c: Consent) => {
    document.cookie = `${KEY}=${c}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    window.dispatchEvent(new CustomEvent("tc:consent", { detail: c }));
    setShow(false);
  };

  if (!show) return null;
  return (
    <div
      role="region"
      aria-label={dict.cookie.title}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-paper p-5 shadow-[var(--shadow-lift)] animate-fade-up sm:inset-x-auto sm:left-5 sm:bottom-5"
    >
      <p className="font-semibold">{dict.cookie.title}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {dict.cookie.body}{" "}
        <Link href={href(locale, "/legal/cookies")} className="link">
          {dict.footer.cookies}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary min-h-11 flex-1 py-2.5" onClick={() => choose("all")}>
          {dict.cookie.accept}
        </button>
        <button type="button" className="btn-outline min-h-11 flex-1 py-2.5" onClick={() => choose("essential")}>
          {dict.cookie.reject}
        </button>
      </div>
    </div>
  );
}
