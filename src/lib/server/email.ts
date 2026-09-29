import "server-only";
import { store } from "../config";
import type { L } from "../types";

export type Template = { subject: L; intro: L };
const pick = (l: L, locale: string) => (locale === "pt" ? l.pt || l.en : l.en);
const fill = (t: string, number: string) => t.replace(/\{number\}/g, number);

export type EmailResult = { sent: boolean; reason?: string };

const FROM = process.env.EMAIL_FROM ?? `${store.name} <hello@terracollective.pt>`;

/** Sends through Resend when RESEND_API_KEY is set; otherwise logs and reports not sent. */
export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[dev:email] to=${to} subject=${subject}`);
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.ok ? { sent: true } : { sent: false, reason: `Resend ${res.status}` };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded wrapper: cream background, navy text, azulejo accent. */
export function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FAF7F2;font-family:Helvetica,Arial,sans-serif;color:#1C2A3A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px">
<tr><td style="padding:32px 32px 8px;font-family:Georgia,serif;font-size:22px">Terra <i>Collective</i></td></tr>
<tr><td style="padding:8px 32px 0;font-family:Georgia,serif;font-size:28px;line-height:1.2">${esc(title)}</td></tr>
<tr><td style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:#4A5868">${body}</td></tr>
</table>
<p style="font-size:12px;color:#4A5868;margin-top:16px">${esc(store.name)} · Handmade in Portugal</p>
</td></tr></table></body></html>`;
}

const trackingUrl = (carrier: string, n: string) =>
  /ctt/i.test(carrier)
    ? `https://www.ctt.pt/feapl_2/app/open/objectSearch/objectSearch.jspx?objects=${encodeURIComponent(n)}`
    : /dhl/i.test(carrier)
      ? `https://www.dhl.com/pt-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`
      : null;

export function shippedEmail(o: { number: string; name: string; locale: string; carrier: string; tracking: string }, tpl?: Template) {
  const pt = o.locale === "pt";
  const url = trackingUrl(o.carrier, o.tracking);
  const link = url
    ? `<p style="margin:24px 0"><a href="${url}" style="background:#1C2A3A;color:#FAF7F2;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${pt ? "Seguir encomenda" : "Track your parcel"}</a></p>`
    : "";
  return {
    subject: tpl ? fill(pick(tpl.subject, o.locale), o.number) : pt ? `A sua encomenda ${o.number} já seguiu` : `Your order ${o.number} is on its way`,
    html: layout(
      pt ? `Já vai a caminho, ${o.name}!` : `It’s on its way, ${o.name}!`,
      `<p>${tpl ? esc(pick(tpl.intro, o.locale)) : pt ? "Embalámos as suas peças com todo o cuidado." : "We’ve packed your pieces with care."}</p>
       <p>${pt ? "Transportadora" : "Carrier"}: <b>${esc(o.carrier)}</b></p>
       <p>${pt ? "Número de seguimento" : "Tracking number"}: <b>${esc(o.tracking)}</b></p>${link}
       <p>${pt ? "Obrigado por apoiar o feito à mão." : "Thank you for supporting handmade."}</p>`,
    ),
  };
}

export function refundEmail(o: { number: string; name: string; locale: string; amount: string }, tpl?: Template) {
  const pt = o.locale === "pt";
  return {
    subject: tpl ? fill(pick(tpl.subject, o.locale), o.number) : pt ? `Reembolso da encomenda ${o.number}` : `Refund for order ${o.number}`,
    html: layout(
      pt ? "Reembolso processado" : "Your refund is on its way",
      `<p>${pt ? `Olá ${esc(o.name)}, processámos um reembolso de` : `Hi ${esc(o.name)}, we’ve processed a refund of`} <b>${esc(o.amount)}</b>.</p>
       <p>${tpl ? esc(pick(tpl.intro, o.locale)) : pt ? "Pode demorar 5–10 dias úteis a aparecer na sua conta." : "It can take 5–10 business days to appear on your statement."}</p>`,
    ),
  };
}
