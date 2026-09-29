import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, locales } from "@/lib/config";
import { countries } from "@/lib/geo";
import { countryFromHeaders } from "@/lib/server/country";

const currencyFor = (country: string) => (country === "GB" ? "GBP" : country === "US" ? "USD" : "EUR");

function detectLocale(req: NextRequest) {
  const cookie = req.cookies.get("tc_locale")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;
  const accept = req.headers.get("accept-language") ?? "";
  return /(^|,)\s*pt\b/i.test(accept) ? "pt" : defaultLocale;
}

function detectCountry(req: NextRequest) {
  const header = countryFromHeaders(req.headers) ?? "";
  return countries.some((c) => c.code === header) ? header : null;
}

/** Keeps the Supabase auth cookie fresh for /admin; the layout does the real staff check. */
async function adminSession(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !anon) return res;
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user && req.nextUrl.pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminSession(req);
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));

  // ?preview-theme=christmas lets you look at a seasonal theme before it goes live (?preview-theme=off to stop).
  const preview = req.nextUrl.searchParams.get("preview-theme");
  if (preview) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("preview-theme");
    const r = NextResponse.redirect(clean);
    if (preview === "off") r.cookies.delete("tc_theme_preview");
    else if (/^[a-z-]{2,30}$/.test(preview)) r.cookies.set("tc_theme_preview", preview, { path: "/", maxAge: 60 * 60 * 2, sameSite: "lax" });
    return r;
  }

  let res: NextResponse;
  if (hasLocale) {
    res = NextResponse.next();
    const current = pathname.split("/")[1];
    if (req.cookies.get("tc_locale")?.value !== current) {
      res.cookies.set("tc_locale", current, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
  } else {
    const url = req.nextUrl.clone();
    url.pathname = `/${detectLocale(req)}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.redirect(url);
  }

  if (!req.cookies.get("tc_country")) {
    // Without a geo header (local dev, self-hosting) assume the home market.
    const country = detectCountry(req) ?? "PT";
    res.cookies.set("tc_country", country, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    if (!req.cookies.get("tc_currency")) {
      res.cookies.set("tc_currency", currencyFor(country), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
  }
  return res;
}

export const config = {
  // Skip API, Next internals and any file with an extension (images, sitemap.xml, robots.txt…)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
