import "server-only";
import { store } from "../config";
import { supabaseService } from "../supabase/server";
import { SALES_FOLDER, docFileName, docFolder, quarterFolder, quarterKeyOf, summaryFiles } from "../admin/accounting-files";

/*
 * Copies accounting documents and issued Moloni invoices into the owner's Google Drive:
 *   My Drive / Terra Collective / Contabilidade / 2026 / 2026 T4 (out-dez) / 1 Compras / …
 * Scope drive.file: the site can only see and change files it created itself.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (OAuth "Web application" client).
 */

type DriveData = {
  refresh_token?: string;
  email?: string;
  folders?: Record<string, string>; // "Contabilidade/2026/…" → folder id
  summaries?: Record<string, string>; // "2026-Q4/Documentos.csv" → file id
  last_sync_at?: string;
  last_sync_result?: string;
};

const ROOT = "Terra Collective";
const SCOPES = "https://www.googleapis.com/auth/drive.file openid email";
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const googleRedirectUri = () => `${store.url}/api/google/callback`;

export async function getDrive(): Promise<DriveData> {
  const { data } = await supabaseService().from("integrations").select("data").eq("provider", "google_drive").maybeSingle();
  return (data?.data ?? {}) as DriveData;
}
async function saveDrive(patch: Partial<DriveData>) {
  const cur = await getDrive();
  await supabaseService().from("integrations").upsert({ provider: "google_drive", data: { ...cur, ...patch }, updated_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ OAuth */

export function googleAuthUrl(state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleRedirectUri(), response_type: "code", scope: SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state }).toString();
  return u.toString();
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google: ${j.error_description ?? j.error ?? res.status}`);
  return j as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };
}

export async function finishGoogleAuth(code: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: googleRedirectUri() });
  if (!t.refresh_token) throw new Error("Google didn’t return a refresh token. Remove the app’s access in your Google account and connect again.");
  const email = t.id_token ? (JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString()) as { email?: string }).email : undefined;
  // New account → forget folder ids from any previous account.
  await supabaseService().from("integrations").upsert({ provider: "google_drive", data: { refresh_token: t.refresh_token, email }, updated_at: new Date().toISOString() });
}

export async function disconnectDrive() {
  const d = await getDrive();
  if (d.refresh_token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(d.refresh_token)}`, { method: "POST" }).catch(() => null);
  await supabaseService().from("integrations").delete().eq("provider", "google_drive");
}

let cached: { token: string; until: number } | null = null;
async function accessToken() {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const d = await getDrive();
  if (!d.refresh_token) throw new Error("Google Drive não está ligado.");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: d.refresh_token });
  cached = { token: t.access_token, until: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

/* ------------------------------------------------------------------ Drive calls */

class DriveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url.startsWith("http") ? url : `https://www.googleapis.com/drive/v3/${url}`, { ...init, headers: { authorization: `Bearer ${await accessToken()}`, ...init.headers }, cache: "no-store" });
  const j = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new DriveError(res.status, `Google Drive: ${(j as { error?: { message?: string } }).error?.message ?? res.status}`);
  return j as T;
}

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findOrCreateFolder(name: string, parent: string | null): Promise<string> {
  const where = [`name = '${q(name)}'`, "mimeType = 'application/vnd.google-apps.folder'", "trashed = false", parent ? `'${parent}' in parents` : "'root' in parents"].join(" and ");
  const found = await api<{ files: { id: string }[] }>(`files?q=${encodeURIComponent(where)}&fields=files(id)&pageSize=1`);
  if (found.files[0]) return found.files[0].id;
  const made = await api<{ id: string }>("files?fields=id", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parent ? [parent] : undefined }) });
  return made.id;
}

/** Folder id for a path under "Terra Collective", creating what’s missing (ids cached; re-created if deleted). */
async function folderFor(parts: string[], data: DriveData): Promise<string> {
  data.folders ??= {};
  let parent: string | null = null;
  let path = "";
  for (const name of [ROOT, ...parts]) {
    path = path ? `${path}/${name}` : name;
    const known: string | undefined = data.folders[path];
    if (known) {
      parent = known;
      continue;
    }
    parent = await findOrCreateFolder(name, parent);
    data.folders[path] = parent;
  }
  return parent!;
}

async function upload(parent: string, name: string, mime: string, bytes: ArrayBuffer | Uint8Array | string) {
  const boundary = `tc${Math.random().toString(36).slice(2)}`;
  const body = new Blob([
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent] })}\r\n--${boundary}\r\ncontent-type: ${mime}\r\n\r\n`,
    typeof bytes === "string" ? bytes : new Uint8Array(bytes as ArrayBuffer),
    `\r\n--${boundary}--`,
  ]);
  return api<{ id: string }>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body });
}

const replaceContent = (id: string, mime: string, content: string) =>
  api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "content-type": mime }, body: content });

export async function trashDriveFile(id: string | null | undefined) {
  if (!id || !(await getDrive()).refresh_token) return;
  await api(`files/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) }).catch(() => null);
}

/* ------------------------------------------------------------------ Sync */

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copies new documents/invoices, moves or renames edited ones and refreshes the quarter summaries.
 * docIds: only those documents (right after an upload or edit), skipping invoices and summaries.
 */
export async function syncDrive(opts: { docIds?: string[] } = {}) {
  const data = await getDrive();
  if (!data.refresh_token || !googleConfigured()) return { skipped: "not connected" as const };
  const sb = supabaseService();
  const touched = new Set<string>();
  let copied = 0;
  let moved = 0;
  const errors: string[] = [];

  let dq = sb.from("accounting_docs").select("id, direction, kind, party_country, vat, date, created_at, party_name, number, file_name, file_path, drive_file_id, drive_parent, drive_name").not("file_path", "is", null);
  dq = opts.docIds ? dq.in("id", opts.docIds) : dq.order("created_at").limit(400);
  const { data: docs } = await dq;
  for (const d of (docs ?? []) as any[]) {
    const key = quarterKeyOf(d.date ?? d.created_at);
    const [year] = key.split("-");
    const name = docFileName(d);
    try {
      let parent = await folderFor(["Contabilidade", year, quarterFolder(key), docFolder(d)], data);
      if (!d.drive_file_id) {
        if (copied >= 40) continue; // keep each run short; the next run continues
        const { data: blob } = await sb.storage.from("accounting").download(d.file_path);
        if (!blob) continue;
        let up: { id: string };
        try {
          up = await upload(parent, name, blob.type || "application/pdf", await blob.arrayBuffer());
        } catch (e) {
          if (!(e instanceof DriveError) || e.status !== 404) throw e;
          data.folders = {}; // a cached folder was deleted in Drive: rebuild the path once
          parent = await folderFor(["Contabilidade", year, quarterFolder(key), docFolder(d)], data);
          up = await upload(parent, name, blob.type || "application/pdf", await blob.arrayBuffer());
        }
        await sb.from("accounting_docs").update({ drive_file_id: up.id, drive_parent: parent, drive_name: name }).eq("id", d.id);
        copied++;
        touched.add(key);
      } else if (d.drive_parent !== parent || d.drive_name !== name) {
        const params = new URLSearchParams({ fields: "id" });
        if (d.drive_parent !== parent) {
          params.set("addParents", parent);
          if (d.drive_parent) params.set("removeParents", d.drive_parent);
        }
        await api(`files/${d.drive_file_id}?${params}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
        await sb.from("accounting_docs").update({ drive_parent: parent, drive_name: name }).eq("id", d.id);
        moved++;
        touched.add(key);
      }
    } catch (e) {
      if (e instanceof DriveError && e.status === 404 && d.drive_file_id) {
        await sb.from("accounting_docs").update({ drive_file_id: null, drive_parent: null, drive_name: null }).eq("id", d.id); // deleted in Drive: copy again next run
      } else errors.push((e as Error).message);
    }
  }

  if (!opts.docIds) {
    // Issued Moloni invoices (PDF) → "5 Faturas emitidas (Moloni)"
    const { data: inv } = await sb.from("orders").select("id, number, invoice_ref, invoice_url, shipped_at, created_at").eq("invoice_status", "issued").not("invoice_url", "is", null).is("invoice_drive_id", null).order("created_at").limit(30);
    for (const o of (inv ?? []) as any[]) {
      try {
        const res = await fetch(o.invoice_url, { cache: "no-store" });
        if (!res.ok) continue;
        const key = quarterKeyOf(o.shipped_at ?? o.created_at);
        const parent = await folderFor(["Contabilidade", key.split("-")[0], quarterFolder(key), SALES_FOLDER], data);
        const name = `${String(o.invoice_ref ?? "Fatura").replace(/[\\/]/g, "-")} · ${o.number}.pdf`;
        const up = await upload(parent, name, "application/pdf", await res.arrayBuffer());
        await sb.from("orders").update({ invoice_drive_id: up.id }).eq("id", o.id);
        copied++;
        touched.add(key);
      } catch (e) {
        errors.push((e as Error).message);
      }
    }

    // Quarter summaries: the current quarter, plus any quarter that changed in this run.
    touched.add(quarterKeyOf(new Date().toISOString()));
    data.summaries ??= {};
    for (const key of touched) {
      try {
        const parent = await folderFor(["Contabilidade", key.split("-")[0], quarterFolder(key)], data);
        for (const f of await summaryFiles(sb, key)) {
          const k = `${key}/${f.name}`;
          const id = data.summaries[k];
          try {
            if (id) {
              await replaceContent(id, f.mime, f.content);
              continue;
            }
          } catch (e) {
            if (!(e instanceof DriveError) || e.status !== 404) throw e;
          }
          data.summaries[k] = (await upload(parent, f.name, f.mime, f.content)).id;
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
  }

  const result = `${copied} copiado${copied === 1 ? "" : "s"}${moved ? `, ${moved} atualizado${moved === 1 ? "" : "s"}` : ""}${errors.length ? `, ${errors.length} erro${errors.length === 1 ? "" : "s"}: ${[...new Set(errors)][0]}` : ""}`;
  await saveDrive({ folders: data.folders, summaries: data.summaries, ...(opts.docIds ? {} : { last_sync_at: new Date().toISOString(), last_sync_result: result }) });
  return { copied, moved, errors, result };
}

/** Never lets a Drive problem break an upload or a save. */
export async function syncDriveQuietly(docIds: string[]) {
  try {
    await syncDrive({ docIds });
  } catch (e) {
    console.error("[drive]", (e as Error).message);
  }
}

export async function driveFolderUrl() {
  const id = (await getDrive()).folders?.[`${ROOT}/Contabilidade`];
  return id ? `https://drive.google.com/drive/folders/${id}` : null;
}
