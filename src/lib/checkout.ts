import { getCountry } from "./geo";
import { enabledPayments } from "./settings";

export type PaymentMethod = "card" | "mbway" | "multibanco" | "paypal" | "klarna";

export type CheckoutForm = {
  email: string;
  marketing: boolean;
  country: string;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  postal: string;
  city: string;
  state: string;
  phone: string;
  nif: string;
  mbwayPhone: string;
};

export const emptyForm = (country: string): CheckoutForm => ({
  email: "",
  marketing: false,
  country,
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  postal: "",
  city: "",
  state: "",
  phone: "",
  nif: "",
  mbwayPhone: "",
});

/** Payment methods offered per destination (MB WAY & Multibanco are Portugal-only). */
export function methodsFor(country: string): PaymentMethod[] {
  const pt = getCountry(country).zone === "PT";
  const klarna = ["PT", "ES", "FR", "DE", "IT", "NL", "BE", "AT", "IE", "DK", "SE", "GB", "US"].includes(country);
  const all: PaymentMethod[] = ["card", ...(pt ? (["mbway", "multibanco"] as const) : []), "paypal", ...(klarna ? (["klarna"] as const) : [])];
  const on = all.filter((m) => enabledPayments[m] !== false);
  return on.length ? on : ["card"];
}

/** Portuguese NIF checksum (mod 11). */
export function validNif(nif: string) {
  const n = nif.replace(/\s/g, "").replace(/^PT/i, "");
  if (!/^[125689]\d{8}$/.test(n) && !/^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(n)) return false;
  const sum = n
    .slice(0, 8)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (9 - i), 0);
  const check = 11 - (sum % 11);
  return Number(n[8]) === (check >= 10 ? 0 : check);
}

export type FieldError = "required" | "email" | "postal" | "nif" | "phone";

export function validateCheckout(f: CheckoutForm, payment: PaymentMethod): Partial<Record<keyof CheckoutForm, FieldError>> {
  const e: Partial<Record<keyof CheckoutForm, FieldError>> = {};
  const c = getCountry(f.country);
  const req = (k: keyof CheckoutForm) => {
    if (!String(f[k]).trim()) e[k] = "required";
  };
  (["email", "firstName", "lastName", "address1", "postal", "city", "phone"] as const).forEach(req);
  if (c.requiresState) req("state");
  if (!e.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "email";
  if (!e.postal && c.postalPattern && !c.postalPattern.test(f.postal.trim())) e.postal = "postal";
  if (!e.phone && !/^\+?[\d\s()-]{7,20}$/.test(f.phone)) e.phone = "phone";
  if (f.nif.trim() && c.code === "PT" && !validNif(f.nif)) e.nif = "nif";
  if (payment === "mbway" && !/^(\+351)?\s?9\d{8}$/.test(f.mbwayPhone.replace(/\s/g, ""))) e.mbwayPhone = "phone";
  return e;
}
