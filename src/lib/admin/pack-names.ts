/**
 * Turns long Etsy listing titles and variant labels into what goes in the box:
 * a short item name, the option that matters when packing, and the number of pieces
 * ("Set of Six Ceramic Sardines", qty 1 → 6 pieces).
 */

export type PackLine = { name: string; variant: string; qty: number; /** Sets bought, when qty was multiplied (e.g. "1 set of 6"). */ sets?: string };

/** First match wins: specific listings first, generic words last. Matched against the full title. */
const SHORT: [RegExp, string][] = [
  [/poker|playing cards/i, "Deck of Cards"],
  [/bottle opener|corkscrew/i, "Sardine Bottle Opener"],
  [/coin bank|piggy bank/i, "Sardine Tin Coin Bank"],
  [/notebook|journal|notepad/i, "Tinned Fish Notebook"],
  [/pastel de nata/i, "Pastel de Nata Shaker"],
  [/salt and pepper|salt & pepper|stoneware shakers/i, "Salt & Pepper Shakers"],
  [/olive boat/i, "Sardine Olive Boat"],
  [/sardines? painting|art print|folk art print|poster/i, "Art Print"],
  [/be unique/i, "Sardines “Be Unique”"],
  [/(six|6).*sardines?.*yellow/i, "Sardines Yellow"],
  [/(six|6).*sardines?.*green/i, "Sardines Green"],
  [/(six|6).*sardines?.*orange/i, "Sardines Orange & Blue"],
  [/(five|5).*sardine/i, "Sardines (set of 5)"],
  [/blue & orange.*sardine|sardine.*blue & orange/i, "Sardine Blue & Orange"],
  [/glossy.*sardine/i, "Glossy Sardine"],
  [/sardine wall decor|ceramic sardine/i, "Ceramic Sardine"],
  [/rectangular|embossed/i, "Embossed Oil Cruet"],
  [/geometric.*(oil|vinegar|dispenser)/i, "Geometric Olive Oil Cruet"],
  [/green recycled glass cruet/i, "Green Glass Cruet"],
  [/recycled glass.*bottle/i, "Recycled Glass Bottles"],
  [/pumpkin/i, "Pumpkin Oil Cruet"],
  [/lemon/i, "Lemon Oil Cruet"],
  [/fish olive oil|sardine cruet/i, "Sardine Oil Cruet"],
  [/blue olive oil dispenser/i, "Blue Oil Cruet"],
  [/(oil|vinegar).*(cruet|bottle|dispenser|pourer)|(cruet|dispenser).*oil/i, "Ceramic Oil Cruet"],
  [/aperitivo|olive well/i, "Aperitivo Plate"],
  [/appetizer plate/i, "Appetizer Plate with Dip Bowl"],
  [/fish (shaped )?(dip )?bowls?/i, "Fish Bowls"],
  [/fish dish/i, "Fish Dish"],
  [/butter dish/i, "Butter Dish"],
  [/egg (holder|tray)/i, "Egg Holder"],
  [/soap dish/i, "Soap Dish"],
  [/\bsoap\b/i, "Turmeric Soap"],
  [/(tile|azulejo).*wine.*stopper|wine.*stopper.*(tile|azulejo)/i, "Tile Wine Stopper"],
  [/wine.*stopper/i, "Wine Stopper"],
  [/coaster/i, "Tile Coasters"],
  [/espresso/i, "Espresso Cups"],
  [/yellow & black.*seahorse/i, "Seahorse Yellow & Black"],
  [/seahorses/i, "Seahorses (set of 5)"],
  [/seahorse/i, "Ceramic Seahorse"],
  [/chameleon/i, "Ceramic Chameleon"],
  [/frogs/i, "Ceramic Frogs (set of 5)"],
  [/frog/i, "Ceramic Frog"],
  [/snail/i, "Ceramic Snail"],
  [/butterfly/i, "Ceramic Butterfly"],
  [/ring box|proposal/i, "Ring Box"],
  [/trinket box|keepsake box/i, "Azulejo Box"],
  [/cherry/i, "Cherry Tray"],
  [/tablecloth/i, "Fish Tablecloth"],
  [/blanket|throw/i, "Wool Blanket"],
  [/cinnamon shaker/i, "Pastel de Nata Shaker"],
  [/clay pot|terracotta.*pot/i, "Clay Cooking Pot"],
  [/mosaic tile|ceramic tile/i, "Ceramic Tile"],
  [/serving tray/i, "Azulejo Serving Tray"],
  [/glassware|cactus/i, "Cactus Glasses"],
  [/pinafore/i, "Linen Pinafore"],
];

const FILLER = /\b(handmade|hand[- ]made|hand[- ]painted|handcrafted|hand[- ]thrown|handwoven|hand woven|portuguese|unique|artisan|traditional|rustic|vintage|retro|glazed|glossy)\b/gi;

export function shortName(title: string) {
  const hit = SHORT.find(([re]) => re.test(title));
  if (hit) return hit[1];
  // Fallback: the first part of the title without the selling words, at most five words.
  const first = title.split(/,|:|–|—|\s-\s|\|/)[0].replace(FILLER, " ").replace(/\s+/g, " ").trim();
  return (first || title).split(" ").slice(0, 5).join(" ");
}

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20 };
const n = (s: string) => NUM[s.toLowerCase()] ?? Number(s);
const SET = /\bset[ -]of[ -](\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\b|\b(\d+)[ -]pieces?\b/i;
const SINGLE = /\b(just[ -]one|only[ -]one|single)\b/i;

/** How many pieces one unit of this listing/variant holds. */
function piecesPer(title: string, variant: string) {
  if (SINGLE.test(variant)) return 1;
  const v = variant.match(SET);
  if (v) return n(v[1] ?? v[2]);
  const t = title.match(SET);
  return t ? n(t[1] ?? t[2]) : 1;
}

/** "no-flat-surface" → "No flat surface"; keeps labels that are already readable. */
const tidy = (s: string) => (/^[a-z0-9-]+$/.test(s) ? (s.charAt(0).toUpperCase() + s.slice(1)).replace(/-/g, " ") : s);

/** Variant parts that only say how many pieces (already counted in the quantity) or repeat the item. */
const COUNT_ONLY = /^(just[ -]one|only[ -]one|single([ -]\w+)?|set[ -]of[ -]\w+([ -]\w+)?|\d+[ -]pieces?)$/i;
const cleanPart = (p: string) => p.replace(/\(\d+ pieces?\)|\(check details\)/gi, "").replace(/-check-details$/i, "").replace(/(\s*-)+\s*$/, "").trim();

/** Expands one order line into what to pack (a bundle like "Deck + 3 Craft Sardines" becomes two lines). */
export function packLines(title: string, variantLabel: string, qty: number): PackLine[] {
  const name = shortName(title);
  const parts = variantLabel.split(/\s*·\s*/).map(cleanPart).filter(Boolean);

  // Playing cards: "Deck + Craft Sardine" / "Deck + 3 C. Sardines" add loose sardines to the box.
  if (name === "Deck of Cards") {
    const extra = variantLabel.match(/deck\s*[+-]\s*(\d+)?[\s-]*(c\.|c\b|craft)/i);
    const lines: PackLine[] = [{ name, variant: "", qty }];
    if (extra) lines.push({ name: "Craft Sardine", variant: "", qty: qty * Number(extra[1] ?? 1) });
    return lines;
  }

  const per = piecesPer(title, variantLabel);
  const variant = parts.filter((p) => !COUNT_ONLY.test(p)).map(tidy).join(" · ");
  return [{ name, variant, qty: qty * per, sets: per > 1 ? `${qty} set${qty > 1 ? "s" : ""} of ${per}` : undefined }];
}

/** Totals per item and option across all chosen orders, biggest first within each item. */
export function packTotals(lines: PackLine[]) {
  const items = new Map<string, { name: string; total: number; options: Map<string, { variant: string; qty: number }> }>();
  for (const l of lines) {
    const it = items.get(l.name) ?? { name: l.name, total: 0, options: new Map<string, { variant: string; qty: number }>() };
    it.total += l.qty;
    // "No, flat surface", "No (Flat Surface)" and "no-flat-surface" are the same option.
    const key = l.variant.toLowerCase().replace(/[^a-z0-9]/g, "");
    const o = it.options.get(key) ?? { variant: l.variant, qty: 0 };
    o.qty += l.qty;
    it.options.set(key, o);
    items.set(l.name, it);
  }
  return [...items.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((it) => ({ name: it.name, total: it.total, options: [...it.options.values()].sort((a, b) => b.qty - a.qty) }));
}
