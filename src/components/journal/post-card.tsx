import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import { fmt, href, t } from "@/lib/i18n";
import type { JournalPost } from "@/lib/types";

export function PostCard({ post, lang, dict, large }: { post: JournalPost; lang: Locale; dict: Dictionary; large?: boolean }) {
  const date = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.date));
  return (
    <article className="group">
      <Link href={href(lang, `/journal/${post.slug}`)} className="block">
        <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-cream-deep ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
          <Image src={post.cover} alt="" fill sizes={large ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 33vw, 100vw"} className="object-cover transition duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]" />
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wider text-azulejo uppercase">{t(post.category, lang)}</p>
        <h3 className={`headline mt-2 group-hover:text-azulejo ${large ? "text-3xl md:text-4xl" : "text-2xl"}`}>{t(post.title, lang)}</h3>
        <p className="mt-2 text-ink-soft">{t(post.excerpt, lang)}</p>
        <p className="mt-3 text-sm text-ink-soft">
          <time dateTime={post.date}>{date}</time> · {fmt(dict.journal.minutes, { n: post.readingMinutes })}
        </p>
      </Link>
    </article>
  );
}
