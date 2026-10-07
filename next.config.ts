import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "tdwmieejwzysfnpxtvah.supabase.co";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      // The admin should never be cached or indexed
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
  images: {
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
