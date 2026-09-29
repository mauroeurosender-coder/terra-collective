"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Records site searches (with zero-result flag) for the admin "top searches" report. */
export function SearchTracker({ q, count }: { q: string; count: number }) {
  useEffect(() => {
    track("search", { q: q.toLowerCase(), results: count });
  }, [q, count]);
  return null;
}
