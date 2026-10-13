import "server-only";
import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiting for the public endpoints (one Hostinger server, so memory is shared
 * by all requests). Counts per bucket + visitor IP, and optionally per email too.
 */

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

export function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}

/** true = allowed. `max` requests per `windowSec` for this key. */
export function allow(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const since = now - windowSec * 1000;
  if (now - lastSweep > 60_000) {
    // Drop idle keys so memory stays small.
    for (const [k, v] of hits) if (!v.length || v[v.length - 1] < now - 3_600_000) hits.delete(k);
    lastSweep = now;
  }
  const list = (hits.get(key) ?? []).filter((t) => t > since);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}

/** Returns a 429 response when the visitor (and, if given, the email) is over the limit; otherwise null. */
export function limited(req: Request, bucket: string, max: number, windowSec: number, email?: unknown) {
  const ipOk = allow(`${bucket}:ip:${clientIp(req)}`, max, windowSec);
  const emailOk = typeof email === "string" && email ? allow(`${bucket}:email:${email.trim().toLowerCase()}`, Math.max(2, Math.ceil(max / 2)), windowSec) : true;
  if (ipOk && emailOk) return null;
  return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: { "retry-after": String(windowSec) } });
}
