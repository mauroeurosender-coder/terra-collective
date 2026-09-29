import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/shell";

// Always render per request: the admin depends on the signed-in session.
export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell user={{ name: session.name, email: session.email, role: session.role }} demo={session.mode === "demo"}>
      {children}
    </AdminShell>
  );
}
