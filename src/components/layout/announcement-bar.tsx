"use client";

import { usePathname } from "next/navigation";
import { usePrefs } from "../providers";
import { CurrencySelect, LocaleSwitch } from "./switchers";

export function AnnouncementBar() {
  const { settings, locale } = usePrefs();
  if (/^\/(en|pt)\/checkout/.test(usePathname())) return null;
  return (
    <div className="bg-azulejo text-white">
      <div className="container-x flex h-9 items-center justify-center text-[0.8rem] font-medium md:justify-between">
        <span className="hidden w-40 md:block" />
        <p className="truncate text-center">{settings.announcement[locale] || settings.announcement.en}</p>
        <div className="hidden w-40 items-center justify-end gap-1 md:flex [&_a]:text-white/80 [&_a:hover]:text-white [&_a[aria-current]]:bg-white/15 [&_a[aria-current]]:text-white [&_select]:text-white [&_option]:text-ink">
          <LocaleSwitch />
          <span aria-hidden className="h-3 w-px bg-white/30" />
          <CurrencySelect />
        </div>
      </div>
    </div>
  );
}
