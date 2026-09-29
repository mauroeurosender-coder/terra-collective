"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Loader2, Trash2 } from "lucide-react";
import { clearAllTestData, generateTestChunk } from "@/app/admin/(app)/settings/actions";
import { Card } from "./ui";

const CHUNK = 7;

export function TestDataPanel({ counts }: { counts: { orders: number; events: number } }) {
  const router = useRouter();
  const [days, setDays] = useState(60);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function generate() {
    setBusy(true);
    setMsg(null);
    let orders = 0;
    let visits = 0;
    for (let from = days; from > 0; from -= CHUNK) {
      const r = await generateTestChunk(from, Math.max(0, from - CHUNK));
      if (!r.ok) {
        setMsg({ ok: false, text: r.error });
        setBusy(false);
        return;
      }
      orders += r.orders;
      visits += r.visits;
      setProgress(Math.round(((days - from + CHUNK) / days) * 100));
    }
    setBusy(false);
    setProgress(0);
    setMsg({ ok: true, text: `Added ${orders} test orders and ${visits.toLocaleString("en-IE")} test visits over the last ${days} days.` });
    router.refresh();
  }

  async function clear() {
    if (!confirm("Remove all test orders, test customers and test visits?")) return;
    setBusy(true);
    const r = await clearAllTestData();
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Removed." : r.error });
    router.refresh();
  }

  return (
    <Card title="Test data">
      <p className="text-sm text-ink-soft">
        Fill the dashboard and analytics with realistic sample activity: orders from fake customers in Portugal, Spain, France, Germany, the UK, the US and more, plus
        anonymous visits with traffic sources, product views, carts, checkouts and searches. Test orders show a <b>TEST</b> badge, stock isn’t touched, and everything can be removed here.
      </p>
      <p className="mt-3 text-sm">Currently: <b>{counts.orders}</b> test orders · <b>{counts.events.toLocaleString("en-IE")}</b> test visit events</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="td-days" className="label">Period</label>
          <select id="td-days" value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={busy} className="field w-auto">
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <button onClick={generate} disabled={busy} className="btn-primary min-h-11">
          {busy && progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} {busy && progress ? `Generating… ${Math.min(progress, 100)}%` : "Generate test data"}
        </button>
        <button onClick={clear} disabled={busy} className="btn min-h-11 px-4 text-coral-ink hover:bg-coral-tint">
          <Trash2 className="h-4 w-4" /> Remove all test data
        </button>
      </div>
      {busy && progress > 0 && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-azulejo transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 text-sm ${msg.ok ? "text-olive" : "text-coral-ink"}`}>{msg.text}</p>}
      <p className="mt-4 text-xs text-ink-soft">Generating adds to what’s there; run “Remove” first for a clean slate. Remove all test data before launching.</p>
    </Card>
  );
}
