"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { etsyDisconnect, etsySaveOptions, etsySyncNow } from "@/app/admin/(app)/settings/actions";
import { useSave } from "./fields";
import { Card } from "./ui";

type Props = {
  configured: boolean;
  connected: boolean;
  shopName?: string;
  lastSync?: string | null;
  lastResult?: string;
  options: { reduceStock: boolean; pushTracking: boolean; importSince: string };
  redirectUri: string;
  notice?: string;
  etsyOrders: number;
  cron: boolean;
};

const notices: Record<string, [boolean, string]> = {
  connected: [true, "Etsy is connected and your recent orders have been imported."],
  denied: [false, "The connection was cancelled on Etsy."],
  error: [false, "Etsy couldn’t be connected. Check the keys and the callback URL in your Etsy app, then try again."],
  "missing-key": [false, "Add ETSY_API_KEY to the environment variables first (see the steps below)."],
};

export function EtsyPanel(p: Props) {
  const router = useRouter();
  const [opts, setOpts] = useState(p.options);
  const s = useSave();
  const n = p.notice ? notices[p.notice] : null;
  return (
    <Card title="Etsy">
      {n && <p role="status" className={`mb-4 rounded-xl px-3 py-2 text-sm ${n[0] ? "bg-olive-tint" : "bg-coral-tint text-coral-ink"}`}>{n[1]}</p>}
      {p.connected ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-olive" />
            <p className="flex-1">Connected to <b>{p.shopName ?? "your Etsy shop"}</b> · {p.etsyOrders} Etsy order{p.etsyOrders === 1 ? "" : "s"} imported</p>
            <Link href="/admin/orders?tab=all&source=etsy" className="text-sm font-medium text-azulejo hover:underline">See Etsy orders</Link>
          </div>
          <p className="text-sm text-ink-soft">
            Last sync: {p.lastSync ? new Date(p.lastSync).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "never"}
            {p.lastResult && <> · {p.lastResult}</>}. {p.cron ? "New orders and status changes are checked every 15 minutes." : "Automatic syncing starts once CRON_SECRET is set on Netlify; until then use Sync now."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button disabled={s.pending} onClick={() => s.run(() => etsySyncNow(false), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">{s.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now</button>
            <button disabled={s.pending} onClick={() => confirm(`Re-check every Etsy order since ${opts.importSince}? Existing orders are updated, not duplicated.`) && s.run(() => etsySyncNow(true), () => router.refresh())} className="btn-outline min-h-10 py-2 text-sm">Full re-sync</button>
            <button disabled={s.pending} onClick={() => confirm("Disconnect Etsy? Imported orders stay; new ones stop arriving.") && s.run(() => etsyDisconnect(), () => router.refresh())} className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"><Unplug className="h-4 w-4" /> Disconnect</button>
          </div>
          <fieldset className="space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 text-sm font-semibold">Options</legend>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={opts.reduceStock} onChange={(e) => setOpts({ ...opts, reduceStock: e.target.checked })} className="mt-0.5 h-4 w-4 accent-azulejo" /> <span><b>Reduce website stock</b> when an Etsy order arrives (recommended if both shops sell the same pieces).</span></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={opts.pushTracking} onChange={(e) => setOpts({ ...opts, pushTracking: e.target.checked })} className="mt-0.5 h-4 w-4 accent-azulejo" /> <span><b>Send tracking to Etsy</b> when you mark an Etsy order as shipped here. Etsy then marks it shipped and emails the buyer.</span></label>
            <div className="flex flex-wrap items-end gap-2">
              <div><label htmlFor="etsy-since" className="label">Import orders from</label><input id="etsy-since" type="date" value={opts.importSince} onChange={(e) => setOpts({ ...opts, importSince: e.target.value })} className="field py-2 text-sm" /></div>
              <button onClick={() => s.run(() => etsySaveOptions(opts), () => router.refresh())} className="btn-outline min-h-10 py-2 text-sm">Save options</button>
            </div>
          </fieldset>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-ink-soft">Bring every Etsy order into this admin automatically, with its status, so all your orders live in one place. When you ship an Etsy order from here, the tracking number goes back to Etsy.</p>
          {p.configured ? (
            <form action="/api/etsy/connect" method="get">
              <button className="btn-primary min-h-11">Connect Etsy</button>
            </form>
          ) : (
            <ol className="list-decimal space-y-2 rounded-2xl bg-cream p-4 pl-8">
              <li>Go to <a className="link" href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">etsy.com/developers/your-apps <ExternalLink className="inline h-3 w-3" /></a>, sign in with your Etsy shop account and click <b>Create a New App</b>.</li>
              <li>Name it e.g. “Terra Collective website”, describe it as connecting your own shop’s orders to your website, and choose that it’s for your own shop / personal use.</li>
              <li>In the app settings, add this <b>Callback URL</b>: <code className="rounded bg-paper px-1.5 py-0.5 text-xs break-all">{p.redirectUri}</code></li>
              <li>Copy the app’s <b>Keystring</b> and <b>Shared secret</b> into Netlify → Environment variables as <code>ETSY_API_KEY</code> and <code>ETSY_SHARED_SECRET</code> (tick “Contains secret values” for the shared secret), then redeploy.</li>
              <li>Come back here and click <b>Connect Etsy</b>.</li>
            </ol>
          )}
        </div>
      )}
      <div className="mt-4"><s.Status /></div>
    </Card>
  );
}
