import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { EmptyState, NotConnected, PageHeader } from "@/components/admin/ui";
import { ReviewCard, type AdminReview } from "@/components/admin/review-card";

export const metadata = { title: "Reviews" };
const tabs = [["pending", "To review"], ["approved", "Approved"], ["rejected", "Rejected"]] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Reviews" /><NotConnected /></>;
  const { tab = "pending" } = await searchParams;
  const sb = await supabaseServer();
  const [{ data }, ...counts] = await Promise.all([
    sb.from("reviews").select("*, products(slug, name)").eq("status", tab).order("created_at", { ascending: false }).limit(100),
    ...tabs.map(([k]) => sb.from("reviews").select("id", { count: "exact", head: true }).eq("status", k)),
  ]);
  const rows: AdminReview[] = (data ?? []).map((r: any) => ({ id: r.id, product: r.products?.name?.en ?? "", slug: r.products?.slug ?? "", author: r.author, email: r.email, country: r.country, rating: r.rating, title: r.title, body: r.body, status: r.status, featured: r.featured, reply: r.reply, verified: !!r.order_id, date: r.created_at }));
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title="Reviews" subtitle="Approve reviews before they appear. Featured reviews show on the homepage." />
      <nav aria-label="Review status" className="mb-5 flex gap-1.5">
        {tabs.map(([k, label], i) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${tab === k ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink"}`}>
            {label} <span className={`rounded-full px-1.5 text-xs ${tab === k ? "bg-white/15" : "bg-ink/5"}`}>{counts[i].count ?? 0}</span>
          </Link>
        ))}
      </nav>
      {rows.length ? <ul className="space-y-3">{rows.map((r) => <ReviewCard key={r.id} r={r} />)}</ul> : <EmptyState title={tab === "pending" ? "All caught up" : "Nothing here"} body={tab === "pending" ? "New reviews from the store will wait here for your approval." : undefined} />}
    </div>
  );
}
