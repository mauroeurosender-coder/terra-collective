/**
 * Generates placeholder product "photography" as SVG: glossy glazed pieces on
 * soft studio backgrounds. Replace with real photos (Supabase Storage) later —
 * paths are referenced from src/lib/data/seed.ts.
 *
 *   node scripts/generate-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = join(process.cwd(), "public");
let uid = 0;
const id = (p) => `${p}${++uid}`;

const glaze = {
  blue: { base: "#2E5AAC", light: "#5B86D6", dark: "#1D3F80", ink: "#FFFFFF", accent: "#9DB9EC" },
  coral: { base: "#E8704A", light: "#F39A78", dark: "#C4502C", ink: "#FFF6EC", accent: "#E9B949" },
  mustard: { base: "#E9B949", light: "#F5D57F", dark: "#C9962A", ink: "#2E5AAC", accent: "#FFFFFF" },
  olive: { base: "#6B7F3A", light: "#93A85E", dark: "#4F6128", ink: "#FAF7F2", accent: "#E9B949" },
  white: { base: "#F4F1EA", light: "#FFFFFF", dark: "#DAD4C8", ink: "#2E5AAC", accent: "#2E5AAC" },
  rose: { base: "#E7B8B0", light: "#F4D6D0", dark: "#CF928A", ink: "#2E5AAC", accent: "#FFFFFF" },
};

const bgs = {
  cream: ["#FFFDF9", "#F3EEE5"],
  blue: ["#F4F7FD", "#E3EAF7"],
  rose: ["#FEF7F5", "#F6E3DF"],
  mustard: ["#FFFBF0", "#F8ECCB"],
  olive: ["#F9FAF4", "#E7ECDA"],
  white: ["#FFFFFF", "#F1EEE8"],
};

function svg(w, h, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;
}

function studio(w, h, tone = "cream", floor = 0.72) {
  const [a, b] = bgs[tone];
  const g = id("bg");
  const f = id("fl");
  return {
    defs: `<radialGradient id="${g}" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
      <linearGradient id="${f}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}" stop-opacity="0"/><stop offset="1" stop-color="${b}"/></linearGradient>`,
    body: `<rect width="${w}" height="${h}" fill="url(#${g})"/><rect y="${h * floor}" width="${w}" height="${h * (1 - floor)}" fill="url(#${f})"/>`,
  };
}

function shadow(cx, cy, rx, ry, op = 0.18) {
  const g = id("sh");
  return {
    defs: `<radialGradient id="${g}"><stop offset="0" stop-color="#1C2A3A" stop-opacity="${op}"/><stop offset="1" stop-color="#1C2A3A" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${g})"/>`,
  };
}

/* ---------- Sardine ---------- */
const FISH =
  "M140,500 C200,418 330,388 470,398 C560,404 622,430 662,470 L742,408 C728,460 728,540 742,592 L662,530 C622,570 560,596 470,602 C330,612 200,582 140,500 Z";

function pattern(kind, c, clip) {
  const ink = c.ink;
  let out = "";
  if (kind === "scales") {
    for (let y = 420; y < 600; y += 26) {
      for (let x = 290 + ((y / 26) % 2) * 15; x < 650; x += 30) {
        out += `<path d="M${x - 14},${y} a14,14 0 0 0 28,0" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
      }
    }
  } else if (kind === "stripes") {
    for (let x = 300; x < 660; x += 44) {
      out += `<path d="M${x},380 C${x + 20},470 ${x + 20},530 ${x},620" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round" opacity=".9"/>`;
    }
  } else if (kind === "dots") {
    for (let y = 425; y < 600; y += 34) {
      for (let x = 300 + ((y / 34) % 2) * 17; x < 650; x += 34) out += `<circle cx="${x}" cy="${y}" r="7" fill="${ink}" opacity=".9"/>`;
    }
  } else if (kind === "azulejo") {
    for (let x = 330; x < 660; x += 90) {
      out += `<g transform="translate(${x},500)" opacity=".92">${[0, 90, 180, 270]
        .map((r) => `<path transform="rotate(${r})" d="M0,0 C10,-14 10,-30 0,-40 C-10,-30 -10,-14 0,0Z" fill="${ink}"/>`)
        .join("")}<circle r="8" fill="${c.accent}"/></g>`;
    }
  } else if (kind === "plain") {
    out += `<path d="M300,470 C400,450 520,452 640,482" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
  }
  return `<g clip-path="url(#${clip})">${out}</g>`;
}

function sardine(color, kind = "scales", transform = "") {
  const c = glaze[color];
  const g = id("fg");
  const clip = id("fc");
  const hl = id("hl");
  const blur = id("bl");
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
    <clipPath id="${clip}"><path d="${FISH}"/></clipPath>
    <linearGradient id="${hl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${blur}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`;
  const body = `<g transform="${transform}">
    <path d="${FISH}" fill="url(#${g})" stroke="${c.dark}" stroke-width="3"/>
    ${pattern(kind, c, clip)}
    <path d="M250,436 C272,474 272,526 250,564" fill="none" stroke="${c.ink}" stroke-width="5" stroke-linecap="round" opacity=".8"/>
    <path d="M668,478 L728,440 M668,500 L730,500 M668,522 L728,560" stroke="${c.ink}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <circle cx="200" cy="484" r="17" fill="#FFFFFF"/><circle cx="203" cy="485" r="9" fill="#1C2A3A"/><circle cx="199" cy="480" r="3.5" fill="#fff"/>
    <path d="M160,470 C260,414 420,398 560,420 C470,430 300,440 180,486 Z" fill="url(#${hl})" filter="url(#${blur})" clip-path="url(#${clip})"/>
    <ellipse cx="380" cy="428" rx="70" ry="7" fill="#fff" opacity=".85" transform="rotate(-4 380 428)"/>
    <ellipse cx="505" cy="424" rx="22" ry="4" fill="#fff" opacity=".7"/>
    <circle cx="612" cy="448" r="5" fill="#fff" opacity=".7"/>
  </g>`;
  return { defs, body };
}

function compose(w, h, tone, parts) {
  const bg = studio(w, h, tone);
  return svg(w, h, bg.body + parts.map((p) => p.body).join(""), bg.defs + parts.map((p) => p.defs).join(""));
}

/* ---------- Vessels ---------- */
function bottle(color, x = 400, y = 520, s = 1) {
  const c = glaze[color];
  const g = id("bt");
  const hl = id("bh");
  const bl = id("bb");
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.dark}"/><stop offset=".35" stop-color="${c.light}"/><stop offset=".6" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
  <linearGradient id="${hl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="${bl}"><feGaussianBlur stdDeviation="5"/></filter>`;
  const band = glaze[color === "white" ? "blue" : color === "mustard" ? "blue" : "white"];
  const sh = shadow(0, 250, 190, 26);
  const body = `<g transform="translate(${x} ${y}) scale(${s})">
    ${sh.body}
    <rect x="-26" y="-330" width="52" height="46" rx="10" fill="#D9B98A"/><rect x="-26" y="-330" width="52" height="10" rx="5" fill="#C9A673"/>
    <rect x="-34" y="-348" width="68" height="26" rx="13" fill="url(#${g})"/>
    <path d="M-30,-290 L-30,-190 C-160,-150 -170,40 -150,150 C-130,250 130,250 150,150 C170,40 160,-150 30,-190 L30,-290 Z" fill="url(#${g})"/>
    <path d="M-150,-10 C-60,20 60,20 150,-10 L152,40 C60,70 -60,70 -152,40Z" fill="${band.base}" opacity=".95"/>
    <g transform="translate(-60 -6) scale(.2)">${sardine(color === "blue" ? "white" : "blue", "scales").body}</g>
    <path d="M-110,-120 C-120,-40 -118,60 -100,140" stroke="url(#${hl})" stroke-width="22" fill="none" stroke-linecap="round" filter="url(#${bl})"/>
    <ellipse cx="-92" cy="-110" rx="9" ry="34" fill="#fff" opacity=".85" transform="rotate(20 -92 -110)"/>
    <ellipse cx="-8" cy="-250" rx="5" ry="22" fill="#fff" opacity=".7"/>
  </g>`;
  return { defs: defs + sh.defs, body };
}

function dispenser(color, x = 400, y = 520, sc = 1) {
  const c = glaze[color];
  const g = id("dp");
  const bl = id("db");
  const band = glaze[color === "white" ? "blue" : "white"];
  const sh = shadow(0, 300, 140, 20);
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.dark}"/><stop offset=".3" stop-color="${c.light}"/><stop offset=".65" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient><filter id="${bl}"><feGaussianBlur stdDeviation="4"/></filter>${sh.defs}`;
  const tiles = [-60, 0, 60]
    .map((tx) => `<g transform="translate(${tx} 60)">${[0, 90, 180, 270].map((r) => `<path transform="rotate(${r})" d="M0,0 C7,-10 7,-20 0,-26 C-7,-20 -7,-10 0,0Z" fill="${band.base}"/>`).join("")}</g>`)
    .join("");
  const body = `<g transform="translate(${x} ${y}) scale(${sc})">${sh.body}
    <path d="M-8,-390 L60,-450 L66,-442 L4,-380Z" fill="#C8CDD3"/><rect x="-14" y="-395" width="28" height="40" rx="6" fill="#AEB5BD"/>
    <path d="M-40,-360 C-40,-330 -100,-300 -100,-240 L-100,280 C-100,300 100,300 100,280 L100,-240 C100,-300 40,-330 40,-360Z" fill="url(#${g})"/>
    <rect x="-100" y="20" width="200" height="80" fill="${color === "white" ? "#fff" : glaze.white.base}" opacity=".96"/>
    ${tiles}
    <path d="M-66,-220 L-66,240" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity=".55" filter="url(#${bl})"/>
    <ellipse cx="-62" cy="-200" rx="6" ry="30" fill="#fff" opacity=".85"/>
  </g>`;
  return { defs, body };
}

function dish(color, x, y, s = 1, rot = 0) {
  const c = glaze[color];
  const g = id("ds");
  const clip = id("dc");
  const olives = [
    [360, 470], [420, 510], [480, 470], [540, 505], [420, 450], [500, 530],
  ]
    .map(([ox, oy], i) => `<ellipse cx="${ox}" cy="${oy}" rx="26" ry="19" fill="${i % 2 ? "#6B7F3A" : "#4F6128"}" transform="rotate(${i * 30} ${ox} ${oy})"/><ellipse cx="${ox - 8}" cy="${oy - 7}" rx="8" ry="4" fill="#fff" opacity=".5"/>`)
    .join("");
  const defs = `<radialGradient id="${g}" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="${c.light}"/><stop offset=".7" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient><clipPath id="${clip}"><path d="${FISH}"/></clipPath>`;
  const body = `<g transform="translate(${x} ${y}) scale(${s}) rotate(${rot} 440 500)">
    <path d="${FISH}" fill="#1C2A3A" opacity=".12" transform="translate(8 22)"/>
    <path d="${FISH}" fill="url(#${g})" stroke="${c.dark}" stroke-width="3"/>
    <path d="${FISH}" fill="${c.base}" transform="translate(440 500) scale(.82) translate(-440 -500)" stroke="${c.dark}" stroke-opacity=".35" stroke-width="4"/>
    ${olives}
    <circle cx="200" cy="486" r="14" fill="#fff"/><circle cx="202" cy="487" r="7" fill="#1C2A3A"/>
    <ellipse cx="360" cy="420" rx="80" ry="6" fill="#fff" opacity=".8"/>
  </g>`;
  return { defs, body };
}

function trinketBox(x = 400, y = 560) {
  const m = glaze.mustard;
  const g = id("tb");
  const sh = shadow(0, 150, 250, 24);
  const lid = sardine("blue", "scales", "translate(-300 -262) scale(.7)");
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.light}"/><stop offset="1" stop-color="${m.dark}"/></linearGradient>${sh.defs}${lid.defs}`;
  const body = `<g transform="translate(${x} ${y})">${sh.body}
    <rect x="-230" y="-60" width="460" height="200" rx="46" fill="url(#${g})"/>
    <rect x="-150" y="-10" width="300" height="100" rx="14" fill="#fff" opacity=".95"/>
    <text x="0" y="36" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="38" fill="#2E5AAC">Sardinhas</text>
    <text x="0" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="6" fill="#E8704A">LISBOA · PORTUGAL</text>
    <rect x="-240" y="-92" width="480" height="46" rx="23" fill="${m.base}" stroke="${m.dark}" stroke-width="2"/>
    <ellipse cx="-150" cy="-80" rx="60" ry="6" fill="#fff" opacity=".8"/>
    ${lid.body}
    <rect x="-200" y="-40" width="18" height="150" rx="9" fill="#fff" opacity=".45"/>
  </g>`;
  return { defs, body };
}

/* ---------- Straw bag ---------- */
function strawBag(trim = "natural", x = 400, y = 560, size = 1, leather = false) {
  const g = id("sb");
  const pat = id("wv");
  const sh = shadow(0, 250 * size, 260 * size, 26);
  const stripe = trim === "natural" ? null : glaze[trim].base;
  const defs = `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#CDB27F"/><stop offset=".4" stop-color="#EAD6A8"/><stop offset="1" stop-color="#C9AC76"/></linearGradient>
  <pattern id="${pat}" width="28" height="22" patternUnits="userSpaceOnUse"><path d="M0,11 Q7,2 14,11 T28,11" fill="none" stroke="#B89A62" stroke-width="2.4" opacity=".55"/><path d="M0,22 Q7,13 14,22 T28,22" fill="none" stroke="#FFF7E4" stroke-width="1.6" opacity=".6"/></pattern>${sh.defs}`;
  const handle = leather
    ? `<path d="M-130,-150 C-130,-330 130,-330 130,-150" fill="none" stroke="#8C5A3C" stroke-width="22" stroke-linecap="round"/><path d="M-130,-150 C-130,-330 130,-330 130,-150" fill="none" stroke="#B07A58" stroke-width="6" stroke-linecap="round" opacity=".6"/>`
    : `<path d="M-130,-150 C-130,-330 130,-330 130,-150" fill="none" stroke="#D9BE8A" stroke-width="26" stroke-linecap="round"/><path d="M-130,-150 C-130,-330 130,-330 130,-150" fill="none" stroke="#B89A62" stroke-width="26" stroke-dasharray="4 10" opacity=".6"/>`;
  const body = `<g transform="translate(${x} ${y}) scale(${size})">${sh.body}${handle}
    <path d="M-240,-160 L240,-160 L205,240 C200,262 -200,262 -205,240Z" fill="url(#${g})"/>
    <path d="M-240,-160 L240,-160 L205,240 C200,262 -200,262 -205,240Z" fill="url(#${pat})"/>
    ${stripe ? `<path d="M-236,-110 L236,-110 L232,-70 L-232,-70Z" fill="${stripe}"/><path d="M-230,-40 L230,-40 L228,-22 L-228,-22Z" fill="${stripe}" opacity=".9"/>` : ""}
    <rect x="-244" y="-172" width="488" height="24" rx="12" fill="#D9BE8A"/>
  </g>`;
  return { defs, body };
}

/* ---------- Cards ---------- */
function cardsArt(x = 400, y = 540) {
  const sh = shadow(0, 230, 280, 24);
  const card = (rot, fish, n) => {
    const f = sardine(fish, n % 2 ? "stripes" : "scales", "translate(-160 -150) scale(.36)");
    return {
      defs: f.defs,
      body: `<g transform="rotate(${rot}) translate(0 -40)"><rect x="-110" y="-160" width="220" height="310" rx="16" fill="#fff" stroke="#E6E0D5" stroke-width="2"/>
      <rect x="-94" y="-144" width="188" height="278" rx="10" fill="none" stroke="${glaze[fish].base}" stroke-width="3"/>
      <text x="-80" y="-108" font-family="Georgia, serif" font-size="34" fill="${n % 2 ? "#E8704A" : "#1C2A3A"}">${["A", "K", "Q", "J"][n]}</text>
      <g transform="translate(0 20)">${f.body}</g>
      <text x="0" y="110" text-anchor="middle" font-family="Arial" font-size="13" letter-spacing="3" fill="#1C2A3A">CONSERVAS</text></g>`,
    };
  };
  const cs = [card(-24, "blue", 0), card(-8, "coral", 1), card(8, "mustard", 2), card(24, "olive", 3)];
  const body = `<g transform="translate(${x} ${y})">${sh.body}${cs.map((c) => c.body).join("")}
    <g transform="translate(150 150) rotate(6)"><rect x="-100" y="-70" width="200" height="140" rx="20" fill="#2E5AAC"/><rect x="-86" y="-56" width="172" height="112" rx="12" fill="none" stroke="#E9B949" stroke-width="3"/>
    <text x="0" y="-6" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="30" fill="#fff">Conservas</text><text x="0" y="26" text-anchor="middle" font-family="Arial" font-size="12" letter-spacing="4" fill="#E9B949">PLAYING CARDS</text></g></g>`;
  return { defs: sh.defs + cs.map((c) => c.defs).join(""), body };
}

/* ---------- Tiles ---------- */
function tile(x, y, s, variant) {
  const blue = "#2E5AAC";
  const motifs = [
    `${[0, 90, 180, 270].map((r) => `<path transform="rotate(${r})" d="M0,0 C18,-24 18,-52 0,-70 C-18,-52 -18,-24 0,0Z" fill="${blue}"/>`).join("")}<circle r="14" fill="#E9B949"/>`,
    `<circle r="62" fill="none" stroke="${blue}" stroke-width="10"/><circle r="30" fill="${blue}"/>${[45, 135, 225, 315].map((r) => `<circle transform="rotate(${r}) translate(0 -88)" r="18" fill="${blue}"/>`).join("")}`,
    `<rect x="-60" y="-60" width="120" height="120" transform="rotate(45)" fill="none" stroke="${blue}" stroke-width="10"/>${[0, 90, 180, 270].map((r) => `<path transform="rotate(${r})" d="M0,-20 L14,-50 L0,-40 L-14,-50Z" fill="${blue}"/>`).join("")}`,
    `${[0, 60, 120, 180, 240, 300].map((r) => `<ellipse transform="rotate(${r}) translate(0 -44)" rx="14" ry="34" fill="${blue}"/>`).join("")}<circle r="16" fill="#E8704A"/>`,
  ];
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-100" y="-100" width="200" height="200" rx="6" fill="#FDFCF8" stroke="#E6E0D5" stroke-width="2"/>
    ${[[-100, -100], [100, -100], [-100, 100], [100, 100]].map(([cx, cy]) => `<path d="M${cx},${cy} m${cx < 0 ? 0 : -40},0 a40,40 0 0 ${cx * cy > 0 ? 0 : 1} ${cx < 0 ? 40 : 40},${cy < 0 ? 40 : -40}" fill="none" stroke="${blue}" stroke-width="6" opacity=".7"/>`).join("")}
    ${motifs[variant % 4]}<rect x="-100" y="-100" width="200" height="200" rx="6" fill="url(#tileGloss)"/></g>`;
}
const tileDefs = `<linearGradient id="tileGloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

/* ---------- Write helpers ---------- */
function write(path, content) {
  const full = join(OUT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

const W = 800;
const H = 1000;
const toneFor = { blue: "blue", coral: "rose", mustard: "mustard", olive: "olive", white: "cream", rose: "rose" };
const kindFor = { blue: "scales", coral: "stripes", mustard: "azulejo", olive: "dots", white: "scales" };

// Sardine wall décor — one hero per glaze + detail
for (const c of ["blue", "coral", "mustard", "olive", "white"]) {
  write(`products/sardine-wall-decor/${c}.svg`, compose(W, H, toneFor[c], [shadow(430, 700, 300, 26), sardine(c, kindFor[c], "translate(-40 0) rotate(-14 440 500)")]));
}
write("products/sardine-wall-decor/1.svg", compose(W, H, "blue", [shadow(430, 700, 300, 26), sardine("blue", "scales", "translate(-40 0) rotate(-14 440 500)")]));
write("products/sardine-wall-decor/detail.svg", compose(W, H, "blue", [sardine("blue", "scales", "translate(-700 -900) scale(2.6)")]));

// Set of 5 — shoal on a wall
const shoal = (colors, kinds) =>
  colors.map((c, i) => sardine(c, kinds[i], `translate(${-180 + i * 70} ${-300 + i * 150}) scale(.55) rotate(-18 440 500) translate(300 300)`));
write("products/sardine-set-of-5/1.svg", compose(W, H, "blue", shoal(["blue", "white", "blue", "white", "blue"], ["scales", "azulejo", "stripes", "dots", "plain"])));
write("products/sardine-set-of-5/2.svg", compose(W, H, "rose", shoal(["coral", "mustard", "coral", "rose", "mustard"], ["stripes", "azulejo", "dots", "scales", "plain"])));
write("products/sardine-set-of-5/3.svg", compose(W, H, "mustard", shoal(["blue", "coral", "mustard", "olive", "white"], ["scales", "stripes", "azulejo", "dots", "scales"])));

// Oil bottle
for (const c of ["blue", "mustard", "white"]) write(`products/ceramic-oil-bottle/${c}.svg`, compose(W, H, toneFor[c], [bottle(c, 400, 560)]));
write("products/ceramic-oil-bottle/1.svg", compose(W, H, "blue", [bottle("blue", 400, 560)]));
write("products/ceramic-oil-bottle/detail.svg", compose(W, H, "cream", [bottle("blue", 470, 420, 1.9)]));

// Dispenser
for (const c of ["blue", "white"]) write(`products/olive-oil-dispenser/${c}.svg`, compose(W, H, toneFor[c], [dispenser(c, 400, 560)]));

// Olive dishes
write("products/olive-appetizer-dishes/blue.svg", compose(W, H, "blue", [dish("blue", 30, 30, 0.9, -14)]));
write("products/olive-appetizer-dishes/olive.svg", compose(W, H, "olive", [dish("olive", 30, 30, 0.9, -14)]));
write("products/olive-appetizer-dishes/set.svg", compose(W, H, "cream", [dish("blue", 100, -170, 0.62, -10), dish("olive", 60, 110, 0.62, 8), dish("coral", 120, 380, 0.62, -6)]));

// Trinket box
write("products/yellow-trinket-box/1.svg", compose(W, H, "mustard", [trinketBox(400, 580)]));
write("products/yellow-trinket-box/2.svg", compose(W, H, "blue", [trinketBox(400, 580)].map((p) => ({ ...p, body: `<g transform="translate(-120 -140) scale(1.3)">${p.body}</g>` }))));

// Straw bags
write("products/teresa-mini-straw-bag/1.svg", compose(W, H, "rose", [strawBag("natural", 400, 590, 1, true)]));
write("products/teresa-mini-straw-bag/2.svg", compose(W, H, "blue", [strawBag("blue", 400, 590, 1, false)]));
write("products/teresa-mini-straw-bag/3.svg", compose(W, H, "rose", [strawBag("coral", 400, 590, 1, true)]));
write("products/alice-straw-bag/1.svg", compose(W, H, "cream", [strawBag("natural", 400, 620, 1.2, false)]));
write("products/alice-straw-bag/2.svg", compose(W, H, "blue", [strawBag("blue", 400, 620, 1.2, false)]));

// Playing cards
write("products/tinned-fish-playing-cards/1.svg", compose(W, H, "mustard", [cardsArt(380, 560)]));
write("products/tinned-fish-playing-cards/2.svg", compose(W, H, "blue", [cardsArt(380, 560)].map((p) => ({ ...p, body: `<g transform="translate(-260 -380) scale(1.6)">${p.body}</g>` }))));

// Ornaments — hanging on strings
const ornaments = (colors) =>
  colors.map((c, i) => {
    const s = sardine(c, kindFor[c], `translate(${120 + i * 150} ${200 + (i % 2) * 140}) scale(.3) rotate(80 440 500)`);
    return { defs: s.defs, body: `<line x1="${120 + i * 150 + 132}" y1="0" x2="${120 + i * 150 + 132}" y2="${240 + (i % 2) * 140}" stroke="#1C2A3A" stroke-width="2" opacity=".5"/>${s.body}` };
  });
write("products/sardine-ornament/1.svg", compose(W, H, "rose", [sardine("coral", "stripes", "translate(-40 0) rotate(-14 440 500) scale(.8) translate(110 125)")]));
write("products/sardine-ornament/2.svg", compose(W, H, "cream", ornaments(["blue", "coral", "mustard", "olive"])));

// Spoon rest
for (const c of ["coral", "blue"]) write(`products/sardine-spoon-rest/${c}.svg`, compose(W, H, toneFor[c], [{ ...dish(c, 30, 30, 0.9, -14), body: dish(c, 30, 30, 0.9, -14).body.replace(/<ellipse cx="\d+" cy="\d+" rx="26"[^>]*\/><ellipse[^>]*\/>/g, "") }]));

// Coasters
const coasters = (off) => ({ defs: tileDefs, body: [0, 1, 2, 3].map((i) => tile(270 + (i % 2) * 260 + off, 380 + Math.floor(i / 2) * 260, 1.15, i)).join("") });
write("products/azulejo-coaster-set/1.svg", compose(W, H, "blue", [shadow(400, 780, 300, 22), coasters(0)]));
write("products/azulejo-coaster-set/2.svg", compose(W, H, "cream", [{ defs: tileDefs, body: tile(400, 500, 2.8, 0) }]));

// Gift card
{
  const card = sardine("white", "scales", "translate(170 330) scale(.55) rotate(-10 440 500)");
  write("products/gift-card/1.svg", compose(W, H, "blue", [shadow(400, 760, 300, 24), { defs: card.defs, body: `<g transform="rotate(-6 400 500)"><rect x="110" y="330" width="580" height="360" rx="28" fill="#2E5AAC"/><rect x="134" y="354" width="532" height="312" rx="18" fill="none" stroke="#E9B949" stroke-width="3"/>${card.body}<text x="160" y="640" font-family="Georgia, serif" font-style="italic" font-size="44" fill="#fff">Gift card</text><text x="640" y="410" text-anchor="end" font-family="Arial" font-size="15" letter-spacing="4" fill="#E9B949">TERRA COLLECTIVE</text></g>` }]));
}

/* ---------- Lifestyle / editorial ---------- */
const WIDE_W = 1600;
const WIDE_H = 1100;
function wall(tone = "white") {
  const [a, b] = bgs[tone];
  const g = id("wl");
  return {
    defs: `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`,
    body: `<rect width="${WIDE_W}" height="${WIDE_H}" fill="url(#${g})"/>`,
  };
}
function shelf(y) {
  return { defs: "", body: `<rect x="820" y="${y}" width="680" height="22" rx="4" fill="#FFFFFF"/><rect x="820" y="${y + 22}" width="680" height="10" fill="#1C2A3A" opacity=".08"/>` };
}
const heroParts = [
  wall("blue"),
  ...["blue", "coral", "white", "mustard", "blue", "olive"].map((c, i) =>
    sardine(c, ["scales", "stripes", "azulejo", "azulejo", "dots", "dots"][i], `translate(${60 + (i % 3) * 230} ${60 + Math.floor(i / 3) * 330 + (i % 3) * 60}) scale(.62) rotate(-16 440 500)`),
  ),
  shelf(760),
  bottle("blue", 960, 600, 0.52),
  dispenser("white", 1170, 700, 0.62),
  { ...trinketBox(1360, 700), body: `<g transform="translate(1360 700) scale(.42) translate(-1360 -700)">${trinketBox(1360, 700).body}</g>` },
  { defs: "", body: `<rect y="990" width="${WIDE_W}" height="110" fill="#F3EEE5"/>` },
];
write("lifestyle/hero.svg", svg(WIDE_W, WIDE_H, heroParts.map((p) => p.body).join(""), heroParts.map((p) => p.defs).join("")));

const studioParts = [
  wall("cream"),
  shelf(360),
  shelf(700),
  ...[0, 1, 2, 3, 4].map((i) => sardine(["white", "blue", "white", "coral", "white"][i], i % 2 ? "scales" : "plain", `translate(${760 + i * 150} ${130}) scale(.3) rotate(-6 440 500)`)),
  ...[0, 1, 2, 3].map((i) => sardine(["blue", "mustard", "olive", "blue"][i], ["scales", "azulejo", "dots", "stripes"][i], `translate(${780 + i * 180} ${470}) scale(.34) rotate(4 440 500)`)),
  { defs: "", body: `<rect x="60" y="780" width="1480" height="320" fill="#FFFFFF"/><rect x="60" y="780" width="1480" height="12" fill="#1C2A3A" opacity=".06"/>` },
  sardine("white", "plain", "translate(60 420) scale(.9) rotate(-6 440 500)"),
  { defs: "", body: `<g transform="translate(640 880) rotate(-30)"><rect x="-6" y="-200" width="12" height="200" rx="6" fill="#E9B949"/><path d="M-6,0 L6,0 L2,40 L-2,40Z" fill="#1C2A3A"/></g><circle cx="720" cy="960" r="48" fill="#2E5AAC"/><circle cx="720" cy="960" r="40" fill="#5B86D6"/><circle cx="840" cy="980" r="40" fill="#E8704A"/>` },
];
write("lifestyle/studio.svg", svg(WIDE_W, WIDE_H, studioParts.map((p) => p.body).join(""), studioParts.map((p) => p.defs).join("")));

const studioPortrait = [
  studio(800, 1000, "cream", 0.8),
  { defs: "", body: `<rect x="40" y="250" width="720" height="18" rx="4" fill="#FFFFFF"/><rect x="40" y="268" width="720" height="8" fill="#1C2A3A" opacity=".07"/><rect x="40" y="520" width="720" height="18" rx="4" fill="#FFFFFF"/><rect x="40" y="538" width="720" height="8" fill="#1C2A3A" opacity=".07"/>` },
  ...[0, 1, 2].map((i) => sardine(["white", "blue", "white"][i], i % 2 ? "scales" : "plain", `translate(${10 + i * 230} 60) scale(.3) rotate(-6 440 500)`)),
  ...[0, 1, 2].map((i) => sardine(["mustard", "olive", "coral"][i], ["azulejo", "dots", "stripes"][i], `translate(${10 + i * 230} 330) scale(.3) rotate(4 440 500)`)),
  { defs: "", body: `<rect y="800" width="800" height="200" fill="#FFFFFF"/><rect y="800" width="800" height="10" fill="#1C2A3A" opacity=".06"/>` },
  sardine("white", "scales", "translate(-40 440) scale(.75) rotate(-6 440 500)"),
  { defs: "", body: `<g transform="translate(600 900) rotate(-35)"><rect x="-6" y="-180" width="12" height="180" rx="6" fill="#E9B949"/><path d="M-6,0 L6,0 L2,34 L-2,34Z" fill="#1C2A3A"/></g><circle cx="660" cy="950" r="34" fill="#2E5AAC"/><circle cx="660" cy="950" r="27" fill="#5B86D6"/><circle cx="740" cy="960" r="28" fill="#E8704A"/>` },
];
write("lifestyle/studio-portrait.svg", svg(800, 1000, studioPortrait.map((p) => p.body).join(""), studioPortrait.map((p) => p.defs).join("")));

// Journal covers (16:10)
write("journal/studio.svg", svg(WIDE_W, WIDE_H, studioParts.map((p) => p.body).join(""), studioParts.map((p) => p.defs).join("")));
write("journal/painting.svg", compose(WIDE_W, WIDE_H, "blue", [sardine("white", "scales", "translate(80 -150) scale(1.6) rotate(-10 440 500)"), { defs: "", body: `<g transform="translate(1180 360) rotate(35)"><rect x="-10" y="-420" width="20" height="420" rx="10" fill="#E9B949"/><rect x="-12" y="-10" width="24" height="40" fill="#C8CDD3"/><path d="M-12,30 L12,30 L4,90 L-4,90Z" fill="#2E5AAC"/></g>` }]));
write("journal/table.svg", compose(WIDE_W, WIDE_H, "cream", [dish("blue", 160, 80, 0.8, -12), dish("olive", 380, 420, 0.7, 10), bottle("blue", 1180, 560, 0.9), { defs: tileDefs, body: tile(1320, 920, 0.8, 2) + tile(1480, 920, 0.8, 0) }]));
write("journal/gifts.svg", compose(WIDE_W, WIDE_H, "mustard", [cardsArt(520, 580), { ...trinketBox(1150, 640), body: trinketBox(1150, 640).body }]));

// Review photos (square)
write("reviews/r1.svg", compose(800, 800, "blue", [sardine("blue", "scales", "translate(-40 -80) rotate(-14 440 500)")]));
write("reviews/r2.svg", compose(800, 800, "rose", shoal(["blue", "coral", "mustard", "olive", "white"], ["scales", "stripes", "azulejo", "dots", "scales"]).map((p) => ({ ...p, body: `<g transform="translate(0 -120)">${p.body}</g>` }))));
write("reviews/r4.svg", compose(800, 800, "olive", [strawBag("natural", 400, 470, 0.9, true)]));
write("reviews/r7.svg", compose(800, 800, "cream", [dish("blue", 60, -120, 0.6, -10), dish("olive", 20, 120, 0.6, 8), dish("coral", 80, 330, 0.5, -6)]));

// Instagram grid (square)
const insta = [
  ["blue", [sardine("mustard", "azulejo", "translate(-40 -80) rotate(-24 440 500)")]],
  ["rose", [strawBag("coral", 400, 460, 0.85, true)]],
  ["cream", [bottle("mustard", 400, 430, 0.85)]],
  ["olive", [dish("olive", 20, -60, 0.9, 12)]],
  ["mustard", [cardsArt(380, 420)]],
  ["blue", [{ defs: tileDefs, body: tile(400, 400, 2.4, 3) }]],
];
insta.forEach(([tone, parts], i) => write(`insta/${i + 1}.svg`, compose(800, 800, tone, parts)));

console.log("art generated");
