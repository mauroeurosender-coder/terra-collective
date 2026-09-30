"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Remembers which homepage design this session saw (so later add-to-cart,
 * checkout and purchase events are attributed to it) and records one exposure.
 */
export function AbExposure({ test, variant }: { test: string; variant: "a" | "b" }) {
  useEffect(() => {
    const value = `${test}:${variant}`;
    try {
      if (sessionStorage.getItem("tc_ab") === value) return;
      sessionStorage.setItem("tc_ab", value);
    } catch {}
    track("ab_exposure", { test, variant });
  }, [test, variant]);
  return null;
}
