import "server-only";

/**
 * Reads a supplier invoice / credit note (PDF or photo) with Google Gemini and
 * returns structured fields for the owner to confirm. Env: GEMINI_API_KEY,
 * optional GEMINI_MODEL (defaults to a fast, inexpensive model).
 */

export type Extracted = {
  kind: "invoice" | "credit_note" | "receipt" | "other";
  supplier_name: string;
  supplier_nif: string;
  supplier_country: string;
  number: string;
  date: string; // YYYY-MM-DD
  currency: string;
  net: number; // euros
  vat: number;
  total: number;
  vat_lines: { rate: number; base: number; vat: number }[];
  lines: { description: string; quantity: number; unit_net: number; vat_rate: number }[];
};

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const schema = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: ["invoice", "credit_note", "receipt", "other"] },
    supplier_name: { type: "STRING" },
    supplier_nif: { type: "STRING" },
    supplier_country: { type: "STRING" },
    number: { type: "STRING" },
    date: { type: "STRING" },
    currency: { type: "STRING" },
    net: { type: "NUMBER" },
    vat: { type: "NUMBER" },
    total: { type: "NUMBER" },
    vat_lines: { type: "ARRAY", items: { type: "OBJECT", properties: { rate: { type: "NUMBER" }, base: { type: "NUMBER" }, vat: { type: "NUMBER" } }, required: ["rate", "base", "vat"] } },
    lines: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { description: { type: "STRING" }, quantity: { type: "NUMBER" }, unit_net: { type: "NUMBER" }, vat_rate: { type: "NUMBER" } }, required: ["description", "quantity", "unit_net", "vat_rate"] },
    },
  },
  required: ["kind", "supplier_name", "supplier_nif", "number", "date", "net", "vat", "total", "vat_lines", "lines"],
};

const prompt = `Este documento é uma fatura, fatura-recibo, recibo ou nota de crédito de um fornecedor (normalmente português).
Extrai os dados exatamente como aparecem. Regras:
- kind: "credit_note" se for nota de crédito; "invoice" para fatura ou fatura-recibo; "receipt" para recibo sem fatura; senão "other".
- supplier_*: o EMITENTE (fornecedor), não o cliente. supplier_nif = NIF/número de IVA do fornecedor sem espaços e sem o prefixo do país (ex: 501234567, B12345678, 0403170701); supplier_country = país do fornecedor em código ISO de 2 letras (ex: PT, ES, BE).
- Se a fatura não tiver IVA por ser uma entrega intracomunitária (autoliquidação / reverse charge / art. 138.º da Diretiva IVA), vat = 0 e vat_rate = 0.
- date: data de emissão no formato YYYY-MM-DD.
- Valores em euros com ponto decimal. net = total sem IVA; vat = total de IVA; total = total com IVA.
- vat_lines: um elemento por taxa de IVA do quadro-resumo (taxa em %, base tributável, valor do IVA). Isento = taxa 0.
- lines: cada linha de artigo, com quantidade, preço unitário SEM IVA (depois de descontos) e taxa de IVA.
- Valores sempre positivos, mesmo em notas de crédito. Se algum dado não existir, usa "" ou 0.`;

export async function extractInvoice(file: Blob, mime: string): Promise<Extracted> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não está configurada.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data } }, { text: prompt }] }],
      generationConfig: { temperature: 0, response_mime_type: "application/json", response_schema: schema },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini: ${j?.error?.message ?? res.status}`);
  const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as Extracted;
  } catch {
    throw new Error("Não foi possível ler o documento. Preencha os dados à mão.");
  }
}
