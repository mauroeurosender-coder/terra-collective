"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Trash2, X } from "lucide-react";
import { eraseCustomer, updateCustomer } from "@/app/admin/(app)/customers/actions";
import { Card } from "./ui";

const suggested = ["VIP", "wholesale", "press", "friends & family"];

export function CustomerPanel({ id, tags: initialTags, notes: initialNotes, newsletter: initialNl, isOwner }: { id: string; tags: string[]; notes: string; newsletter: boolean; isOwner: boolean }) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [notes, setNotes] = useState(initialNotes);
  const [nl, setNl] = useState(initialNl);
  const [newTag, setNewTag] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const save = (patch: Parameters<typeof updateCustomer>[1]) => start(async () => { const r = await updateCustomer(id, patch); setMsg(r.ok ? r.message ?? null : r.error); });
  const setTagsAndSave = (t: string[]) => { setTags(t); save({ tags: t }); };

  return (
    <div className="space-y-4">
      <Card title="Tags">
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-azulejo-tint py-1 pr-1 pl-3 text-sm font-medium text-azulejo-deep">
              {t}
              <button onClick={() => setTagsAndSave(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/60"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggested.filter((s) => !tags.includes(s)).map((s) => (
            <button key={s} onClick={() => setTagsAndSave([...tags, s])} className="chip min-h-8 text-xs">+ {s}</button>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTag.trim()) { setTagsAndSave([...tags, newTag.trim()]); setNewTag(""); } }}>
          <label htmlFor="tag" className="sr-only">New tag</label>
          <input id="tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Custom tag" className="field py-2 text-sm" />
          <button className="btn-outline min-h-10 px-4 py-2 text-sm">Add</button>
        </form>
      </Card>
      <Card title="Notes">
        <label htmlFor="cnotes" className="sr-only">Notes</label>
        <textarea id="cnotes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== initialNotes && save({ notes })} placeholder="Preferences, special requests… (staff only)" className="field text-sm" />
      </Card>
      <Card title="Marketing">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nl} onChange={(e) => { setNl(e.target.checked); save({ newsletter: e.target.checked }); }} className="h-4 w-4 accent-azulejo" />
          Subscribed to newsletter
        </label>
        <p className="mt-2 text-xs text-ink-soft">Only tick this if the customer gave consent.</p>
      </Card>
      <Card title="Privacy (GDPR)">
        <div className="flex flex-wrap gap-2">
          <a download href={`/admin/customers/${id}/export`} className="btn-outline min-h-10 py-2 text-sm"><Download className="h-4 w-4" /> Export data (JSON)</a>
          {isOwner && (
            <button
              disabled={pending}
              onClick={() => confirm("Erase this customer’s personal data? Orders are kept for tax records but anonymised. This can’t be undone.") && start(async () => { const r = await eraseCustomer(id); if (r.ok) router.push("/admin/customers"); else setMsg(r.error); })}
              className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"
            >
              <Trash2 className="h-4 w-4" /> Erase data
            </button>
          )}
        </div>
      </Card>
      {msg && <p role="status" className="text-sm text-ink-soft">{msg}</p>}
    </div>
  );
}
