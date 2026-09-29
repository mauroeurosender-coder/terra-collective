/**
 * Fills the database with TEST orders and visits (same as Settings → Test data).
 *   node scripts/generate-test-data.ts 60     # last 60 days
 *   node scripts/generate-test-data.ts clear  # remove all test data
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { clearTestData, generateTestData } from "../src/lib/admin/test-data.ts";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const arg = process.argv[2] ?? "60";
if (arg === "clear") console.log(await clearTestData(sb));
else {
  const days = Math.min(365, Number(arg) || 60);
  let orders = 0, visits = 0, events = 0;
  for (let from = days; from > 0; from -= 7) {
    const r = await generateTestData(sb, from, Math.max(0, from - 7));
    orders += r.orders; visits += r.visits; events += r.events;
    process.stdout.write(".");
  }
  console.log(`\n${orders} orders, ${visits} visits, ${events} events over ${days} days`);
}
