import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { ImportForm } from "@/components/admin/import-form";

export const metadata = { title: "Import products" };

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="Import products" />
      <ImportForm />
    </div>
  );
}
