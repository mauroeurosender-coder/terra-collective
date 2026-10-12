import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { CttSettings } from "../settings";

/**
 * Builds the CTT bulk-label upload file ("importação de envios") from the owner's own
 * template (src/lib/server/ctt-template.xlsx: header rows + "Dados" sheet, no customer data).
 * Column letters follow that template, which has an empty column A.
 */

export type CttCustomsLine = { desc: string; hs: string; qty: number; value: number; kg: number };
export type CttShipment = {
  name: string;
  address: string;
  postal: string;
  city: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  kg: number;
  reference: string;
  customs: CttCustomsLine[];
};

const COL = {
  client: "D", contract: "E", type: "H", name: "I", contact: "J", address: "K", postal: "L", postalCity: "M", city: "N", region: "O", country: "P",
  email: "Q", mobile: "R", kg: "V", product: "W", reference: "X", content: "AA", format: "AB", category: "BC",
} as const;
const CUSTOMS_GROUPS = ["BF", "BL", "BR", "BX"]; // up to 4 contents: desc, code, qty, value, net kg, origin

const colNum = (c: string) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colName = (n: number) => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const shift = (c: string, k: number) => colName(colNum(c) + k);
const xml = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

function cell(ref: string, v: string | number | null | undefined) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return `<c r="${ref}"><v>${Number(v.toFixed(3))}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

export async function buildCttFile(shipments: CttShipment[], s: CttSettings): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(path.join(process.cwd(), "src/lib/server/ctt-template.xlsx")));
  const sheetPath = "xl/worksheets/sheet1.xml";
  let sheet = await zip.file(sheetPath)!.async("string");

  const rows = shipments.map((sh, i) => {
    const r = i + 3;
    const cells: [string, string | number | null][] = [
      [COL.client, s.clientNumber], [COL.contract, s.contractNumber], [COL.type, "p"],
      [COL.name, sh.name], [COL.contact, sh.name], [COL.address, sh.address], [COL.postal, sh.postal],
      [COL.postalCity, sh.country === "PT" ? sh.city : null], [COL.city, sh.city], [COL.region, sh.region], [COL.country, sh.country],
      [COL.email, sh.email], [COL.mobile, sh.phone], [COL.kg, Math.max(0.01, sh.kg)], [COL.product, s.product], [COL.reference, sh.reference],
      [COL.content, s.content], [COL.format, s.format], [COL.category, s.category],
    ];
    // Merge contents beyond 4 into the last line so totals stay right.
    const lines = sh.customs.length > 4 ? [...sh.customs.slice(0, 3), sh.customs.slice(3).reduce((a, b) => ({ desc: a.desc, hs: a.hs, qty: a.qty + b.qty, value: a.value + b.value, kg: a.kg + b.kg }))] : sh.customs;
    lines.forEach((l, k) => {
      const g = CUSTOMS_GROUPS[k];
      cells.push([g, l.desc], [shift(g, 1), l.hs], [shift(g, 2), l.qty], [shift(g, 3), Math.round(l.value * 100) / 100], [shift(g, 4), l.kg], [shift(g, 5), "PT"]);
    });
    cells.sort((a, b) => colNum(a[0]) - colNum(b[0]));
    return `<row r="${r}">${cells.map(([c, v]) => cell(`${c}${r}`, v)).join("")}</row>`;
  });

  sheet = sheet.replace("</sheetData>", `${rows.join("")}</sheetData>`).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:CR${Math.max(2, shipments.length + 2)}"/>`);
  zip.file(sheetPath, sheet);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
