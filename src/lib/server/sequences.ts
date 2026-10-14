import "server-only";
import { createHmac } from "node:crypto";
import { store } from "../config";
import { supabaseService } from "../supabase/server";
import { mergeSequences, type EmailSequences, type SequenceKey, type SequenceStep } from "../email-sequences";
import { layout, sendEmail } from "./email";

/*
 * Runs every 15 minutes (pg_cron → /api/cron/abandoned-carts). For each sequence it finds
 * people whose next step is due, sends at most one email per person per run, and logs it in
 * email_sends so nothing goes out twice. Steps missed by more than MAX_LATE_H are skipped,
 * so connecting an email service later never sends a backlog of stale emails.
 */

const H = 3_600_000;
const MAX_LATE_H = 72;

type Candidate = {
  sequence: SequenceKey;
  ref: string;
  email: string;
  locale: "en" | "pt";
  trigger: number; // ms
  consent: boolean; // agreed to marketing emails
  vars: Record<string, string>;
  items: string[];
  links: string[]; // one per step (last one reused)
  onSent?: () => PromiseLike<unknown>;
};

export type DueEmail = { sequence: SequenceKey; step: number; email: string; dueAt: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const secret = () => process.env.EMAIL_SIGNING_SECRET ?? process.env.CRON_SECRET ?? "dev";
export const unsubscribeToken = (email: string) => createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("base64url").slice(0, 24);
export const unsubscribeUrl = (email: string) => `${store.url}/api/email/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;

/** Subject + branded HTML for one step. */
export function renderStep(step: SequenceStep, locale: "en" | "pt", vars: Record<string, string>, items: string[], link: string, email: string) {
  const pick = (l: { en: string; pt: string }) => (locale === "pt" ? l.pt || l.en : l.en);
  const fill = (t: string, html: boolean) =>
    t.replace(/\{(first_name|code|product|order_number|items)\}/g, (_, k: string) => {
      if (k === "code") return html ? `<b style="letter-spacing:1px;color:#1C2A3A">${esc(step.code ?? "")}</b>` : step.code ?? "";
      if (k === "items") return html ? `<ul style="padding-left:18px;margin:0">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : items.join(", ");
      const v = vars[k] ?? "";
      return html ? esc(v) : v;
    });
  const subject = fill(pick(step.subject), false).replace(/\s+/g, " ").trim();
  const paragraphs = pick(step.body)
    .split(/\n\s*\n/)
    .map((p) => (p.trim() === "{items}" ? fill(p.trim(), true) : `<p style="margin:0 0 14px">${fill(esc(p.trim()).replace(/\n/g, "<br>"), true)}</p>`))
    .join("");
  const unsub = locale === "pt" ? "Não quer receber estes emails?" : "Don’t want these emails?";
  const body = `${paragraphs}
<p style="margin:24px 0"><a href="${esc(link)}" style="background:#1C2A3A;color:#FAF7F2;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(fill(pick(step.button), false))}</a></p>
<p style="margin-top:28px;font-size:12px;color:#8A96A3">${unsub} <a href="${esc(unsubscribeUrl(email))}" style="color:#8A96A3">${locale === "pt" ? "Cancelar subscrição" : "Unsubscribe"}</a></p>`;
  return { subject, html: layout(fill(pick(step.heading), false), body) };
}

export async function loadSequences(): Promise<EmailSequences> {
  const { data } = await supabaseService().from("settings").select("value").eq("key", "email_sequences").maybeSingle();
  return mergeSequences(data?.value);
}

async function candidates(now: number): Promise<Candidate[]> {
  const sb = supabaseService();
  const url = (locale: string, path = "") => `${store.url}/${locale}${path}`;
  const loc = (l: string | null | undefined): "en" | "pt" => (l === "pt" ? "pt" : "en");
  const out: Candidate[] = [];
  const since = (days: number) => new Date(now - days * 24 * H).toISOString();

  const [{ data: subs }, { data: customers }] = await Promise.all([
    sb.from("newsletter_subscribers").select("id, email, locale, consent_at").is("unsubscribed_at", null),
    sb.from("customers").select("id, email, first_name, newsletter"),
  ]);
  const subscribed = new Set((subs ?? []).map((x) => x.email.toLowerCase()));
  const byEmail = new Map((customers ?? []).map((c) => [c.email.toLowerCase(), c]));
  const consents = (email: string) => subscribed.has(email.toLowerCase()) || !!byEmail.get(email.toLowerCase())?.newsletter;

  // Abandoned carts (last 10 days, not recovered, no order from that email since)
  const { data: carts } = await sb.from("carts").select("id, email, lines, locale, token, updated_at").is("recovered_order_id", null).not("email", "is", null).gt("updated_at", since(10)).lt("updated_at", new Date(now - H / 2).toISOString());
  const { data: recentOrders } = await sb.from("orders").select("id, email, created_at, customer_id, locale, number, shipping_address, source, status, test, order_items(name, quantity, products(slug))").in("source", ["web", "manual"]).eq("test", false).gt("created_at", since(200));
  const orderedAfter = (email: string, t: number) => (recentOrders ?? []).some((o) => o.email?.toLowerCase() === email.toLowerCase() && new Date(o.created_at).getTime() >= t);
  for (const c of carts ?? []) {
    const t = new Date(c.updated_at).getTime();
    if (!c.lines?.length || orderedAfter(c.email, t)) continue;
    const l = loc(c.locale);
    out.push({
      sequence: "cart", ref: c.id, email: c.email, locale: l, trigger: t, consent: consents(c.email),
      vars: { first_name: byEmail.get(c.email.toLowerCase())?.first_name ?? (l === "pt" ? "" : "there") },
      items: (c.lines as { name: { en: string; pt: string }; quantity: number }[]).map((x) => `${x.quantity} × ${l === "pt" ? x.name.pt || x.name.en : x.name.en}`),
      links: [url(l, `/checkout?restore=${encodeURIComponent(c.token ?? "")}`)],
    });
  }

  // Welcome series (subscribers who joined in the last 10 days)
  for (const sub of subs ?? []) {
    const t = new Date(sub.consent_at).getTime();
    if (t < now - 10 * 24 * H) continue;
    const l = loc(sub.locale);
    out.push({ sequence: "welcome", ref: sub.id, email: sub.email, locale: l, trigger: t, consent: true, vars: { first_name: byEmail.get(sub.email.toLowerCase())?.first_name ?? "" }, items: [], links: [url(l, "/shop"), url(l, "/our-story"), url(l, "/shop")] });
  }

  // After purchase (website orders of the last 35 days)
  const live = (recentOrders ?? []).filter((o) => ["paid", "packing", "shipped", "delivered"].includes(o.status));
  for (const o of live) {
    const t = new Date(o.created_at).getTime();
    if (t < now - 35 * 24 * H || !o.email) continue;
    const l = loc(o.locale);
    const its = (o.order_items ?? []) as unknown as { name: string; quantity: number; products: { slug: string } | null }[];
    const first = its.find((i) => i.products?.slug);
    const productUrl = first ? url(l, `/products/${first.products!.slug}`) : url(l, "/shop");
    out.push({
      sequence: "post_purchase", ref: o.id, email: o.email, locale: l, trigger: t, consent: consents(o.email),
      vars: { first_name: (o.shipping_address as { firstName?: string } | null)?.firstName ?? "", order_number: o.number, product: first?.name ?? its[0]?.name ?? "" },
      items: its.map((i) => `${i.quantity} × ${i.name}`),
      links: [url(l, "/account"), `${productUrl}#reviews`, productUrl],
    });
  }

  // Win-back: last website order per customer (who accepted marketing)
  const last = new Map<string, (typeof live)[number]>();
  for (const o of live) {
    const k = o.email?.toLowerCase();
    if (k && (!last.has(k) || new Date(o.created_at) > new Date(last.get(k)!.created_at))) last.set(k, o);
  }
  for (const [email, o] of last) {
    const l = loc(o.locale);
    out.push({ sequence: "winback", ref: `${email}:${o.id}`, email: o.email!, locale: l, trigger: new Date(o.created_at).getTime(), consent: consents(email), vars: { first_name: (o.shipping_address as { firstName?: string } | null)?.firstName ?? "" }, items: [], links: [url(l, "/shop?sort=newest")] });
  }

  // Back in stock: requests whose variant has stock again
  const { data: reqs } = await sb.from("back_in_stock_requests").select("id, email, locale, created_at, variants!inner(stock, products(slug, name))").is("notified_at", null).gt("variants.stock", 0);
  for (const r of (reqs ?? []) as unknown as { id: string; email: string; locale: string; variants: { products: { slug: string; name: { en: string; pt: string } } | null } }[]) {
    const l = loc(r.locale);
    const p = r.variants.products;
    out.push({
      sequence: "back_in_stock", ref: r.id, email: r.email, locale: l, trigger: now, consent: true,
      vars: { product: p ? (l === "pt" ? p.name.pt || p.name.en : p.name.en) : "" }, items: [], links: [p ? url(l, `/products/${p.slug}`) : url(l, "/shop")],
      onSent: () => sb.from("back_in_stock_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id),
    });
  }
  return out;
}

/**
 * send=false: only report what is due (used by the admin and when no email service is set up).
 * Returns the due list and how many were sent.
 */
export async function runSequences({ send }: { send: boolean }) {
  const now = Date.now();
  const sb = supabaseService();
  const seqs = await loadSequences();
  const canSend = send && Boolean(process.env.RESEND_API_KEY);
  const [cands, { data: logged }, { data: suppressed }] = await Promise.all([
    candidates(now),
    sb.from("email_sends").select("sequence, step, ref").gt("created_at", new Date(now - 220 * 24 * H).toISOString()),
    sb.from("email_suppressions").select("email"),
  ]);
  const done = new Set((logged ?? []).map((x) => `${x.sequence}|${x.step}|${x.ref}`));
  const blocked = new Set((suppressed ?? []).map((x) => x.email.toLowerCase()));
  const due: DueEmail[] = [];
  let sent = 0;
  const log = (c: Candidate, step: number, status: string, detail?: string) =>
    sb.from("email_sends").upsert({ sequence: c.sequence, step, ref: c.ref, email: c.email, status, detail: detail ?? null }, { onConflict: "sequence,step,ref", ignoreDuplicates: true });

  for (const c of cands) {
    const seq = seqs[c.sequence];
    if (!seq.enabled || blocked.has(c.email.toLowerCase())) continue;
    // Latest step that is due and not yet handled; older unhandled due steps are skipped.
    const open = seq.steps.map((st, i) => ({ st, i, at: c.trigger + st.delayHours * H })).filter((x) => x.at <= now && !done.has(`${c.sequence}|${x.i}|${c.ref}`));
    if (!open.length) continue;
    const pick = open[open.length - 1];
    if (now - pick.at > MAX_LATE_H * H) continue; // too old: never send stale emails
    if (pick.st.marketing && !c.consent) {
      if (canSend) await log(c, pick.i, "skipped", "no marketing consent");
      continue;
    }
    due.push({ sequence: c.sequence, step: pick.i, email: c.email, dueAt: new Date(pick.at).toISOString() });
    if (!canSend) continue;
    for (const older of open.slice(0, -1)) await log(c, older.i, "skipped", "superseded by a later step");
    const { subject, html } = renderStep(pick.st, c.locale, c.vars, c.items, c.links[Math.min(pick.i, c.links.length - 1)], c.email);
    const r = await sendEmail(c.email, subject, html);
    await log(c, pick.i, r.sent ? "sent" : "failed", r.reason);
    if (r.sent) {
      sent++;
      await c.onSent?.();
    }
  }
  return { due, sent, emailConnected: Boolean(process.env.RESEND_API_KEY) };
}

/** Sample preview for the admin editor. */
export function previewStep(step: SequenceStep, locale: "en" | "pt") {
  const items = locale === "pt" ? ["1 × Conjunto de 6 Sardinhas de Cerâmica", "1 × Baralho de Cartas Sardinha"] : ["1 × Set of 6 Ceramic Sardines", "1 × Sardine Tin Playing Cards"];
  return renderStep(step, locale, { first_name: "Maria", product: locale === "pt" ? "Conjunto de 6 Sardinhas" : "Set of 6 Ceramic Sardines", order_number: "TC-1042" }, items, store.url, "preview@example.com");
}
