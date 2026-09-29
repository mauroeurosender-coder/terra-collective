"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Heart, Lock, Menu, Search, ShoppingBag, User } from "lucide-react";
import type { Collection } from "@/lib/types";
import { t, href, fmt } from "@/lib/i18n";
import { cartCount, useCart, useWishlist } from "@/lib/store/cart";
import { Logo } from "../illustrations";
import { Price, usePrefs } from "../providers";
import { Sheet } from "../ui/sheet";
import { CountrySelect, CurrencySelect, LocaleSwitch } from "./switchers";

export function Header({ collections }: { collections: Collection[] }) {
  const { locale, dict } = usePrefs();
  const pathname = usePathname();
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.openDrawer);
  const wishCount = useWishlist((s) => s.slugs.length);
  const count = cartCount(lines);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation — adjust state during render instead of in an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMega(false);
    setMobile(false);
    setSearch(false);
  }

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    const onClick = (e: MouseEvent) => !megaRef.current?.contains(e.target as Node) && setMega(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [mega]);

  if (/^\/(en|pt)\/checkout/.test(pathname)) return <CheckoutHeader />;

  const navLink = "relative px-3 py-2 text-[0.95rem] font-medium text-ink transition hover:text-azulejo";

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 border-b bg-cream/90 backdrop-blur-md transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-line shadow-[0_1px_0_rgb(28_42_58/0.02)]" : "border-transparent",
      )}
    >
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[4.5rem]">
        {/* Left: nav */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5 lg:hidden"
            aria-label={dict.nav.menu}
            onClick={() => setMobile(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5 lg:hidden"
            aria-label={dict.nav.search}
            onClick={() => setSearch(true)}
          >
            <Search className="h-5 w-5" />
          </button>
          <nav aria-label="Main" className="hidden items-center lg:flex">
            <div ref={megaRef} onMouseLeave={() => setMega(false)}>
              <button
                type="button"
                className={clsx(navLink, "inline-flex items-center gap-1")}
                aria-expanded={mega}
                aria-controls="mega-menu"
                onClick={() => setMega((v) => !v)}
                onMouseEnter={() => setMega(true)}
              >
                {dict.nav.shop}
                <ChevronDown className={clsx("h-4 w-4 transition", mega && "rotate-180")} />
              </button>
              <MegaMenu open={mega} collections={collections} />
            </div>
            <Link href={href(locale, "/journal")} className={navLink}>
              {dict.nav.journal}
            </Link>
            <Link href={href(locale, "/our-story")} className={navLink}>
              {dict.nav.story}
            </Link>
          </nav>
        </div>

        {/* Center: logo */}
        <Link href={href(locale)} className="justify-self-center text-ink" aria-label="Terra Collective, home">
          <Logo />
        </Link>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            className="hidden h-11 w-11 place-items-center rounded-full hover:bg-ink/5 lg:grid"
            aria-label={dict.nav.search}
            onClick={() => setSearch(true)}
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href={href(locale, "/wishlist")}
            className="relative hidden h-11 w-11 place-items-center rounded-full hover:bg-ink/5 sm:grid"
            aria-label={`${dict.nav.wishlist}${wishCount ? ` (${wishCount})` : ""}`}
          >
            <Heart className="h-5 w-5" />
            {wishCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-coral" />}
          </Link>
          <Link
            href={href(locale, "/account")}
            className="hidden h-11 w-11 place-items-center rounded-full hover:bg-ink/5 sm:grid"
            aria-label={dict.nav.account}
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative -mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5"
            aria-label={`${dict.nav.cart} (${count})`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span
              className={clsx(
                "absolute top-1 right-0.5 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-azulejo px-1 text-[0.68rem] font-bold text-white transition",
                count ? "scale-100" : "scale-0",
              )}
              aria-hidden
            >
              {count}
            </span>
          </button>
        </div>
      </div>

      <MobileMenu open={mobile} onClose={() => setMobile(false)} collections={collections} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </header>
  );
}

function MegaMenu({ open, collections }: { open: boolean; collections: Collection[] }) {
  const { locale, dict, price } = usePrefs();
  const quick = [
    { label: dict.nav.shopAll, to: "/shop" },
    { label: dict.nav.newIn, to: "/shop?sort=newest" },
    { label: dict.nav.bestsellers, to: "/shop?sort=bestselling" },
    { label: fmt(dict.nav.underPrice, { price: price(2500, { raw: true }) }), to: "/shop?max=25" },
    { label: fmt(dict.nav.underPrice, { price: price(5000, { raw: true }) }), to: "/shop?max=50" },
    { label: dict.nav.giftCards, to: "/gift-cards" },
  ];
  return (
    <div
      id="mega-menu"
      hidden={!open}
      className="absolute inset-x-0 top-full border-t border-line bg-cream shadow-[var(--shadow-lift)] animate-[drop-in_.22s_var(--ease-out-soft)_both]"
    >
      <div className="container-x grid grid-cols-[220px_1fr] gap-10 py-8">
        <ul className="space-y-1">
          {quick.map((q) => (
            <li key={q.to}>
              <Link href={href(locale, q.to)} className="block rounded-lg py-1.5 text-[0.95rem] text-ink-soft transition hover:text-azulejo">
                {q.label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="grid grid-cols-4 gap-5">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={href(locale, `/collections/${c.slug}`)} className="group block">
                <div className={clsx("relative aspect-[4/5] overflow-hidden rounded-2xl", c.accent)}>
                  <Image src={c.image} alt="" fill sizes="240px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                </div>
                <p className="mt-3 font-medium text-ink group-hover:text-azulejo">{t(c.name, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose, collections }: { open: boolean; onClose: () => void; collections: Collection[] }) {
  const { locale, dict } = usePrefs();
  const links = [
    { label: dict.nav.shopAll, to: "/shop" },
    ...collections.map((c) => ({ label: t(c.name, locale), to: `/collections/${c.slug}`, img: c.image, accent: c.accent })),
  ];
  return (
    <Sheet open={open} onClose={onClose} side="left" label={dict.nav.menu}>
      <div className="flex h-full flex-col overflow-y-auto px-6 pt-5 pb-8">
        <Logo className="mb-8" />
        <p className="eyebrow mb-3">{dict.nav.shop}</p>
        <ul className="mb-6 grid grid-cols-2 gap-3">
          {links.slice(1).map((l) => (
            <li key={l.to}>
              <Link href={href(locale, l.to)} className="block" onClick={onClose}>
                <div className={clsx("relative aspect-square overflow-hidden rounded-xl", "accent" in l && l.accent)}>
                  {"img" in l && l.img && <Image src={l.img} alt="" fill sizes="160px" className="object-cover" />}
                </div>
                <span className="mt-1.5 block text-sm font-medium">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="divide-y divide-line border-y border-line text-lg">
          {[
            { label: dict.nav.shopAll, to: "/shop" },
            { label: dict.nav.journal, to: "/journal" },
            { label: dict.nav.story, to: "/our-story" },
            { label: dict.nav.giftCards, to: "/gift-cards" },
            { label: dict.nav.wishlist, to: "/wishlist" },
            { label: dict.nav.account, to: "/account" },
          ].map((l) => (
            <li key={l.to}>
              <Link href={href(locale, l.to)} onClick={onClose} className="block py-3.5 headline text-xl">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-4 pt-8">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">{dict.nav.language}</span>
            <LocaleSwitch />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">{dict.nav.currency}</span>
            <CurrencySelect />
          </div>
          <div>
            <span className="mb-1.5 block text-sm text-ink-soft">{dict.nav.shipTo}</span>
            <CountrySelect id="ship-to-mobile" />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, dict, catalog } = usePrefs();
  const router = useRouter();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const query = n(q.trim());
    if (!query) return [];
    return catalog.filter((p) => [p.name.en, p.name.pt, p.short[locale]].some((s) => n(s).includes(query))).slice(0, 6);
  }, [q, catalog, locale]);
  const popular = locale === "pt" ? ["sardinha", "azeite", "cesto", "presente"] : ["sardine", "oil bottle", "straw bag", "gift"];

  return (
    <Sheet open={open} onClose={onClose} side="top" label={dict.nav.search}>
      <div className="container-x py-6 md:py-10">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`${href(locale, "/search")}?q=${encodeURIComponent(q.trim())}`);
          }}
          className="relative mx-auto max-w-2xl pr-12"
        >
          <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-ink-soft" />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={dict.search.placeholder}
            aria-label={dict.search.title}
            className="field rounded-full py-4 pl-12 text-lg"
          />
        </form>
        <div className="mx-auto mt-6 max-w-2xl">
          {q.trim() === "" ? (
            <div>
              <p className="eyebrow mb-3">{dict.search.popular}</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button key={p} type="button" className="chip" onClick={() => setQ(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.map((p) => (
                <li key={p.slug}>
                  <Link href={href(locale, `/products/${p.slug}`)} className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-paper">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                      <Image src={p.images[0]} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-medium leading-snug">{t(p.name, locale)}</p>
                      <Price cents={Math.min(...p.variants.map((v) => v.price))} className="text-sm text-ink-soft" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">{fmt(dict.search.none, { q })}</p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** Distraction-free header for checkout: logo, secure badge, back to cart. */
function CheckoutHeader() {
  const { locale, dict } = usePrefs();
  const openCart = useCart((s) => s.openDrawer);
  return (
    <header className="border-b border-line bg-cream">
      <div className="container-x flex h-16 items-center justify-between md:h-[4.5rem]">
        <Link href={href(locale)} aria-label="Terra Collective, home">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden items-center gap-1.5 text-ink-soft sm:flex">
            <Lock className="h-4 w-4" /> {dict.checkout.trust1}
          </span>
          <button type="button" onClick={openCart} className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5" aria-label={dict.checkout.backToCart}>
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
