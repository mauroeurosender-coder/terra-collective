"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { ExternalLink, FolderSync, Loader2, Unplug } from "lucide-react";
import { driveDisconnect, driveSyncNow } from "@/app/admin/(app)/accounting/actions";

type Props = { configured: boolean; connected: boolean; email?: string; lastSyncAt?: string; lastResult?: string; folderUrl: string | null; flash?: string };

const flashText: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Google Drive ligado. A primeira cópia já começou." },
  denied: { ok: false, text: "Ligação cancelada no Google." },
  error: { ok: false, text: "Não foi possível ligar ao Google Drive. Tente de novo." },
  "not-configured": { ok: false, text: "Faltam as chaves do Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET) no Hostinger." },
};

/** Connect / sync / disconnect the Google Drive copy of the accounting folder. */
export function DrivePanel({ configured, connected, email, lastSyncAt, lastResult, folderUrl, flash }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(flash ? flashText[flash] ?? null : null);
  const [askOff, setAskOff] = useState(false);

  return (
    <div className="space-y-3 text-sm">
      {!connected ? (
        <>
          <p className="text-ink-soft">Uma pasta no seu Google Drive que se preenche sozinha: <b>Terra Collective / Contabilidade / ano / trimestre</b>, com as faturas de compra, notas de crédito, faturas emitidas no Moloni e os resumos de IVA. Pode partilhá-la com o contabilista.</p>
          {configured ? (
            <form action="/api/google/connect" method="get"><button className="btn-primary min-h-10 py-2 text-sm"><FolderSync className="h-4 w-4" /> Ligar Google Drive</button></form>
          ) : (
            <p className="rounded-xl bg-mustard-tint px-3 py-2">Falta configurar o acesso ao Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Hostinger).</p>
          )}
        </>
      ) : (
        <>
          <p>Ligado a <b>{email ?? "Google Drive"}</b>. Cada documento é copiado logo depois de carregado; faturas emitidas e resumos a cada 15 minutos.</p>
          {lastSyncAt && <p className="text-ink-soft">Última sincronização: {new Date(lastSyncAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}{lastResult ? ` · ${lastResult}` : ""}</p>}
          <div className="flex flex-wrap gap-2">
            {folderUrl && <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-10 py-2 text-sm"><ExternalLink className="h-4 w-4" /> Abrir pasta</a>}
            <button type="button" disabled={pending} onClick={() => start(async () => { const r = await driveSyncNow(); setMsg(r.ok ? { ok: true, text: r.message ?? "Feito." } : { ok: false, text: r.error }); router.refresh(); })} className="btn-outline min-h-10 py-2 text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />} Sincronizar agora
            </button>
            {!askOff ? (
              <button type="button" onClick={() => setAskOff(true)} className="btn min-h-10 px-3 py-2 text-sm text-ink-soft hover:text-coral-ink"><Unplug className="h-4 w-4" /> Desligar</button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-ink-soft">Desligar? Os ficheiros ficam no Drive.</span>
                <button type="button" disabled={pending} onClick={() => start(async () => { const r = await driveDisconnect(); setAskOff(false); setMsg(r.ok ? { ok: true, text: r.message ?? "" } : { ok: false, text: r.error }); router.refresh(); })} className="btn-outline min-h-9 py-1.5 text-sm">Sim</button>
                <button type="button" onClick={() => setAskOff(false)} className="btn min-h-9 px-3 py-1.5 text-sm">Não</button>
              </span>
            )}
          </div>
        </>
      )}
      {msg && <p role="status" className={clsx("rounded-xl px-3 py-2", msg.ok ? "bg-olive-tint text-olive" : "bg-coral-tint text-coral-ink")}>{msg.text}</p>}
    </div>
  );
}
