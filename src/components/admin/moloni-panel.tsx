"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Loader2, Unplug } from "lucide-react";
import { moloniChooseSetup, moloniDisconnect, moloniRunNow, moloniSaveOptions } from "@/app/admin/(app)/settings/actions";
import { useSave } from "./fields";
import { Card } from "./ui";

type Props = {
  configured: boolean;
  connected: boolean;
  companyName?: string;
  companyId?: number;
  setName?: string;
  setId?: number;
  companies: { id: number; name: string }[];
  sets: { id: number; name: string }[];
  startFrom?: string;
  lastRun?: string;
  lastResult?: string;
  options: { channels: { web: boolean; etsy: boolean }; oss: boolean };
  counts: { draft: number; error: number };
  redirectUri: string;
  notice?: string;
};

const notices: Record<string, [boolean, string]> = {
  connected: [true, "Moloni ligado. A partir de agora, cada encomenda enviada gera um rascunho de fatura-recibo com o número de seguimento."],
  denied: [false, "A autorização foi cancelada no Moloni."],
  error: [false, "Não foi possível ligar ao Moloni. Confirme o Developer ID, a Client Secret e o URI de resposta, e tente de novo."],
  "missing-key": [false, "Falta adicionar MOLONI_CLIENT_ID e MOLONI_CLIENT_SECRET às variáveis de ambiente."],
};

export function MoloniPanel(p: Props) {
  const router = useRouter();
  const [opts, setOpts] = useState(p.options);
  const [company, setCompany] = useState(p.companyId ?? p.companies[0]?.id ?? 0);
  const [docSet, setDocSet] = useState(p.setId ?? p.sets[0]?.id ?? 0);
  const s = useSave();
  const n = p.notice ? notices[p.notice] : null;

  return (
    <Card title="Moloni (faturação certificada)">
      {n && <p role="status" className={`mb-4 rounded-xl px-3 py-2 text-sm ${n[0] ? "bg-olive-tint" : "bg-coral-tint text-coral-ink"}`}>{n[1]}</p>}
      {p.connected ? (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-olive" />
            <p className="flex-1">
              Ligado a <b>{p.companyName}</b> · série <b>{p.setName}</b>
            </p>
            <a href="https://www.moloni.pt/ac/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-azulejo hover:underline">Abrir Moloni <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
          <p className="rounded-xl bg-mustard-tint px-3 py-2">
            As faturas são criadas como <b>rascunho</b>. Nada é comunicado à AT até as <b>finalizar no Moloni</b> (Documentos → Faturas-Recibo → Rascunhos).
          </p>
          <p className="text-ink-soft">
            A faturar encomendas enviadas desde {p.startFrom ? new Date(p.startFrom).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" }) : "—"}. {p.counts.draft} rascunho{p.counts.draft === 1 ? "" : "s"} criado{p.counts.draft === 1 ? "" : "s"}
            {p.counts.error ? <>, <Link className="font-medium text-coral-ink underline" href="/admin/orders?tab=all&invoice=error">{p.counts.error} com erro</Link></> : null}. Última verificação: {p.lastRun ? new Date(p.lastRun).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "nunca"}{p.lastResult ? ` (${p.lastResult})` : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button disabled={s.pending} onClick={() => s.run(() => moloniRunNow(), () => router.refresh())} className="btn-primary min-h-10 py-2 text-sm">{s.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Criar rascunhos agora</button>
            <button disabled={s.pending} onClick={() => confirm("Desligar o Moloni? Os rascunhos já criados ficam no Moloni.") && s.run(() => moloniDisconnect(), () => router.refresh())} className="btn min-h-10 px-4 py-2 text-coral-ink hover:bg-coral-tint"><Unplug className="h-4 w-4" /> Desligar</button>
          </div>

          {(p.companies.length > 1 || p.sets.length > 1) && (
            <fieldset className="flex flex-wrap items-end gap-2 rounded-2xl border border-line p-4">
              <legend className="px-1 font-semibold">Empresa e série</legend>
              {p.companies.length > 1 && (
                <div><label htmlFor="ml-company" className="label">Empresa</label><select id="ml-company" value={company} onChange={(e) => setCompany(Number(e.target.value))} className="field w-auto py-2">{p.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              )}
              <div><label htmlFor="ml-set" className="label">Série de documentos</label><select id="ml-set" value={docSet} onChange={(e) => setDocSet(Number(e.target.value))} className="field w-auto py-2">{p.sets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
              <button onClick={() => s.run(() => moloniChooseSetup(company, docSet), () => router.refresh())} className="btn-outline min-h-10 py-2">Guardar</button>
            </fieldset>
          )}

          <fieldset className="space-y-3 rounded-2xl border border-line p-4">
            <legend className="px-1 font-semibold">Opções</legend>
            <label className="flex items-center gap-2"><input type="checkbox" checked={opts.channels.web} onChange={(e) => setOpts({ ...opts, channels: { ...opts.channels, web: e.target.checked } })} className="h-4 w-4 accent-azulejo" /> Faturar encomendas do <b>site</b> (e manuais)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={opts.channels.etsy} onChange={(e) => setOpts({ ...opts, channels: { ...opts.channels, etsy: e.target.checked } })} className="h-4 w-4 accent-azulejo" /> Faturar encomendas da <b>Etsy</b></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={opts.oss} onChange={(e) => setOpts({ ...opts, oss: e.target.checked })} className="mt-0.5 h-4 w-4 accent-azulejo" /> <span>Estou registado no <b>OSS</b> (vendas para a UE acima de 10 000 €/ano). <span className="text-ink-soft">Enquanto esta opção estiver ligada, as encomendas para outros países da UE ficam marcadas para revisão manual da taxa do país de destino.</span></span></label>
            <button onClick={() => s.run(() => moloniSaveOptions(opts), () => router.refresh())} className="btn-outline min-h-10 py-2">Guardar opções</button>
          </fieldset>
          <details className="text-ink-soft">
            <summary className="cursor-pointer">Como são calculadas as faturas</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><b>Portugal e UE:</b> IVA de 23% incluído nos preços.</li>
              <li><b>Fora da UE:</b> exportação isenta (artigo 14.º do CIVA, código M05), sem o imposto que a Etsy cobrou e entrega no país de destino.</li>
              <li>A fatura é criada quando a encomenda é marcada como <b>enviada</b> (aqui ou na Etsy), com a data de envio e o número de seguimento nas observações.</li>
              <li>Os portes são uma linha própria; os cupões aparecem como desconto.</li>
              <li>Clientes sem NIF ficam como consumidor final (999999990), com nome, morada e país.</li>
              <li>Confirme estas regras com o seu contabilista antes de finalizar os primeiros rascunhos.</li>
            </ul>
          </details>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-ink-soft">Crie automaticamente rascunhos de fatura-recibo no Moloni para cada encomenda enviada do site e da Etsy, com o número de seguimento. Revê e finaliza no Moloni, e as faturas seguem para a AT e para o Portal das Finanças.</p>
          {p.configured ? (
            <form action="/api/moloni/connect" method="get"><button className="btn-primary min-h-11">Ligar Moloni</button></form>
          ) : (
            <ol className="list-decimal space-y-2 rounded-2xl bg-cream p-4 pl-8">
              <li>No Moloni: <b>Configurações → Ferramentas para Programadores</b>. Ative a API.</li>
              <li>URI de Resposta (Callback): <code className="rounded bg-paper px-1.5 py-0.5 text-xs break-all">{p.redirectUri}</code></li>
              <li>Copie o <b>Developer ID</b> e a <b>Client Secret</b> para as variáveis de ambiente do Hostinger como <code>MOLONI_CLIENT_ID</code> e <code>MOLONI_CLIENT_SECRET</code>, e volte a publicar.</li>
              <li>Volte aqui e clique em <b>Ligar Moloni</b>.</li>
            </ol>
          )}
        </div>
      )}
      <div className="mt-4"><s.Status /></div>
    </Card>
  );
}
