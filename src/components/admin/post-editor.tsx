"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Eye, Film, Heading2, Image as ImageIcon, Images, Loader2, Pilcrow, Quote, ShoppingBag, Trash2, X } from "lucide-react";
import type { JournalBlock, L } from "@/lib/types";
import { uploadMedia } from "@/lib/supabase/upload";
import { slugify } from "@/lib/admin/product-form";
import { deletePost, savePost, type PostForm } from "@/app/admin/(app)/journal/actions";
import { ImageField, LField, useSave } from "./fields";
import { Card } from "./ui";

const eL = (): L => ({ en: "", pt: "" });

const blockTypes: { type: JournalBlock["type"]; label: string; icon: typeof Pilcrow; make: () => JournalBlock }[] = [
  { type: "p", label: "Paragraph", icon: Pilcrow, make: () => ({ type: "p", text: eL() }) },
  { type: "h2", label: "Heading", icon: Heading2, make: () => ({ type: "h2", text: eL() }) },
  { type: "quote", label: "Quote", icon: Quote, make: () => ({ type: "quote", text: eL() }) },
  { type: "image", label: "Image", icon: ImageIcon, make: () => ({ type: "image", src: "", alt: eL(), caption: eL() }) },
  { type: "gallery", label: "Gallery", icon: Images, make: () => ({ type: "gallery", images: [], caption: eL() }) },
  { type: "video", label: "Video", icon: Film, make: () => ({ type: "video", url: "", caption: eL() }) },
  { type: "products", label: "Products", icon: ShoppingBag, make: () => ({ type: "products", slugs: [] }) },
];

export function PostEditor({ initial, products }: { initial: PostForm; products: { slug: string; name: string; image?: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [preview, setPreview] = useState<"en" | "pt" | null>(null);
  const s = useSave();
  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const setBlock = (i: number, b: JournalBlock) => set("blocks", f.blocks.map((x, j) => (j === i ? b : x)));
  const moveBlock = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= f.blocks.length) return;
    const next = [...f.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set("blocks", next);
  };
  const addBlock = (b: JournalBlock, at = f.blocks.length) => set("blocks", [...f.blocks.slice(0, at), b, ...f.blocks.slice(at)]);

  const save = (status: PostForm["status"]) =>
    s.run(async () => {
      const r = await savePost({ ...f, status, slug: f.slug || slugify(f.title.en) });
      if (r.ok) {
        setF((p) => ({ ...p, status, id: r.id ?? p.id }));
        if (!f.id && r.id) router.replace(`/admin/journal/${r.id}`);
        else router.refresh();
      }
      return r;
    });

  return (
    <div className="pb-28">
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="space-y-4">
              <LField label="Title" value={f.title} onChange={(title) => setF((p) => ({ ...p, title, slug: p.id ? p.slug : slugify(title.en) }))} />
              <LField label="Excerpt" value={f.excerpt} onChange={(excerpt) => set("excerpt", excerpt)} multiline rows={2} hint="Shown on cards and in search results" />
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-[0.95rem] font-semibold">Article</h2>
            <div className="flex gap-1.5">
              {(["en", "pt"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setPreview(preview === l ? null : l)} aria-pressed={preview === l} className="chip min-h-9 gap-1.5 text-sm"><Eye className="h-4 w-4" /> Preview {l.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {preview ? (
            <Preview f={f} lang={preview} products={products} />
          ) : (
            <ol className="space-y-3">
              {f.blocks.map((b, i) => (
                <li key={i} className="rounded-[var(--radius-card)] border border-line/70 bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="eyebrow">{blockTypes.find((t) => t.type === b.type)?.label}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveBlock(i, -1)} aria-label="Move block up" className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => moveBlock(i, 1)} aria-label="Move block down" className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => set("blocks", f.blocks.filter((_, j) => j !== i))} aria-label="Delete block" className="grid h-8 w-8 place-items-center rounded-full text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <BlockEditor block={b} onChange={(nb) => setBlock(i, nb)} products={products} />
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border border-dashed border-line p-3">
            <span className="self-center px-1 text-sm text-ink-soft">Add:</span>
            {blockTypes.map((t) => (
              <button key={t.type} type="button" onClick={() => { setPreview(null); addBlock(t.make()); }} className="chip min-h-9 gap-1.5 text-sm"><t.icon className="h-4 w-4" /> {t.label}</button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Publishing">
            <p className="text-sm">Status: <b className="capitalize">{f.status}</b>{f.publishAt && f.status !== "draft" && <> · {new Date(f.publishAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</>}</p>
            <label htmlFor="pub-at" className="label mt-4">Publish date & time</label>
            <input id="pub-at" type="datetime-local" value={f.publishAt ? toLocalInput(f.publishAt) : ""} onChange={(e) => set("publishAt", e.target.value ? new Date(e.target.value).toISOString() : null)} className="field" />
            <p className="mt-1 text-xs text-ink-soft">Leave empty to publish now. A future date schedules it.</p>
          </Card>
          <Card title="Cover & details">
            <div className="space-y-4">
              <ImageField label="Cover image" value={f.cover} onChange={(cover) => set("cover", cover)} folder="journal" />
              <LField label="Category" value={f.category} onChange={(category) => set("category", category)} />
              <div><label htmlFor="p-author" className="label">Author</label><input id="p-author" value={f.author} onChange={(e) => set("author", e.target.value)} className="field" /></div>
              <div><label htmlFor="p-tags" className="label">Tags</label><input id="p-tags" defaultValue={f.tags.join(", ")} onBlur={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} className="field" /></div>
            </div>
          </Card>
          <Card title="SEO">
            <div className="space-y-4">
              <div>
                <label htmlFor="p-slug" className="label">URL</label>
                <div className="flex items-center rounded-xl border border-line bg-paper"><span className="pl-3 text-sm text-ink-soft">/journal/</span><input id="p-slug" value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="min-w-0 flex-1 bg-transparent py-3 pr-3 outline-none" /></div>
              </div>
              <LField label="SEO title" value={f.seo.title} onChange={(title) => set("seo", { ...f.seo, title })} />
              <LField label="Meta description" value={f.seo.description} onChange={(description) => set("seo", { ...f.seo, description })} multiline rows={2} />
            </div>
          </Card>
          {f.id && (
            <button type="button" onClick={() => confirm("Delete this post?") && s.run(() => deletePost(f.id!), () => router.push("/admin/journal"))} className="btn min-h-10 px-4 py-2 text-sm text-coral-ink hover:bg-coral-tint"><Trash2 className="h-4 w-4" /> Delete post</button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="min-w-0"><s.Status /></div>
          <div className="flex flex-wrap gap-2">
            {f.id && f.status === "published" && <a href={`/en/journal/${f.slug}`} target="_blank" className="btn min-h-10 px-4 py-2 text-sm hover:bg-ink/5">View</a>}
            <button type="button" disabled={s.pending} onClick={() => save("draft")} className="btn-outline min-h-10 py-2 text-sm">Save draft</button>
            {f.publishAt && new Date(f.publishAt) > new Date() ? (
              <button type="button" disabled={s.pending} onClick={() => save("scheduled")} className="btn-primary min-h-10 py-2 text-sm">{s.pending && <Loader2 className="h-4 w-4 animate-spin" />} Schedule</button>
            ) : (
              <button type="button" disabled={s.pending} onClick={() => save("published")} className="btn-primary min-h-10 py-2 text-sm">{s.pending && <Loader2 className="h-4 w-4 animate-spin" />} Publish</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function BlockEditor({ block: b, onChange, products }: { block: JournalBlock; onChange: (b: JournalBlock) => void; products: { slug: string; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  switch (b.type) {
    case "p":
      return <LField label="Text" value={b.text} onChange={(text) => onChange({ ...b, text })} multiline rows={4} />;
    case "h2":
    case "quote":
      return <LField label={b.type === "h2" ? "Heading" : "Quote"} value={b.text} onChange={(text) => onChange({ ...b, text })} />;
    case "image":
      return (
        <div className="space-y-3">
          <ImageField label="Image" value={b.src} onChange={(src) => onChange({ ...b, src })} folder="journal" />
          <LField label="Alt text" value={b.alt} onChange={(alt) => onChange({ ...b, alt })} />
          <LField label="Caption (handwritten style)" value={b.caption ?? eL()} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-3">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {b.images.map((src, k) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-xl bg-cream-deep">
                <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                <button type="button" onClick={() => onChange({ ...b, images: b.images.filter((_, m) => m !== k) })} aria-label="Remove image" className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-paper/90"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
            <li>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs text-ink-soft hover:border-ink/30">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Images className="h-5 w-5" />} Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const files = [...(e.target.files ?? [])];
                    setBusy(true);
                    const urls: string[] = [];
                    for (const file of files) urls.push(await uploadMedia(file, "journal"));
                    setBusy(false);
                    onChange({ ...b, images: [...b.images, ...urls] });
                  }}
                />
              </label>
            </li>
          </ul>
          <LField label="Caption" value={b.caption ?? eL()} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <div><label className="label" htmlFor={`v-${b.url}`}>YouTube or Vimeo link</label><input id={`v-${b.url}`} value={b.url} onChange={(e) => onChange({ ...b, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" className="field" /></div>
          <LField label="Caption" value={b.caption ?? eL()} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case "products":
      return (
        <fieldset>
          <legend className="label">Products to feature (shoppable cards)</legend>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button key={p.slug} type="button" aria-pressed={b.slugs.includes(p.slug)} onClick={() => onChange({ ...b, slugs: b.slugs.includes(p.slug) ? b.slugs.filter((x) => x !== p.slug) : [...b.slugs, p.slug] })} className="chip min-h-9 text-xs">{p.name}</button>
            ))}
          </div>
        </fieldset>
      );
  }
}

function Preview({ f, lang, products }: { f: PostForm; lang: "en" | "pt"; products: { slug: string; name: string; image?: string }[] }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-line/70 bg-cream p-6 md:p-10">
      <p className="text-center text-xs font-semibold tracking-wider text-azulejo uppercase">{f.category[lang]}</p>
      <h1 className="headline mt-3 text-center text-4xl">{f.title[lang] || <span className="text-ink-soft">Untitled</span>}</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-ink-soft">{f.excerpt[lang]}</p>
      {f.cover && <div className="relative mx-auto mt-8 aspect-[16/10] max-w-3xl overflow-hidden rounded-2xl"><Image src={f.cover} alt="" fill sizes="768px" className="object-cover" /></div>}
      <div className="prose-tc mx-auto mt-8 max-w-2xl">
        {f.blocks.map((b, i) => {
          if (b.type === "p") return <p key={i}>{b.text[lang]}</p>;
          if (b.type === "h2") return <h2 key={i}>{b.text[lang]}</h2>;
          if (b.type === "quote") return <p key={i} className="headline text-center text-2xl text-ink italic">“{b.text[lang]}”</p>;
          if (b.type === "image") return b.src ? <figure key={i} className="my-6"><div className="relative aspect-[16/10] overflow-hidden rounded-xl"><Image src={b.src} alt={b.alt[lang]} fill sizes="672px" className="object-cover" /></div>{b.caption?.[lang] && <figcaption className="hand mt-2 text-center">{b.caption[lang]}</figcaption>}</figure> : null;
          if (b.type === "gallery") return <div key={i} className="my-6 grid grid-cols-3 gap-2">{b.images.map((src) => <div key={src} className="relative aspect-square overflow-hidden rounded-lg"><Image src={src} alt="" fill sizes="224px" className="object-cover" /></div>)}</div>;
          if (b.type === "video") return <p key={i} className="my-6 rounded-xl bg-ink px-4 py-10 text-center text-sm text-white/80">▶ {b.url || "Video"}</p>;
          return (
            <div key={i} className={clsx("my-6 grid grid-cols-3 gap-3 rounded-2xl bg-paper p-4")}>
              {b.slugs.map((s) => { const p = products.find((x) => x.slug === s); return p ? <div key={s} className="text-sm"><div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-cream-deep">{p.image && <Image src={p.image} alt="" fill sizes="200px" className="object-cover" />}</div><p className="mt-2 font-medium text-ink">{p.name}</p></div> : null; })}
            </div>
          );
        })}
      </div>
    </article>
  );
}
