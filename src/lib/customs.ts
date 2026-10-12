/** Default customs description and tariff code (código pautal) from a product name; editable per product. */
export function defaultCustoms(name: string): { desc: string; hs: string } {
  const n = name.toLowerCase();
  const desc = name.replace(/\s+/g, " ").trim().slice(0, 50);
  if (/playing card|deck of cards|cards deck|baralho|poker/.test(n)) return { desc, hs: "9504400000" };
  if (/dish|plate|bowl|cup|mug|shaker|olive|boat|tray|spoon rest|jug|pitcher|teapot|tableware|butter/.test(n)) return { desc, hs: "6912005000" };
  if (/sardine|sardinha|ceramic|cerâmica|tile|azulejo|ornament|wall|fish/.test(n)) return { desc, hs: "6913909890" };
  return { desc, hs: "" };
}
