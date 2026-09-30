import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AbTest } from "../home-layout";

export type VariantStats = { visitors: number; carts: number; checkouts: number; orders: number; revenue: number };
export type AbResults = {
  a: VariantStats;
  b: VariantStats;
  /** Probability-style confidence (0–1) that the conversion difference is real, from a two-proportion z-test. */
  confidence: number;
  leader: "a" | "b" | null;
  lift: number; // relative conversion difference of the leader vs the other
  verdict: "too-early" | "no-difference" | "leaning" | "winner";
  neededPerVariant: number; // rough visitors needed per variant to detect the current difference
};

// Standard normal CDF (Abramowitz–Stegun approximation).
function phi(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export async function getAbResults(sb: SupabaseClient, test: AbTest): Promise<AbResults> {
  const { data } = await sb
    .from("analytics_events")
    .select("name, props")
    .in("name", ["ab_exposure", "add_to_cart", "begin_checkout", "purchase"])
    .like("props->>ab", `${test.id}:%`)
    .gte("created_at", test.startedAt)
    .lte("created_at", test.stoppedAt ?? new Date().toISOString())
    .limit(100_000);

  const sets = { a: { v: new Set<string>(), c: new Set<string>(), k: new Set<string>(), o: new Set<string>() }, b: { v: new Set<string>(), c: new Set<string>(), k: new Set<string>(), o: new Set<string>() } };
  const revenue = { a: 0, b: 0 };
  for (const e of (data ?? []) as { name: string; props: Record<string, unknown> }[]) {
    const variant = String(e.props.ab ?? "").split(":")[1] as "a" | "b";
    const sid = String(e.props.sid ?? "");
    if ((variant !== "a" && variant !== "b") || !sid) continue;
    const s = sets[variant];
    s.v.add(sid); // any tracked event implies the session saw the variant
    if (e.name === "add_to_cart") s.c.add(sid);
    if (e.name === "begin_checkout") s.k.add(sid);
    if (e.name === "purchase") {
      s.o.add(sid);
      revenue[variant] += Number(e.props.value) || 0;
    }
  }
  const stats = (k: "a" | "b"): VariantStats => ({ visitors: sets[k].v.size, carts: sets[k].c.size, checkouts: sets[k].k.size, orders: sets[k].o.size, revenue: revenue[k] });
  const a = stats("a");
  const b = stats("b");

  const pa = a.visitors ? a.orders / a.visitors : 0;
  const pb = b.visitors ? b.orders / b.visitors : 0;
  const pooled = a.visitors + b.visitors ? (a.orders + b.orders) / (a.visitors + b.visitors) : 0;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(1, a.visitors) + 1 / Math.max(1, b.visitors)));
  const z = se ? (pb - pa) / se : 0;
  const confidence = se ? 1 - 2 * (1 - phi(Math.abs(z))) : 0;
  const leader = pa === pb ? null : pb > pa ? "b" : "a";
  const lo = Math.min(pa, pb);
  const lift = leader && lo ? Math.abs(pb - pa) / lo : 0;

  // Visitors per variant for 95% confidence / 80% power at the observed rates (floor at a 20% relative lift).
  const base = Math.max(pooled, 0.005);
  const delta = Math.max(Math.abs(pb - pa), base * 0.2);
  const neededPerVariant = Math.ceil((2 * (1.96 + 0.84) ** 2 * base * (1 - base)) / (delta * delta));

  const minVisitors = Math.min(a.visitors, b.visitors);
  const verdict: AbResults["verdict"] =
    minVisitors < 100 || a.orders + b.orders < 10 ? "too-early" : confidence >= 0.95 ? "winner" : confidence >= 0.8 ? "leaning" : "no-difference";
  return { a, b, confidence, leader, lift, verdict, neededPerVariant };
}
