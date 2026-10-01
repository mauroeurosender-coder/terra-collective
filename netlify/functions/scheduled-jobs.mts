/**
 * Netlify Scheduled Function: every 15 minutes, pulls new Etsy orders/status
 * and sends abandoned-cart reminders. Needs CRON_SECRET (and URL, set by Netlify).
 */
const run = async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return;
  const headers = { authorization: `Bearer ${secret}` };
  const results = await Promise.allSettled([
    fetch(`${base}/api/cron/etsy-sync`, { headers }).then((r) => r.json()),
    fetch(`${base}/api/cron/abandoned-carts`, { headers }).then((r) => r.json()),
  ]);
  console.log(JSON.stringify(results.map((r) => (r.status === "fulfilled" ? r.value : String(r.reason)))));
};

export default run;

export const config = { schedule: "*/15 * * * *" };
