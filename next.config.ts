import type { NextConfig } from "next";
import { execSync } from "node:child_process";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "tdwmieejwzysfnpxtvah.supabase.co";

// Build label shown at /api/version and in the admin footer: commit (when git is available) + build time.
let commit = "";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}
const buildId = `${commit || "build"}-${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Always use HTTPS for a year (incl. subdomains)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Don’t let other sites embed the shop or admin in a frame (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; upgrade-insecure-requests" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        ],
      },
      // Illustrations and photos in /public rarely change: let browsers keep them a day (and reuse them for a week while refreshing)
      { source: "/:folder(products|lifestyle|journal|reviews|insta)/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
      // The admin should never be cached or indexed
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
  images: {
    // Keep resized product photos for 31 days instead of 60 s, so the server doesn’t redo the same work.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // Product photos & video uploaded from the admin
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
      // Images referenced by listings imported from an Etsy CSV
      { protocol: "https", hostname: "i.etsystatic.com" },
    ],
  },
  experimental: {
    // Keep the dev cache in memory: this machine is low on disk space.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
