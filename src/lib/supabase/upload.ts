"use client";

import { supabaseBrowser } from "./browser";

/** Uploads a file to the public `media` bucket and returns its public URL. */
export async function uploadMedia(file: File, folder: string) {
  if (file.size > (file.type.startsWith("video") ? 50 : 10) * 1024 * 1024) throw new Error(`${file.name} is too large.`);
  const sb = supabaseBrowser();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from("media").upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (error) throw error;
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}
