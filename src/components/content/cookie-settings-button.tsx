"use client";

import { usePrefs } from "../providers";

export function CookieSettingsButton() {
  const { dict } = usePrefs();
  return (
    <button type="button" className="btn-outline mt-4" onClick={() => window.dispatchEvent(new Event("tc:cookie-settings"))}>
      {dict.cookie.settings}
    </button>
  );
}
