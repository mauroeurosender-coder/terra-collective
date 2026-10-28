/**
 * Groups ISO country codes into regions for the dashboard and the OSS threshold.
 * Europe is split into the EU (VAT area) and the rest of Europe; Portugal is kept apart
 * because domestic sales don't count towards the €10,000 OSS threshold.
 */

export type Region = "PT" | "EU" | "EUROPE" | "NA" | "SA" | "AS" | "OC" | "AF" | "OTHER";

export const regionLabel: Record<Region, string> = {
  PT: "Portugal",
  EU: "European Union",
  EUROPE: "Europe outside the EU",
  NA: "North & Central America",
  SA: "South America",
  AS: "Asia & Middle East",
  OC: "Oceania",
  AF: "Africa",
  OTHER: "Other / unknown",
};

export const EU_COUNTRIES = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));

const GROUPS: Record<Exclude<Region, "PT" | "EU" | "OTHER">, string> = {
  EUROPE: "GB UK NO CH IS LI AL BA ME MK RS XK MD UA BY RU TR AD MC SM VA GI GG JE IM FO",
  NA: "US CA MX GL BM PM GT BZ HN SV NI CR PA CU DO HT JM BS BB TT AG DM GD KN LC VC PR VI VG KY TC AW CW SX BQ MQ GP BL MF AI MS",
  SA: "BR AR CL CO PE VE EC BO PY UY GY SR GF FK",
  AS: "CN JP KR KP TW HK MO MN IN PK BD LK NP BT MV AF IR IQ SY LB JO IL PS SA AE QA BH KW OM YE GE AM AZ KZ UZ TM KG TJ TH VN LA KH MM MY SG ID PH BN TL",
  OC: "AU NZ PG FJ SB VU NC PF WS TO KI TV NR FM MH PW CK NU GU MP AS",
  AF: "ZA EG MA DZ TN LY SD SS ET ER DJ SO KE UG TZ RW BI CD CG GA GQ CM CF TD NE NG BJ TG GH CI LR SL GN GW SN GM ML BF MR CV ST AO ZM ZW MW MZ MG MU SC KM BW NA LS SZ RE YT SH",
};
const LOOKUP = new Map<string, Region>(Object.entries(GROUPS).flatMap(([r, codes]) => codes.split(" ").map((c) => [c, r as Region])));

/**
 * Places outside the EU VAT area although their country is in the EU (Canary Islands,
 * Ceuta, Melilla), found by Spanish postal code.
 */
export function outsideEuVat(country: string, postal?: string | null) {
  return country === "ES" && /^(35|38|51|52)\d{3}$/.test(String(postal ?? "").replace(/\s/g, ""));
}

export function regionOf(country: string, postal?: string | null): Region {
  const c = (country ?? "").toUpperCase();
  if (c === "PT") return "PT";
  if (EU_COUNTRIES.has(c)) return outsideEuVat(c, postal) ? "EUROPE" : "EU";
  return LOOKUP.get(c) ?? "OTHER";
}

/** The EU threshold for distance sales to consumers in other EU countries (art. 59.º-C RITI / Directive 2006/112/EC art. 59c). */
export const OSS_THRESHOLD = 1_000_000; // cents
