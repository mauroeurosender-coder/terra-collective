"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import { fmt } from "@/lib/i18n";
import { usePrefs } from "../providers";
import { Sheet } from "../ui/sheet";

type Media = { type: "image"; src: string } | { type: "video"; src: string; poster: string };

export function Gallery({
  images,
  video,
  alt,
  active,
  onActive,
  thumbs = true,
}: {
  images: string[];
  video?: string;
  alt: string;
  active: number;
  onActive: (i: number) => void;
  thumbs?: boolean;
}) {
  const { dict } = usePrefs();
  const media: Media[] = [...images.map((src) => ({ type: "image" as const, src })), ...(video ? [{ type: "video" as const, src: video, poster: images[0] }] : [])];
  const track = useRef<HTMLDivElement>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const fromScroll = useRef(false);

  // Scroll to the active slide when it changes from outside (thumbnail / variant).
  useEffect(() => {
    if (fromScroll.current) {
      fromScroll.current = false;
      return;
    }
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * active, behavior: "smooth" });
  }, [active]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) {
      fromScroll.current = true;
      onActive(i);
    }
  };

  const go = (d: number) => onActive((active + d + media.length) % media.length);

  return (
    <div className={clsx(thumbs && "md:grid md:grid-cols-[76px_1fr] md:gap-4")}>
      {/* Thumbnails */}
      <ul
        className={clsx("order-first hidden max-h-[640px] flex-col gap-3 overflow-y-auto scrollbar-none", thumbs && "md:flex")}
        aria-label="Thumbnails"
      >
        {media.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onActive(i)}
              aria-label={fmt(dict.product.image, { n: i + 1, total: media.length })}
              aria-current={i === active}
              className={clsx(
                "relative block aspect-[4/5] w-full overflow-hidden rounded-xl border-2 bg-cream-deep transition",
                i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={m.type === "image" ? m.src : m.poster} alt="" fill sizes="76px" className="object-cover" />
              {m.type === "video" && <Play className="absolute inset-0 m-auto h-5 w-5 fill-white text-white" />}
            </button>
          </li>
        ))}
      </ul>

      {/* Main */}
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none rounded-[var(--radius-card)] bg-cream-deep"
          aria-roledescription="carousel"
          aria-label={alt}
        >
          {media.map((m, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden"
              aria-roledescription="slide"
              aria-label={fmt(dict.product.image, { n: i + 1, total: media.length })}
            >
              {m.type === "image" ? (
                <button
                  type="button"
                  className="absolute inset-0 cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
                  }}
                  onMouseLeave={() => setOrigin(null)}
                  aria-label={dict.product.zoom}
                >
                  <Image
                    src={m.src}
                    alt={i === 0 ? alt : `${alt}, ${i + 1}`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-200 ease-out"
                    style={i === active && origin ? { transform: "scale(1.9)", transformOrigin: origin } : undefined}
                  />
                </button>
              ) : (
                <video src={m.src} poster={m.poster} controls playsInline muted loop className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>

        {media.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={dict.common.previous} className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 shadow-[var(--shadow-soft)] md:grid">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={dict.common.next} className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 shadow-[var(--shadow-soft)] md:grid">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 md:hidden" aria-hidden>
              {media.map((_, i) => (
                <span key={i} className={clsx("h-1.5 rounded-full bg-ink transition-all", i === active ? "w-5 opacity-90" : "w-1.5 opacity-30")} />
              ))}
            </div>
          </>
        )}
        <button type="button" onClick={() => setZoomOpen(true)} aria-label={dict.product.zoom} className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-paper/90 md:hidden">
          <Expand className="h-4 w-4" />
        </button>
      </div>

      <Sheet open={zoomOpen} onClose={() => setZoomOpen(false)} side="center" label={dict.product.zoom} className="max-w-5xl bg-paper">
        <div className="relative aspect-[4/5] max-h-[88dvh] w-full overflow-auto md:aspect-auto md:h-[88dvh]">
          {media[active]?.type === "image" && (
            <Image src={(media[active] as { src: string }).src} alt={alt} fill sizes="100vw" className="object-contain" />
          )}
        </div>
      </Sheet>
    </div>
  );
}
