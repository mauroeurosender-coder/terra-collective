import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, PackageOpen, Receipt, Truck, Wallet } from "lucide-react";
import type { Today } from "@/lib/admin/today";

type Tile = { href: string; icon: typeof Truck; value: string; label: string; sub?: string; urgent?: boolean; done?: boolean };

/** "What needs me today": one tap to each job. */
export function TodayPanel({ t }: { t: Today }) {
  const tiles: Tile[] = [
    { href: "/admin/orders/ctt", icon: Truck, value: String(t.toShip), label: t.toShip === 1 ? "order to ship" : "orders to ship", sub: t.toShip && t.oldestDays != null ? (t.oldestDays === 0 ? "oldest from today" : `oldest ${t.oldestDays} day${t.oldestDays === 1 ? "" : "s"} ago`) : "all shipped", urgent: (t.oldestDays ?? 0) >= 3, done: !t.toShip },
  ];
  if (t.drafts != null) tiles.push({ href: "/admin/orders?tab=all&invoice=draft", icon: Receipt, value: String(t.drafts + (t.invoiceErrors ?? 0)), label: "invoices to finalise", sub: t.invoiceErrors ? `${t.invoiceErrors} with an error` : "drafts in Moloni", urgent: !!t.invoiceErrors, done: !t.drafts && !t.invoiceErrors });
  if (t.docsToConfirm != null) tiles.push({ href: "/admin/accounting", icon: FileText, value: String(t.docsToConfirm), label: t.docsToConfirm === 1 ? "supplier document" : "supplier documents", sub: "to confirm", done: !t.docsToConfirm });
  if (t.toPay) tiles.push({ href: "/admin/accounting#payables", icon: Wallet, value: t.toPay.count ? `€${Math.round(t.toPay.amount / 100).toLocaleString("pt-PT")}` : "0", label: t.toPay.count === 1 ? "invoice to pay" : "invoices to pay", sub: t.toPay.late ? `${t.toPay.late} overdue` : t.toPay.count ? "due within 7 days" : "nothing due this week", urgent: t.toPay.late > 0, done: !t.toPay.count });
  tiles.push({ href: "/admin/inventory#reorder", icon: PackageOpen, value: String(t.reorder), label: t.reorder === 1 ? "item to reorder" : "items to reorder", sub: "runs out within 3 weeks", urgent: t.reorder > 0, done: !t.reorder });
  if (t.nextTax) tiles.push({ href: "/admin/accounting", icon: CalendarClock, value: t.nextTax.days <= 0 ? "Today" : `${t.nextTax.days} d`, label: t.nextTax.title.split("·")[0].trim(), sub: new Date(`${t.nextTax.date}T12:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "long" }), urgent: t.nextTax.days <= 7 });

  return (
    <section aria-label="Today" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map(({ href, icon: Icon, value, label, sub, urgent, done }) => (
        <Link key={href + label} href={href} className={clsx("group flex flex-col gap-1 rounded-[var(--radius-card)] border bg-paper p-4 transition hover:border-ink/30", urgent ? "border-coral/60" : "border-line/70")}>
          <span className="flex items-center gap-2 text-xs text-ink-soft">
            {done ? <CheckCircle2 className="h-4 w-4 text-olive" /> : urgent ? <AlertTriangle className="h-4 w-4 text-coral-ink" /> : <Icon className="h-4 w-4 text-azulejo" />}
            <span className="truncate">{label}</span>
          </span>
          <span className={clsx("text-2xl font-semibold tabular-nums", done && "text-ink-soft")}>{value}</span>
          {sub && <span className="truncate text-xs text-ink-soft">{sub}</span>}
        </Link>
      ))}
    </section>
  );
}
