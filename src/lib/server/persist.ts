import "server-only";

/**
 * Minimal persistence seam for storefront writes (newsletter, waitlists,
 * analytics, enquiries). Without Supabase configured, writes are logged so
 * the storefront works locally; with it, rows go to the matching table.
 */
export async function insertRow(table: string, row: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") console.info(`[dev:${table}]`, JSON.stringify(row));
    return { ok: true, persisted: false };
  }
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  return { ok: res.ok, persisted: res.ok };
}

export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length < 255 && /^\S+@\S+\.\S+$/.test(v);
