"use client";

import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, Eye, Mail, Plus, Trash2, X } from "lucide-react";
import { previewSequenceStep, saveSequences } from "@/app/admin/(app)/marketing/actions";
import { sequenceInfo, type EmailSequences, type SequenceKey, type SequenceStep } from "@/lib/email-sequences";
import { SaveRow, useSave } from "./fields";
import { Card } from "./ui";

export type SequenceStats = Record<string, { sent: number; skipped: number; failed: number; due: number }>;

const ORDER: SequenceKey[] = ["cart", "welcome", "post_purchase", "winback", "back_in_stock"];
const delayLabel = (h: number) => (h === 0 ? "right away" : h % 24 === 0 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hour${h === 1 ? "" : "s"}`);

export function SequencesEditor({ initial, stats, emailConnected, codes, unsubscribed }: { initial: EmailSequences; stats: SequenceStats; emailConnected: boolean; codes: string[]; unsubscribed: number }) {
  const [seqs, setSeqs] = useState(initial);
  const [open, setOpen] = useState<SequenceKey | null>("cart");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const s = useSave();

  const setSeq = (k: SequenceKey, patch: Partial<EmailSequences[SequenceKey]>) => setSeqs({ ...seqs, [k]: { ...seqs[k], ...patch } });
  const setStep = (k: SequenceKey, i: number, patch: Partial<SequenceStep>) => setSeq(k, { steps: seqs[k].steps.map((st, j) => (j === i ? { ...st, ...patch } : st)) });
  const missingCodes = [...new Set(ORDER.flatMap((k) => (seqs[k].enabled ? seqs[k].steps.map((st) => st.code?.toUpperCase()).filter((c): c is string => !!c && !codes.includes(c)) : [])))];

  return (
    <div className="space-y-4">
      {!emailConnected && (
        <p className="flex gap-2 rounded-2xl bg-mustard-tint px-4 py-3 text-sm">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No email service connected yet, so nothing is sent. “Due now” shows who would get an email. When you connect one (Resend), only emails due in the last 3 days go out, never an old backlog.</span>
        </p>
      )}
      {missingCodes.length > 0 && (
        <p className="flex gap-2 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-coral-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>These codes are used in emails but don’t exist yet: <b>{missingCodes.join(", ")}</b>. Create them under Discount codes, or the code won’t work at checkout.</span>
        </p>
      )}

      {ORDER.map((k) => {
        const seq = seqs[k];
        const info = sequenceInfo[k];
        const total = seq.steps.reduce((n, _, i) => n + (stats[`${k}:${i}`]?.sent ?? 0), 0);
        const due = seq.steps.reduce((n, _, i) => n + (stats[`${k}:${i}`]?.due ?? 0), 0);
        const isOpen = open === k;
        return (
          <Card key={k}>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <ChevronDown className={clsx("h-4 w-4 shrink-0 transition-transform", !isOpen && "-rotate-90")} />
                <span className="min-w-0">
                  <span className="block font-semibold">{info.name}</span>
                  <span className="block text-xs text-ink-soft">{seq.steps.length} email{seq.steps.length === 1 ? "" : "s"}: {seq.steps.map((st) => delayLabel(st.delayHours)).join(" → ")}</span>
                </span>
              </button>
              <span className="text-xs text-ink-soft tabular-nums">{total} sent · 90 days{due ? ` · ${due} due now` : ""}</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={seq.enabled} onChange={(e) => setSeq(k, { enabled: e.target.checked })} className="h-4 w-4 accent-azulejo" />
                {seq.enabled ? "On" : "Off"}
              </label>
            </div>

            {isOpen && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-ink-soft">{info.audience}</p>
                {seq.steps.map((st, i) => {
                  const stat = stats[`${k}:${i}`];
                  return (
                    <fieldset key={i} className="rounded-2xl bg-cream p-4">
                      <legend className="sr-only">{info.name} email {i + 1}</legend>
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold">Email {i + 1}</span>
                        <label className="flex items-center gap-2 text-sm">
                          Send after
                          <input aria-label="Delay in hours" type="number" min={0} value={st.delayHours} onChange={(e) => setStep(k, i, { delayHours: Math.max(0, Number(e.target.value)) })} className="field w-20 py-1.5 text-right text-sm tabular-nums" />
                          <span className="text-ink-soft">hours ({delayLabel(st.delayHours)}) {info.trigger.replace("hours ", "")}</span>
                        </label>
                        <span className="ml-auto text-xs text-ink-soft tabular-nums">{stat ? `${stat.sent} sent${stat.skipped ? ` · ${stat.skipped} skipped` : ""}${stat.failed ? ` · ${stat.failed} failed` : ""}${stat.due ? ` · ${stat.due} due` : ""}` : "none sent yet"}</span>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {(["en", "pt"] as const).map((l) => (
                          <div key={l} className="space-y-2">
                            <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{l === "en" ? "English" : "Português"}</p>
                            <input aria-label={`Subject ${l}`} placeholder="Subject" value={st.subject[l]} onChange={(e) => setStep(k, i, { subject: { ...st.subject, [l]: e.target.value } })} className="field py-2 text-sm" />
                            <input aria-label={`Heading ${l}`} placeholder="Heading" value={st.heading[l]} onChange={(e) => setStep(k, i, { heading: { ...st.heading, [l]: e.target.value } })} className="field py-2 text-sm" />
                            <textarea aria-label={`Text ${l}`} rows={5} value={st.body[l]} onChange={(e) => setStep(k, i, { body: { ...st.body, [l]: e.target.value } })} className="field text-sm" />
                            <input aria-label={`Button ${l}`} placeholder="Button text" value={st.button[l]} onChange={(e) => setStep(k, i, { button: { ...st.button, [l]: e.target.value } })} className="field py-2 text-sm" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          Discount code
                          <input aria-label="Discount code" value={st.code ?? ""} placeholder="none" onChange={(e) => setStep(k, i, { code: e.target.value.trim().toUpperCase() || null })} className={clsx("field w-36 py-1.5 text-sm uppercase", st.code && !codes.includes(st.code) && "border-coral")} />
                        </label>
                        <label className="flex items-center gap-2" title="Promotional emails only go to people who accepted marketing emails">
                          <input type="checkbox" checked={st.marketing} onChange={(e) => setStep(k, i, { marketing: e.target.checked })} className="h-4 w-4 accent-azulejo" />
                          Promotional (only with marketing consent)
                        </label>
                        <span className="ml-auto flex gap-2">
                          {(["en", "pt"] as const).map((l) => (
                            <button key={l} type="button" onClick={async () => setPreview(await previewSequenceStep(st, l))} className="btn-outline min-h-9 py-1.5 text-sm"><Eye className="h-4 w-4" /> Preview {l.toUpperCase()}</button>
                          ))}
                          {seq.steps.length > 1 && (
                            <button type="button" onClick={() => setSeq(k, { steps: seq.steps.filter((_, j) => j !== i) })} aria-label={`Remove email ${i + 1}`} className="grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </span>
                      </div>
                    </fieldset>
                  );
                })}
                <button type="button" onClick={() => setSeq(k, { steps: [...seq.steps, { ...seq.steps[seq.steps.length - 1], delayHours: seq.steps[seq.steps.length - 1].delayHours + 48 }] })} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-azulejo hover:bg-azulejo-tint"><Plus className="h-4 w-4" /> Add an email</button>
              </div>
            )}
          </Card>
        );
      })}

      <Card>
        <p className="text-sm text-ink-soft">
          Placeholders: <code>{"{first_name}"}</code> <code>{"{items}"}</code> <code>{"{code}"}</code> <code>{"{product}"}</code> <code>{"{order_number}"}</code>. A blank line starts a new paragraph. Every email has an unsubscribe link{unsubscribed ? ` (${unsubscribed} unsubscribed so far)` : ""}. Etsy buyers are never emailed: Etsy doesn’t share their address and its rules forbid it.
        </p>
        <SaveRow pending={s.pending} Status={s.Status} onSave={() => s.run(() => saveSequences(seqs))} />
      </Card>

      {preview && (
        <div role="dialog" aria-modal="true" aria-label="Email preview" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <p className="min-w-0 flex-1 truncate text-sm"><span className="text-ink-soft">Subject:</span> <b>{preview.subject}</b></p>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="grid h-8 w-8 place-items-center rounded-full hover:bg-cream"><X className="h-4 w-4" /></button>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[70vh] w-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
