import { NextResponse } from "next/server";

/** Which build is answering (set at build time). Helps spot an old server process still running after a deploy. */
export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", startedAt: STARTED },
    { headers: { "cache-control": "no-store" } },
  );
}
const STARTED = new Date().toISOString();
