import Link from "next/link";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { OrderStatus } from "@/lib/admin/types";

export const eur = (cents: number, digits = 0) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(cents / 100);

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("min-w-0 rounded-[var(--radius-card)] border border-line/70 bg-paper p-5 md:p-6", className)} aria-label={title}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[0.95rem] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Stat tile: headline number + change vs the previous period (icon + text, never colour alone). */
export function Kpi({ label, value, current, previous, periodLabel, format = "number", className }: { label: string; value: string; current: number; previous: number; periodLabel: string; format?: "number" | "percent-points"; className?: string }) {
  let change: number | null = null;
  if (format === "percent-points") change = (current - previous) * 100;
  else if (previous > 0) change = ((current - previous) / previous) * 100;
  const up = change != null && change > 0.05;
  const down = change != null && change < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const text = change == null ? "no data before" : `${up ? "+" : ""}${change.toFixed(1)}${format === "percent-points" ? " pts" : "%"}`;
  return (
    <div className={clsx("min-w-0 rounded-[var(--radius-card)] border border-line/70 bg-paper p-4 sm:p-5", className)}>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="headline mt-2 text-[2rem] leading-none tabular-nums md:text-[2.3rem]">{value}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        <span className={clsx("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", up ? "bg-olive-tint text-olive" : down ? "bg-coral-tint text-coral-ink" : "bg-ink/5 text-ink-soft")}>
          <Icon aria-hidden className="h-3.5 w-3.5" />
          {text}
        </span>
        <span className="text-ink-soft">vs {periodLabel}</span>
      </p>
    </div>
  );
}

const statusStyles: Record<OrderStatus, string> = {
  pending_payment: "bg-mustard-tint text-ink",
  paid: "bg-azulejo-tint text-azulejo-deep",
  packing: "bg-rose-tint text-coral-ink",
  shipped: "bg-olive-tint text-olive",
  delivered: "bg-ink/5 text-ink-soft",
  cancelled: "bg-ink/5 text-ink-soft line-through",
  refunded: "bg-ink/5 text-ink-soft",
};
const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", statusStyles[status])}>{statusLabels[status]}</span>;
}

/** Horizontal single-hue bars with direct value labels (magnitude → one hue). */
export function BarList({ rows, format }: { rows: { key: string; label: React.ReactNode; value: number; sub?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="group grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="relative h-6" title={`${typeof r.label === "string" ? r.label : r.key}: ${format(r.value)}${r.sub ? ` · ${r.sub}` : ""}`}>
            <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-azulejo transition-opacity group-hover:opacity-85" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <span className="text-right tabular-nums">
            {format(r.value)}
            {r.sub && <span className="ml-1.5 text-xs text-ink-soft">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex text-sm text-ink-soft hover:text-ink">← {back.label}</Link>
        )}
        <h1 className="headline text-3xl md:text-4xl">{title}</h1>
        {subtitle && <div className="mt-1.5 text-sm text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function NotConnected() {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-10 text-center">
      <p className="headline text-2xl">Connect Supabase to use this section</p>
      <p className="mt-2 text-sm text-ink-soft">Add your keys to <code>.env.local</code> and run the SQL files in <code>supabase/</code>.</p>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line/70 bg-paper px-6 py-14 text-center">
      <p className="headline text-2xl">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function TestBadge() {
  return <span className="ml-1.5 rounded bg-mustard px-1.5 py-0.5 align-middle text-[0.6rem] font-bold tracking-wider text-ink">TEST</span>;
}
