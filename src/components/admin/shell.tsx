"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  PanelsTopLeft,
  Settings,
  ShoppingBag,
  Star,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { Logo } from "../illustrations";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/admin/orders", ready: true, label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", ready: true, label: "Products", icon: Package },
  { href: "/admin/customers", ready: true, label: "Customers", icon: Users },
  { href: "/admin/journal", ready: true, label: "Journal", icon: FileText },
  { href: "/admin/analytics", ready: true, label: "Analytics", icon: BarChart3 },
  { href: "/admin/marketing", ready: true, label: "Marketing", icon: Megaphone },
  { href: "/admin/content", ready: true, label: "Content", icon: PanelsTopLeft },
  { href: "/admin/reviews", ready: true, label: "Reviews", icon: Star },
  { href: "/admin/settings", ready: true, label: "Settings", icon: Settings, owner: true },
];

type User = { name: string; email: string; role: "owner" | "staff" };

export function AdminShell({ user, demo, children }: { user: User; demo: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [last, setLast] = useState(pathname);
  if (last !== pathname) {
    setLast(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const items = nav.filter((n) => !n.owner || user.role === "owner");
  const navList = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map(({ href, label, icon: Icon, ready }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              {ready ? (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition",
                    active ? "bg-azulejo-tint text-azulejo-deep" : "text-ink hover:bg-ink/5",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" /> {label}
                </Link>
              ) : (
                <span aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] text-ink-soft/80">
                  <Icon className="h-[18px] w-[18px]" /> {label}
                  <span className="ml-auto rounded-full bg-ink/5 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase">Soon</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-4">
      <a href="/en" target="_blank" rel="noopener noreferrer" className="mb-3 flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <ExternalLink className="h-4 w-4" /> View store
      </a>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-azulejo text-sm font-semibold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-ink-soft capitalize">{user.role}</p>
        </div>
        <form action={signOut}>
          <button type="submit" aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper lg:flex">
        <Link href="/admin" className="px-6 pt-6 pb-2">
          <Logo className="[&_.headline]:text-[1.2rem]" />
        </Link>
        {navList}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin"><Logo className="[&_.headline]:text-[1.1rem] [&_svg]:h-7 [&_svg]:w-7" /></Link>
        <span className="w-11" />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/35 animate-fade-in" />
          <div className="relative flex h-full w-[280px] flex-col bg-paper shadow-[var(--shadow-lift)] animate-[drawer-in-left_.28s_var(--ease-out-soft)_both]">
            <div className="flex items-center justify-between px-4 pt-4">
              <Logo className="[&_.headline]:text-[1.1rem]" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navList}
            {footer}
          </div>
        </div>
      )}

      <div className="min-w-0">
        {demo && (
          <p className="border-b border-mustard/40 bg-mustard-tint px-4 py-2 text-center text-xs font-medium text-ink sm:text-sm">
            Demo mode: showing sample data. Connect Supabase in <code className="rounded bg-white/70 px-1">.env.local</code> to see real orders.
          </p>
        )}
        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
