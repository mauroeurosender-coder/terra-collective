"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

type Side = "right" | "left" | "top" | "center";

const panel: Record<Side, string> = {
  right: "ml-auto h-dvh max-h-dvh w-full max-w-[440px] animate-[drawer-in_.32s_var(--ease-out-soft)_both]",
  left: "mr-auto h-dvh max-h-dvh w-full max-w-[380px] animate-[drawer-in-left_.32s_var(--ease-out-soft)_both]",
  top: "mb-auto w-full max-w-none animate-[drop-in_.28s_var(--ease-out-soft)_both]",
  center:
    "m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-4xl rounded-[var(--radius-card)] animate-[pop-in_.24s_var(--ease-out-soft)_both]",
};

/**
 * Native <dialog>-based sheet: focus trap, Escape to close and an inert
 * background come from the platform.
 */
export function Sheet({
  open,
  onClose,
  side = "right",
  label,
  children,
  className,
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  label: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        "max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] backdrop:animate-[fade-in_.2s_ease-out_both]",
        side !== "center" && "m-0 h-full max-h-none w-full",
      )}
    >
      {open && (
        <div className={clsx("relative flex flex-col overflow-hidden bg-cream shadow-[var(--shadow-lift)]", panel[side], className)}>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-ink/5"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
