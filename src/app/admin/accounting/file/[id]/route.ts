import { NextResponse } from "next/server";
import { store } from "@/lib/config";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

/** Opens an accounting file through a short-lived signed link (the bucket is private). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.redirect(new URL("/admin/login", store.url));
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: doc } = await sb.from("accounting_docs").select("file_path").eq("id", id).single();
  if (!doc?.file_path) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await sb.storage.from("accounting").createSignedUrl(doc.file_path, 60);
  if (!data?.signedUrl) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
