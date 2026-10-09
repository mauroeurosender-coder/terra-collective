// Full backup of the shop's data: every table as JSON + every stored file (photos, purchase invoices).
//   node scripts/backup.mjs                 → ~/Documents/terra-collective-backups/<date-time>/
// Not included on purpose: Etsy/Moloni connection tokens (reconnect instead) and login passwords (Supabase never exports them).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, authorization: `Bearer ${KEY}` };

const TABLES = [
  "collections", "products", "product_media", "variants", "journal_posts", "pages", "settings", "discounts", "gift_cards",
  "customers", "orders", "order_items", "order_events", "reviews", "newsletter_subscribers", "back_in_stock_requests", "carts",
  "enquiries", "staff", "expenses", "accounting_docs", "accounting_doc_lines", "inventory_items", "variant_components",
  "inventory_movements", "analytics_events",
];
const BUCKETS = ["media", "accounting"];

const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
const root = join(process.env.BACKUP_DIR ?? join(homedir(), "Documents", "terra-collective-backups"), stamp);
mkdirSync(join(root, "data"), { recursive: true });

const summary = { created_at: new Date().toISOString(), supabase_project: new URL(URL_).hostname, tables: {}, files: {} };

for (const t of TABLES) {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=*&limit=1000&offset=${off}`, { headers: h });
    if (r.status === 404) break; // table not created yet
    const page = await r.json();
    if (!Array.isArray(page)) throw new Error(`${t}: ${JSON.stringify(page).slice(0, 200)}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  writeFileSync(join(root, "data", `${t}.json`), JSON.stringify(rows));
  summary.tables[t] = rows.length;
  process.stdout.write(`${t}: ${rows.length}  `);
}
console.log();

async function listAll(bucket, prefix = "") {
  const out = [];
  for (let off = 0; ; off += 100) {
    const r = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, { method: "POST", headers: { ...h, "content-type": "application/json" }, body: JSON.stringify({ prefix, limit: 100, offset: off }) });
    const items = await r.json();
    if (!Array.isArray(items)) break;
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await listAll(bucket, path))); // folder
      else out.push(path);
    }
    if (items.length < 100) break;
  }
  return out;
}

for (const b of BUCKETS) {
  const files = await listAll(b);
  let bytes = 0;
  for (const f of files) {
    const r = await fetch(`${URL_}/storage/v1/object/${b}/${f.split("/").map(encodeURIComponent).join("/")}`, { headers: h });
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    const dest = join(root, "files", b, f);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    bytes += buf.length;
  }
  summary.files[b] = { count: files.length, mb: Math.round((bytes / 1048576) * 10) / 10 };
  console.log(`${b}: ${files.length} files`);
}

writeFileSync(join(root, "backup-info.json"), JSON.stringify(summary, null, 2));
console.log(`\nBackup saved to ${root}`);
