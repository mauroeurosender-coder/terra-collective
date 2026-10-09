/** How a purchase is treated for Portuguese VAT, from the supplier’s country and the VAT on the invoice. */

export const EU_COUNTRIES = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"] as const;
const EU = new Set<string>(EU_COUNTRIES);

export type VatRegime = "domestic" | "intra_eu" | "foreign_vat" | "import";

export function purchaseRegime(country: string | null | undefined, vat: number): VatRegime {
  const c = (country || "PT").toUpperCase();
  if (c === "PT") return "domestic";
  if (EU.has(c)) return vat > 0 ? "foreign_vat" : "intra_eu";
  return "import";
}

export const regimeLabel: Record<VatRegime, string> = {
  domestic: "Compra em Portugal",
  intra_eu: "Aquisição intracomunitária",
  foreign_vat: "UE com IVA estrangeiro",
  import: "Importação (fora da UE)",
};

/** Self-assessed Portuguese VAT on an intra-EU acquisition (normal rate). */
export const selfAssessedVat = (net: number, rate = 23) => Math.round((net * rate) / 100);

/** VIES uses EL for Greece. */
export const viesCountry = (c: string) => (c.toUpperCase() === "GR" ? "EL" : c.toUpperCase());

/** Normalises a VAT number: keeps letters and digits, drops a leading country prefix. */
export function cleanVatNumber(raw: string | null | undefined, country?: string | null) {
  let v = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefixes = [country?.toUpperCase(), country ? viesCountry(country) : undefined].filter(Boolean) as string[];
  for (const p of prefixes) if (v.startsWith(p) && v.length > p.length + 4) v = v.slice(p.length);
  return v;
}
