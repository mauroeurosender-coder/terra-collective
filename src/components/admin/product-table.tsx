"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { bulkUpdate } from "@/app/admin/(app)/products/actions";
import { eur } from "./ui";

export type ProductRow = { id: string; slug: string; name: string; status: "draft" | "active" | "archived"; collection: string; image?: string; stock: number; variants: number; min: number; max: number };

const statusStyle = { active: "bg-olive-tint text-olive", draft: "bg-mustard-tint text-ink", archived: "bg-ink/5 text-ink-soft" };

export function ProductTable({ rows, collections }: { rows: ProductRow[]; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const apply = (patch: Parameters<typeof bulkUpdate>[1]) =>
    start(async () => {
      const r = await bulkUpdate([...sel], patch);
      setMsg(r.ok ? r.message ?? "Updated." : r.error);
      if (r.ok) { setSel(new Set()); router.refresh(); }
    });

  return (
    <div>
      {sel.size > 0 && (
        <div className="sticky top-14 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-cream lg:top-3">
          <span className="font-medium">{sel.size} selected</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          {(["active", "draft", "archived"] as const).map((s) => (
            <button key={s} disabled={pending} onClick={() => apply({ status: s })} className="rounded-full bg-white/10 px-3 py-1.5 capitalize hover:bg-white/20">Set {s}</button>
          ))}
          <label className="sr-only" htmlFor="bulk-col">Move to collection</label>
          <select id="bulk-col" disabled={pending} defaultValue="" onChange={(e) => e.target.value && apply({ collectionId: e.target.value })} className="rounded-full bg-white/10 px-3 py-1.5 text-cream [&_option]:text-ink">
            <option value="">Move to collection…</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setSel(new Set())} className="ml-auto underline">Clear</button>
        </div>
      )}
      {msg && <p role="status" className="mb-3 text-sm text-ink-soft">{msg}</p>}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-soft">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-azulejo" /></th>
                <th className="px-2 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className={clsx("hover:bg-cream/70", sel.has(p.id) && "bg-azulejo-tint/40")}>
                  <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-azulejo" /></td>
                  <td className="px-2 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-azulejo">
                      <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}</span>
                      <span className="font-medium">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[p.status])}>{p.status}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{p.collection}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={clsx(p.stock === 0 ? "font-semibold text-coral-ink" : p.stock <= 3 && "text-coral-ink")}>{p.stock === 0 ? "Sold out" : p.stock}</span>
                    <span className="text-ink-soft"> · {p.variants} variant{p.variants === 1 ? "" : "s"}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.min === p.max ? eur(p.min, 2) : `${eur(p.min)}–${eur(p.max)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
