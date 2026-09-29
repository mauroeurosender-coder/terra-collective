import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/admin/auth";
import { Logo } from "@/components/illustrations";
import { LoginForm } from "@/components/admin/login-form";

// Always render per request: the admin depends on the signed-in session.
export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (supabaseConfigured && (await getAdminSession())) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-paper p-8 shadow-[var(--shadow-soft)]">
        <Logo />
        <h1 className="headline mt-8 text-3xl">Admin</h1>
        {supabaseConfigured ? (
          <LoginForm />
        ) : (
          <div className="mt-4 space-y-4 text-sm text-ink-soft">
            <p>Supabase isn’t connected yet, so the admin runs on demo data.</p>
            <Link href="/admin" className="btn-primary w-full">Enter demo admin</Link>
          </div>
        )}
      </div>
    </main>
  );
}
