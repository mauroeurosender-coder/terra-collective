import { ImageResponse } from "next/og";

/** Home-screen icon: a cream sardine on navy (sizes 180, 192, 512). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Math.min(1024, Math.max(32, Number((await params).size) || 192));
  const fish = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-18 50 50)"><path d="M18 50 C30 34 58 33 74 46 L86 37 L83 50 L86 63 L74 54 C58 67 30 66 18 50 Z" fill="#FAF7F2"/><circle cx="29" cy="48" r="2.6" fill="#1C2A3A"/><path d="M38 44 C46 47 46 53 38 56" stroke="#4E7FB8" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M48 42 C57 46 57 54 48 58" stroke="#E2A93B" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></svg>`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C2A3A" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(fish)}`} width={n * 0.98} height={n * 0.98} alt="" />
      </div>
    ),
    { width: n, height: n, headers: { "cache-control": "public, max-age=604800" } },
  );
}
