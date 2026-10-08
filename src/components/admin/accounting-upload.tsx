"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import clsx from "clsx";
import { FileUp, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { registerUpload } from "@/app/admin/(app)/accounting/actions";

const types = [
  { key: "purchase-invoice", label: "Fatura de compra", direction: "purchase", kind: "invoice" },
  { key: "purchase-cn", label: "Nota de crédito de fornecedor", direction: "purchase", kind: "credit_note" },
  { key: "sale-cn", label: "Nota de crédito emitida (venda)", direction: "sale", kind: "credit_note" },
] as const;

export function AccountingUpload({ gemini }: { gemini: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<(typeof types)[number]["key"]>("purchase-invoice");
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    setError(null);
    const t = types.find((x) => x.key === type)!;
    const list = [...files].filter((f) => /pdf|image\//.test(f.type));
    if (!list.length) return setError("Use PDF ou fotografia (JPG, PNG, HEIC).");
    let lastId: string | undefined;
    for (const [i, file] of list.entries()) {
      if (file.size > 15 * 1024 * 1024) {
        setError(`${file.name} é demasiado grande (máx. 15 MB).`);
        continue;
      }
      setBusy(`${i + 1}/${list.length} · ${gemini ? "a carregar e a ler" : "a carregar"} ${file.name}…`);
      const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "-").slice(-80);
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
      const { error: e } = await supabaseBrowser().storage.from("accounting").upload(path, file, { contentType: file.type });
      if (e) {
        setError(`Falhou o envio de ${file.name}: ${e.message}`);
        continue;
      }
      const r = await registerUpload({ path, fileName: file.name, mime: file.type || "application/pdf", direction: t.direction, kind: t.kind });
      if (!r.ok) setError(r.error);
      else lastId = r.id;
    }
    setBusy(null);
    if (list.length === 1 && lastId) router.push(`/admin/accounting/docs/${lastId}`);
    else router.refresh();
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Tipo de documento" className="mb-3 flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button key={t.key} type="button" role="radio" aria-checked={type === t.key} onClick={() => setType(t.key)} className="chip min-h-9 text-sm">{t.label}</button>
        ))}
      </div>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        className={clsx("flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center text-sm transition", over ? "border-azulejo bg-azulejo-tint" : "border-line hover:border-ink/30")}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-azulejo" /> : <FileUp className="h-7 w-7 text-azulejo" />}
        <span className="font-medium">{busy ?? "Carregar documentos (PDF ou fotografia)"}</span>
        {!busy && <span className="text-ink-soft">Arraste para aqui ou clique. {gemini ? "Os dados são lidos automaticamente para confirmar." : "Depois preenche os dados."}</span>}
      </button>
      <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
      {error && <p role="alert" className="mt-2 text-sm text-coral-ink">{error}</p>}
    </div>
  );
}
