import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { mergeSettings } from "@/lib/settings";
import { faq as staticFaq, type FaqGroup } from "@/lib/data/pages";
import { NotConnected, PageHeader } from "@/components/admin/ui";
import { ThemesEditor } from "@/components/admin/themes-editor";
import { AnnouncementEditor, CollectionsEditor, FaqEditor, HeroEditor } from "@/components/admin/content-editors";

export const metadata = { title: "Content" };

const contentPages = [
  { slug: "our-story", label: "Our Story" },
  { slug: "shipping-returns", label: "Shipping & Returns" },
  { slug: "care-guide", label: "Care Guide" },
  { slug: "terms", label: "Terms & Conditions", legal: true },
  { slug: "privacy", label: "Privacy Policy", legal: true },
  { slug: "cookies", label: "Cookie Policy", legal: true },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  if (!supabaseConfigured) return <><PageHeader title="Content" /><NotConnected /></>;
  const { tab = "home" } = await searchParams;
  const sb = await supabaseServer();
  const [{ data: sets }, { data: cols }, { data: pgs }] = await Promise.all([
    sb.from("settings").select("key, value"),
    sb.from("collections").select("*").order("position"),
    sb.from("pages").select("slug, content, updated_at"),
  ]);
  const settings = mergeSettings(sets ?? []);
  const savedFaq = pgs?.find((p) => p.slug === "faq")?.content as FaqGroup[] | undefined;
  const tabs = [["themes", "Seasonal themes"], ["home", "Homepage"], ["collections", "Collections"], ["faq", "FAQ"], ["pages", "Pages"]];

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader title="Content" subtitle="Edit what shoppers see, without code." />
      <nav aria-label="Content sections" className="mb-5 flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${tab === k ? "bg-ink text-cream" : "bg-paper text-ink-soft hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "themes" && <ThemesEditor initial={settings.theme} />}
      {tab === "home" && (
        <div className="space-y-4">
          <AnnouncementEditor initial={settings.announcement} />
          <HeroEditor initial={settings.hero} />
        </div>
      )}
      {tab === "collections" && (
        <CollectionsEditor initial={(cols ?? []).map((c: any) => ({ id: c.id, name: c.name, blurb: { en: "", pt: "", ...c.blurb }, image: c.image ?? "", featured: c.featured, position: c.position }))} />
      )}
      {tab === "faq" && <FaqEditor initial={Array.isArray(savedFaq) && savedFaq.length ? savedFaq : staticFaq} />}
      {tab === "pages" && (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-paper">
          {contentPages.map((p) => {
            const saved = pgs?.find((x) => x.slug === p.slug);
            return (
              <li key={p.slug}>
                <Link href={`/admin/content/pages/${p.slug}`} className="flex items-center gap-3 px-5 py-4 hover:bg-cream/70">
                  <span className="flex-1 font-medium">{p.label}{p.legal && <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink-soft">Legal · owner</span>}</span>
                  <span className="text-sm text-ink-soft">{saved ? `Edited ${new Date(saved.updated_at).toLocaleDateString("en-GB")}` : "Original text"}</span>
                  <ChevronRight className="h-4 w-4 text-ink-soft" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
