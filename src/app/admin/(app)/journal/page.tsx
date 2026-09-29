import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { EmptyState, NotConnected, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Journal" };
const style = { draft: "bg-mustard-tint text-ink", scheduled: "bg-azulejo-tint text-azulejo-deep", published: "bg-olive-tint text-olive" } as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function JournalAdmin() {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Journal" /><NotConnected /></>;
  const sb = await supabaseServer();
  const { data } = await sb.from("journal_posts").select("id, slug, status, title, cover, category, publish_at, updated_at").order("updated_at", { ascending: false });
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title="Journal" subtitle="Stories with shoppable product cards." actions={<Link href="/admin/journal/new" className="btn-primary min-h-10 py-2 text-sm"><Plus className="h-4 w-4" /> New post</Link>} />
      {!data?.length ? <EmptyState title="No posts yet" action={<Link href="/admin/journal/new" className="btn-primary">Write your first post</Link>} /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-paper">
          {data.map((p: any) => (
            <li key={p.id}>
              <Link href={`/admin/journal/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-cream/70">
                <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{p.cover && <Image src={p.cover} alt="" fill sizes="80px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title.en}</span>
                  <span className="text-sm text-ink-soft">{p.category?.en}{p.publish_at && ` · ${new Date(p.publish_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style[p.status as keyof typeof style]}`}>{p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
