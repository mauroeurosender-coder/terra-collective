"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { approveSeo, discardSeo, generateSeo, type Approval } from "@/app/admin/(app)/products/seo/actions";
import type { SeoProposal } from "@/lib/seo-prompt";

type Fields = Omit<Approval, "id">;
export type SeoRow = {
  id: string;
  slug: string;
  status: "draft" | "active" | "archived";
  image: string | null;
  etsy: boolean;
  etsyTitle: string;
  current: Fields;
  proposal: SeoProposal | null;
  approvedAt: string | null;
};

type Tab = "pending" | "todo" | "approved" | "all";
const BATCH = 8;
const pick = (p: SeoProposal): Fields => ({ name_en: p.name_en, name_pt: p.name_pt, seo_title_en: p.seo_title_en, seo_title_pt: p.seo_title_pt, meta_en: p.meta_en, meta_pt: p.meta_pt, slug: p.slug });

export function SeoEditor({ rows, gemini }: { rows: SeoRow[]; gemini: boolean }) {
  const router = useRouter();
  // Draft edits per product (proposal, or the current values when editing an approved one).
  const [drafts, setDrafts] = useState<Record<string, Fields>>(() => Object.fromEntries(rows.filter((r) => r.proposal).map((r) => [r.id, pick(r.proposal!)])));
  const [tab, setTab] = useState<Tab>(rows.some((r) => r.proposal) ? "pending" : "todo");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const todo = rows.filter((r) => !drafts[r.id] && !r.approvedAt);
  const approved = rows.filter((r) => r.approvedAt);
  const list = tab === "pending" ? rows.filter((r) => drafts[r.id]) : tab === "todo" ? todo : tab === "approved" ? approved : rows;

  async function generate(ids: string[]) {
    setMsg(null);
    setProgress({ done: 0, total: ids.length });
    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      const res = await generateSeo(chunk);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        break;
      }
      setDrafts((d) => ({ ...d, ...Object.fromEntries(Object.entries(res.data ?? {}).map(([id, p]) => [id, pick(p)])) }));
      done += chunk.length;
      setProgress({ done, total: ids.length });
    }
    setProgress(null);
    if (done) setTab("pending");
    router.refresh();
  }

  async function approve(ids: string[]) {
    setMsg(null);
    setBusy(ids.length === 1 ? ids[0] : "all");
    const res = await approveSeo(ids.filter((id) => drafts[id]).map((id) => ({ id, ...drafts[id] })));
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    const skipped = res.data?.skipped ?? [];
    setDrafts((d) => {
      const n = { ...d };
      for (const id of res.data?.approvedIds ?? []) delete n[id];
      return n;
    });
    setMsg({ ok: skipped.length === 0, text: `${res.data?.approvedIds.length ?? 0} aprovado(s).${skipped.length ? ` Não aprovados: ${skipped.join("; ")}` : ""}` });
    router.refresh();
  }

  async function discard(row: SeoRow) {
    setDrafts((d) => {
      const n = { ...d };
      delete n[row.id];
      return n;
    });
    if (row.proposal) {
      await discardSeo(row.id);
      router.refresh();
    }
  }

  const set = (id: string, patch: Partial<Fields>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const pendingIds = rows.filter((r) => drafts[r.id]).map((r) => r.id);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full border border-line/70 bg-paper p-1 text-sm" role="tablist">
          {([
            ["pending", `Por aprovar (${pendingIds.length})`],
            ["todo", `Sem proposta (${todo.length})`],
            ["approved", `Aprovados (${approved.length})`],
            ["all", `Todos (${rows.length})`],
          ] as [Tab, string][]).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("rounded-full px-3.5 py-1.5", tab === k ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {todo.length > 0 && (
            <button disabled={!gemini || !!progress} onClick={() => generate(todo.map((r) => r.id))} className="btn-outline min-h-10 py-2 text-sm">
              {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {progress ? `A gerar… ${progress.done}/${progress.total}` : `Gerar propostas (${todo.length})`}
            </button>
          )}
          {pendingIds.length > 0 && (
            <button disabled={!!busy || !!progress} onClick={() => approve(pendingIds)} className="btn-primary min-h-10 py-2 text-sm">
              {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar todos ({pendingIds.length})
            </button>
          )}
        </div>
      </div>

      {!gemini && <p className="mb-4 rounded-lg border border-mustard/60 bg-mustard/10 px-4 py-3 text-sm">O Gemini não está configurado no servidor: adicione GEMINI_API_KEY nas variáveis de ambiente da Hostinger.</p>}
      {msg && <p role="status" className={clsx("mb-4 rounded-lg px-4 py-3 text-sm", msg.ok ? "bg-olive/10 text-olive" : "bg-terracotta/10 text-terracotta")}>{msg.text}</p>}

      {list.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-8 text-center text-ink-soft">
          {tab === "pending" ? "Não há propostas por aprovar. Use “Gerar propostas”." : tab === "todo" ? "Todos os produtos têm proposta ou já foram aprovados." : "Nada aqui ainda."}
        </p>
      )}

      <ul className="space-y-4">
        {list.map((r) => {
          const d = drafts[r.id];
          return (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-4 md:p-5">
              <div className="flex gap-4">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-line/40" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">
                    {r.etsy ? "Título no Etsy (não muda)" : "Nome original"} · {r.status === "active" ? "Ativo" : "Rascunho"}
                    {r.approvedAt && " · Aprovado"}
                  </p>
                  <p className="text-sm text-ink-soft">{r.etsyTitle}</p>
                  {!d && (
                    <p className="mt-1 font-medium">
                      {r.current.name_en} <span className="text-ink-soft">/ {r.current.name_pt}</span> <span className="text-xs text-ink-soft">· /{r.slug}</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  {d ? (
                    <>
                      <button onClick={() => discard(r)} className="btn-outline min-h-9 px-3 py-1.5 text-sm" aria-label="Descartar proposta"><X className="h-4 w-4" /></button>
                      <button disabled={!!busy} onClick={() => approve([r.id])} className="btn-primary min-h-9 py-1.5 text-sm">
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprovar
                      </button>
                    </>
                  ) : (
                    <>
                      {r.approvedAt && <button onClick={() => setDrafts((x) => ({ ...x, [r.id]: { ...r.current } }))} className="btn-outline min-h-9 py-1.5 text-sm">Editar</button>}
                      <button disabled={!gemini || !!progress} onClick={() => generate([r.id])} className="btn-outline min-h-9 py-1.5 text-sm"><Sparkles className="h-4 w-4" /> {r.approvedAt ? "Nova proposta" : "Gerar"}</button>
                    </>
                  )}
                </div>
              </div>

              {d && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(["en", "pt"] as const).map((l) => (
                    <fieldset key={l} className="space-y-3">
                      <legend className="mb-1 text-xs font-semibold tracking-wide text-ink-soft uppercase">{l === "en" ? "Inglês" : "Português"}</legend>
                      <Field label="Nome no site" max={45} value={d[`name_${l}`]} onChange={(v) => set(r.id, { [`name_${l}`]: v })} />
                      <Field label="Título no Google" max={60} value={d[`seo_title_${l}`]} onChange={(v) => set(r.id, { [`seo_title_${l}`]: v })} />
                      <Field label="Descrição no Google" max={155} min={110} multiline value={d[`meta_${l}`]} onChange={(v) => set(r.id, { [`meta_${l}`]: v })} />
                    </fieldset>
                  ))}
                  <div className="md:col-span-2">
                    <Field label="Endereço (URL)" prefix="/products/" max={50} value={d.slug} onChange={(v) => set(r.id, { slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
                    {r.status === "active" && d.slug !== r.slug && <p className="mt-1 text-xs text-ink-soft">O endereço antigo (/{r.slug}) passa a redirecionar para o novo.</p>}
                  </div>
                  <GooglePreview title={d.seo_title_en || d.name_en} url={`terracolective.shop/en/products/${d.slug}`} description={d.meta_en} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange, max, min, multiline, prefix }: { label: string; value: string; onChange: (v: string) => void; max: number; min?: number; multiline?: boolean; prefix?: string }) {
  const n = value.length;
  const bad = n > max || (min != null && n > 0 && n < min);
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className={clsx("tabular-nums text-xs", bad ? "font-medium text-terracotta" : "text-ink-soft")}>{n}/{max}{bad ? (n > max ? " · longo" : " · curto") : ""}</span>
      </span>
      <span className="flex items-center gap-1">
        {prefix && <span className="text-sm text-ink-soft">{prefix}</span>}
        {multiline ? (
          <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="field text-sm" />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} className="field py-2 text-sm" />
        )}
      </span>
    </label>
  );
}

function GooglePreview({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <div className="rounded-lg border border-line/70 p-3 md:col-span-2" aria-label="Pré-visualização no Google">
      <p className="text-xs text-ink-soft">Como aparece no Google (inglês)</p>
      <p className="mt-1 truncate text-xs text-ink-soft">{url}</p>
      <p className="truncate text-[1.05rem] text-[#1a0dab] dark:text-[#8ab4f8]">{title.length > 60 ? `${title.slice(0, 60)}…` : title}</p>
      <p className="line-clamp-2 text-sm text-ink-soft">{description}</p>
    </div>
  );
}
