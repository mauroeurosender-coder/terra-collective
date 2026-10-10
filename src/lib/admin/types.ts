export type OrderStatus = "pending_payment" | "paid" | "packing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type AdminOrderItem = { slug: string; name: string; variantLabel: string; unitPrice: number; quantity: number; image?: string };

export type AdminOrder = {
  id: string;
  number: string;
  createdAt: string; // ISO
  status: OrderStatus;
  email: string;
  customerName: string;
  country: string;
  total: number; // EUR cents
  refunded: number;
  paymentMethod: string;
  giftMessage?: string | null;
  test?: boolean;
  /** Tax collected and remitted by a marketplace (e.g. Etsy GST) — not shop revenue. */
  marketplaceTax?: number;
  /** web | etsy | manual */
  source?: string;
  items: AdminOrderItem[];
};

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";
export type Range = { key: RangeKey; from: Date; to: Date; prevFrom: Date; prevTo: Date; bucket: "hour" | "day" };

export type Kpis = { revenue: number; orders: number; aov: number; visits: number; conversion: number };

export type Dashboard = {
  range: Range;
  kpis: Kpis;
  prev: Kpis;
  series: { t: string; revenue: number; orders: number }[];
  byCountry: { country: string; revenue: number; orders: number }[];
  topProducts: { slug: string; name: string; image?: string; units: number; revenue: number }[];
  lowStock: { slug: string; name: string; variantLabel: string; sku: string; stock: number; image?: string }[];
  recent: AdminOrder[];
  source: "demo" | "live";
};
