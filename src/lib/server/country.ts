/** Visitor country (ISO code) from the hosting provider's geo headers. No IP is stored. */
export function countryFromHeaders(h: Headers): string | null {
  const direct = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? h.get("x-country");
  if (direct && /^[A-Z]{2}$/i.test(direct)) return direct.toUpperCase();
  const nf = h.get("x-nf-geo"); // Netlify: base64 JSON { country: { code } }
  if (nf) {
    try {
      const geo = JSON.parse(atob(nf));
      if (/^[A-Z]{2}$/.test(geo?.country?.code)) return geo.country.code;
    } catch {}
  }
  return null;
}
