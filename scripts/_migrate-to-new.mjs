// One-off: copy all data from the old Supabase project to the new one.
import { readFileSync } from "node:fs";
const parse = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const oldEnv = parse(".env.local");
const nk = parse(`${process.env.HOME}/Desktop/terra-supabase.txt`);
const OLD = { url: oldEnv.NEXT_PUBLIC_SUPABASE_URL, key: oldEnv.SUPABASE_SERVICE_ROLE_KEY };
const NEW = { url: "https://tdwmieejwzysfnpxtvah.supabase.co", key: nk.SERVICE };
const h = (p, extra = {}) => ({ apikey: p.key, authorization: `Bearer ${p.key}`, "content-type": "application/json", ...extra });

const mode = process.argv[2] ?? "check";
const tables = [
  ["collections", "id"], ["products", "id"], ["product_media", "id"], ["variants", "id"], ["journal_posts", "id"], ["pages", "slug"], ["settings", "key"],
  ["discounts", "id"], ["customers", "id"], ["orders", "id"], ["order_items", "id"], ["order_events", "id"], ["reviews", "id"], ["gift_cards", "id"],
  ["newsletter_subscribers", "id"], ["back_in_stock_requests", "id"], ["carts", "id"], ["enquiries", "id"], ["analytics_events", "id"],
];
async function count(p, t) {
  const r = await fetch(`${p.url}/rest/v1/${t}?select=*`, { method: "HEAD", headers: h(p, { prefer: "count=exact" }) });
  return r.ok ? Number(r.headers.get("content-range")?.split("/")[1] ?? 0) : `ERR ${r.status}`;
}
if (mode === "check") {
  for (const [t] of tables) console.log(t.padEnd(24), "old:", String(await count(OLD, t)).padStart(6), "  new:", String(await count(NEW, t)).padStart(6));
  process.exit(0);
}
for (const [t, pk] of tables) {
  let copied = 0;
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${OLD.url}/rest/v1/${t}?select=*&order=${pk}&limit=1000&offset=${off}`, { headers: h(OLD) });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(`${t}: ${JSON.stringify(rows)}`);
    if (!rows.length) break;
    const clean = rows.map((row) => {
      const x = { ...row };
      if (t === "analytics_events") delete x.id; // identity column
      if (t === "customers") x.user_id = null; // auth users differ between projects
      if (t === "order_events") x.author = null;
      return x;
    });
    const ins = await fetch(`${NEW.url}/rest/v1/${t}`, { method: "POST", headers: h(NEW, { prefer: t === "analytics_events" ? "return=minimal" : "resolution=ignore-duplicates,return=minimal" }), body: JSON.stringify(clean) });
    if (!ins.ok) throw new Error(`${t}: ${ins.status} ${(await ins.text()).slice(0, 300)}`);
    copied += rows.length;
    if (rows.length < 1000) break;
  }
  console.log(t.padEnd(24), "copied", copied);
}
