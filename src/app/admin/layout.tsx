import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Terra Collective", template: "%s · Admin · Terra Collective" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Terra Admin", statusBarStyle: "default" },
  icons: { icon: "/admin/app-icon/192", apple: "/admin/app-icon/180" },
};

export const viewport: Viewport = { themeColor: "#1C2A3A", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-dvh bg-cream-deep/60">{children}</body>
    </html>
  );
}
