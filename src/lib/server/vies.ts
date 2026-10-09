import "server-only";
import { cleanVatNumber, viesCountry } from "../vat-regime";

/** Checks an EU VAT number with the European Commission’s VIES service (free, public). */
export async function checkVies(country: string, vatNumber: string): Promise<{ valid: boolean; name: string | null } | null> {
  const cc = viesCountry(country);
  const number = cleanVatNumber(vatNumber, country);
  if (!number || cc === "PT" && !/^\d{9}$/.test(number)) return null;
  try {
    const res = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${encodeURIComponent(number)}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const j = await res.json();
    // A busy or unavailable member-state service answers isValid:false with a userError — that is “unknown”, not “invalid”.
    if (typeof j?.isValid !== "boolean" || (j.userError && !["VALID", "INVALID"].includes(j.userError))) return null;
    return { valid: j.isValid, name: j.name && j.name !== "---" ? String(j.name) : null };
  } catch {
    return null;
  }
}
