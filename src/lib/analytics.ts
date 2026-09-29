/**
 * Privacy-friendly first-party analytics. Events are only sent after the
 * shopper accepts analytics cookies; no third-party trackers, no fingerprinting.
 * Events land in the `analytics_events` table and power the per-product stats
 * and funnel in /admin/analytics.
 */
export type EventName =
  | "page_view"
  | "product_view"
  | "wishlist_add"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "newsletter_signup";

/** Anonymous per-tab session id (no cookie, no personal data) so the funnel can count visits. */
function sessionId() {
  try {
    let id = sessionStorage.getItem("tc_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("tc_sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(name: EventName, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!/(?:^|; )tc_consent=all/.test(document.cookie)) return;
  props = { ...props, sid: sessionId() };
  const url = new URL(window.location.href);
  const payload = JSON.stringify({
    name,
    props,
    path: url.pathname,
    referrer: document.referrer || null,
    utm: Object.fromEntries([...url.searchParams].filter(([k]) => k.startsWith("utm_"))),
    ts: Date.now(),
  });
  navigator.sendBeacon?.("/api/events", new Blob([payload], { type: "application/json" }));
}
