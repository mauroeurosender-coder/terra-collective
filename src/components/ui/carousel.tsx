"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrefs } from "../providers";

/** Scroll-snap carousel: native swipe on touch, arrow buttons on desktop. */
export function Carousel({ children, label }: { children: React.ReactNode[]; label: string }) {
  const { dict } = usePrefs();
  const ref = useRef<HTMLUListElement>(null);
  const scroll = (d: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 lg:gap-6"
      >
        {children.map((c, i) => (
          <li key={i} className="w-[68%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-4.5rem)/4)]">
            {c}
          </li>
        ))}
      </ul>
      <div className="absolute -top-16 right-0 hidden gap-2 lg:flex">
        <button type="button" onClick={() => scroll(-1)} aria-label={dict.common.previous} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper hover:border-ink/40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => scroll(1)} aria-label={dict.common.next} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper hover:border-ink/40">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
