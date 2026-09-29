import type { Metadata } from "next";
import { fontVars } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Terra Collective", template: "%s · Admin · Terra Collective" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-dvh bg-cream-deep/60">{children}</body>
    </html>
  );
}
