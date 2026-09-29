"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import type { L } from "@/lib/types";
import { uploadMedia } from "@/lib/supabase/upload";

/** English + Portuguese side by side. */
export function LField({ label, value, onChange, multiline, rows = 3, hint }: { label: string; value: L; onChange: (v: L) => void; multiline?: boolean; rows?: number; hint?: string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <fieldset>
      <legend className="label">{label}{hint && <span className="ml-2 font-normal text-ink-soft">{hint}</span>}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["en", "pt"] as const).map((l) => (
          <label key={l} className="relative block">
            <span className="pointer-events-none absolute top-2.5 right-3 text-[0.65rem] font-semibold tracking-wider text-ink-soft uppercase">{l}</span>
            {multiline ? (
              <textarea id={`${id}-${l}`} rows={rows} value={value[l] ?? ""} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className="field pr-10 text-sm" lang={l} aria-label={`${label} (${l})`} />
            ) : (
              <input id={`${id}-${l}`} value={value[l] ?? ""} onChange={(e) => onChange({ ...value, [l]: e.target.value })} className="field pr-10 text-sm" lang={l} aria-label={`${label} (${l})`} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ImageField({ label, value, onChange, folder, aspect = "aspect-[16/10]" }: { label: string; value: string; onChange: (url: string) => void; folder: string; aspect?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <p className="label">{label}</p>
      <div className={`relative ${aspect} w-full max-w-sm overflow-hidden rounded-xl border border-line bg-cream-deep`}>
        {value && <Image src={value} alt="" fill sizes="384px" className="object-cover" />}
        <button type="button" onClick={() => input.current?.click()} className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1.5 text-sm font-medium shadow-[var(--shadow-soft)]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {value ? "Replace" : "Upload"}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setErr(null);
          try {
            onChange(await uploadMedia(f, folder));
          } catch (x) {
            setErr((x as Error).message);
          }
          setBusy(false);
        }}
      />
      {err && <p role="alert" className="mt-2 text-sm text-coral-ink">{err}</p>}
    </div>
  );
}

/** Wraps a server action call with pending state + a status message. */
export function useSave() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Saved." : r.error ?? "Something went wrong." });
      if (r.ok) after?.();
    });
  const Status = () => (msg ? <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-olive" : "text-coral-ink"}`}>{msg.text}</p> : null);
  return { pending, run, Status };
}

export function SaveRow({ pending, onSave, Status, label = "Save" }: { pending: boolean; onSave: () => void; Status: () => React.ReactNode; label?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <button type="button" onClick={onSave} disabled={pending} className="btn-primary min-h-10 py-2 text-sm">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {label}
      </button>
      <Status />
    </div>
  );
}
