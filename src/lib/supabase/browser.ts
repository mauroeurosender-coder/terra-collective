"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client using the signed-in admin's session cookie (RLS applies). */
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
