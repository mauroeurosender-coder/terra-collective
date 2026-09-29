"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Records a page view on every route change (only after analytics consent). */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view");
    const onConsent = (e: Event) => (e as CustomEvent).detail === "all" && track("page_view");
    window.addEventListener("tc:consent", onConsent);
    return () => window.removeEventListener("tc:consent", onConsent);
  }, [pathname]);
  return null;
}
