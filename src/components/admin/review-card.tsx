"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Check, Home, Trash2, X } from "lucide-react";
import { deleteReview, updateReview } from "@/app/admin/(app)/reviews/actions";
import { Stars } from "../ui/stars";
import { useSave } from "./fields";

export type AdminReview = { id: string; product: string; slug: string; author: string; email: string | null; country: string | null; rating: number; title: string | null; body: string; status: "pending" | "approved" | "rejected"; featured: boolean; reply: string | null; verified: boolean; date: string };

export function ReviewCard({ r }: { r: AdminReview }) {
  const router = useRouter();
  const [reply, setReply] = useState(r.reply ?? "");
  const [replyOpen, setReplyOpen] = useState(!!r.reply);
  const s = useSave();
  const act = (patch: Parameters<typeof updateReview>[1]) => s.run(() => updateReview(r.id, patch), () => router.refresh());
  return (
    <li className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={r.rating} />
        {r.title && <span className="font-semibold">{r.title}</span>}
        {r.verified && <span className="inline-flex items-center gap-1 text-xs text-olive"><BadgeCheck className="h-3.5 w-3.5" /> Verified buyer</span>}
        {r.featured && <span className="rounded-full bg-mustard-tint px-2 py-0.5 text-xs font-semibold">On homepage</span>}
      </div>
      <p className="mt-1 text-sm text-ink-soft">{r.author}{r.country && ` · ${r.country}`}{r.email && ` · ${r.email}`} · {new Date(r.date).toLocaleDateString("en-GB")} · <a href={`/en/products/${r.slug}#reviews`} target="_blank" className="underline">{r.product}</a></p>
      <p className="mt-3 max-w-3xl leading-relaxed">{r.body}</p>
      {replyOpen ? (
        <div className="mt-4 max-w-3xl">
          <label htmlFor={`reply-${r.id}`} className="label">Public reply from Terra</label>
          <textarea id={`reply-${r.id}`} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} className="field text-sm" />
          <button onClick={() => act({ reply })} className="btn-outline mt-2 min-h-9 py-1.5 text-sm">Save reply</button>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.status !== "approved" && <button onClick={() => act({ status: "approved" })} className="btn-primary min-h-9 py-1.5 text-sm"><Check className="h-4 w-4" /> Approve</button>}
        {r.status !== "rejected" && <button onClick={() => act({ status: "rejected", featured: false })} className="btn-outline min-h-9 py-1.5 text-sm"><X className="h-4 w-4" /> Reject</button>}
        {r.status === "approved" && <button onClick={() => act({ featured: !r.featured })} className="btn-outline min-h-9 py-1.5 text-sm"><Home className="h-4 w-4" /> {r.featured ? "Remove from homepage" : "Feature on homepage"}</button>}
        {!replyOpen && <button onClick={() => setReplyOpen(true)} className="btn min-h-9 px-3 py-1.5 text-sm hover:bg-ink/5">Reply</button>}
        <button onClick={() => confirm("Delete this review permanently?") && s.run(() => deleteReview(r.id), () => router.refresh())} aria-label="Delete review" className="ml-auto grid h-9 w-9 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
        <s.Status />
      </div>
    </li>
  );
}
