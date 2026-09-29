import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "zdmrhgadfrqoqsozbmtl.supabase.co";

const nextConfig: NextConfig = {
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
