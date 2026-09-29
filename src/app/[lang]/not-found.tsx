"use client";

import Link from "next/link";
import { href } from "@/lib/i18n";
import { usePrefs } from "@/components/providers";
import { SardineLine } from "@/components/illustrations";

export default function NotFound() {
  const { dict, locale } = usePrefs();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <SardineLine className="h-20 w-52 -rotate-12 text-azulejo" strokeWidth={1.1} />
      <h1 className="headline mt-8 text-5xl">{dict.common.notFound}</h1>
      <p className="mt-3 text-lg text-ink-soft">{dict.common.notFoundBody}</p>
      <div className="mt-8 flex gap-3">
        <Link href={href(locale)} className="btn-primary">{dict.common.backHome}</Link>
        <Link href={href(locale, "/shop")} className="btn-outline">{dict.nav.shopAll}</Link>
      </div>
    </div>
  );
}
