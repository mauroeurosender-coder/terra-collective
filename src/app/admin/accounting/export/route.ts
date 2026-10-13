import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { quarterRange } from "@/lib/admin/tax";
import { docFileName, docFolder, summaryFiles } from "@/lib/admin/accounting-files";

/** Quarterly folder for the accountant: all documents + CSV summaries + VAT estimate, as one ZIP. */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "owner") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = quarterRange(new URL(req.url).searchParams.get("q") ?? "");
  const sb = await supabaseServer();
  const { data: docs } = await sb.from("accounting_docs").select("*").gte("date", q.from.toISOString().slice(0, 10)).lt("date", q.to.toISOString().slice(0, 10)).order("date");

  const zip = new JSZip();
  const root = zip.folder(`Terra Collective ${q.key}`)!;
  for (const d of docs ?? []) {
    if (!d.file_path) continue;
    const { data: file } = await sb.storage.from("accounting").download(d.file_path);
    if (file) root.folder(docFolder(d))!.file(docFileName(d), await file.arrayBuffer());
  }
  for (const f of await summaryFiles(sb, q.key)) root.file(f.name, f.content);

  const body = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(body as unknown as BodyInit, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="terra-collective-${q.key}.zip"` },
  });
}
