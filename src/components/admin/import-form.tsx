"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { importCsv, type ImportResult } from "@/app/admin/(app)/products/import/actions";
import { parseCsv } from "@/lib/admin/csv";
import { Card } from "./ui";

export function ImportForm() {
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<{ rows: number; kind: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  async function pick(file: File) {
    setResult(null);
    const t = await file.text();
    const rows = parseCsv(t);
    const head = rows[0] ?? [];
    const kind = head.includes("TITLE") ? "Etsy listings → new draft products" : head.includes("sku") && head.includes("price_eur") ? "Terra export → update prices & stock by SKU" : "Unrecognised format";
    setName(file.name);
    setText(t);
    setPreview({ rows: Math.max(0, rows.length - 1), kind });
  }

  return (
    <div className="space-y-4">
      <Card title="Two ways to import">
        <ul className="space-y-3 text-sm text-ink-soft">
          <li><b className="text-ink">From Etsy:</b> in Shop Manager go to Settings → Options → Download data → Listings (CSV). Each listing becomes a <b>draft</b> product with its photos, tags, variations, price and quantity, ready for you to add Portuguese text and publish.</li>
          <li><b className="text-ink">Bulk price & stock update:</b> <a download className="link" href="/admin/products/export">export your products</a>, edit the price, compare-at and stock columns in Excel or Numbers, then import the file here. Rows are matched by SKU.</li>
        </ul>
      </Card>
      <Card>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center hover:border-ink/30">
          <FileUp className="h-7 w-7 text-azulejo" />
          <span className="font-medium">{name || "Choose a CSV file"}</span>
          {preview && <span className="text-sm text-ink-soft">{preview.rows} rows · {preview.kind}</span>}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
        <button
          disabled={!text || pending || preview?.kind === "Unrecognised format"}
          onClick={() => start(async () => setResult(await importCsv(text!)))}
          className="btn-primary mt-4 w-full"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Import
        </button>
      </Card>
      {result && (
        <Card title={result.ok ? "Import finished" : "Import failed"}>
          {result.error ? (
            <p role="alert" className="text-sm text-coral-ink">{result.error}</p>
          ) : (
            <div role="status" className="space-y-3 text-sm">
              <p>{result.created} created · {result.updated} updated · {result.skipped.length} skipped</p>
              {[...result.warnings, ...result.skipped].length > 0 && (
                <ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-ink-soft">
                  {[...result.warnings, ...result.skipped].map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
              <Link href={result.format === "etsy" ? "/admin/products?status=draft" : "/admin/products"} className="btn-outline min-h-10 py-2 text-sm">Review products</Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
