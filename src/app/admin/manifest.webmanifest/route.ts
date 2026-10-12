/** Lets the admin be added to a phone's home screen as its own app. */
export function GET() {
  return Response.json(
    {
      name: "Terra Collective Admin",
      short_name: "Terra Admin",
      id: "/admin",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#F4EFE6",
      theme_color: "#1C2A3A",
      icons: [
        { src: "/admin/app-icon/192", sizes: "192x192", type: "image/png" },
        { src: "/admin/app-icon/512", sizes: "512x512", type: "image/png" },
        { src: "/admin/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Orders to ship", url: "/admin/orders/ctt" },
        { name: "Add an invoice", url: "/admin/accounting#upload" },
        { name: "Orders", url: "/admin/orders" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=86400" } },
  );
}
