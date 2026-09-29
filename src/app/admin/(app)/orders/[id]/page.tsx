import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, Mail, MapPin, Phone, Receipt } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { getCountry } from "@/lib/geo";
import { store } from "@/lib/config";
import { Card, NotConnected, PageHeader, StatusPill, TestBadge, eur } from "@/components/admin/ui";
import { DeleteTestOrder, NoteForm, RefundForm, WorkflowActions } from "@/components/admin/order-actions";

export const metadata = { title: "Order" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!supabaseConfigured) return <NotConnected />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseServer();
  const [{ data: o }, { data: events }] = await Promise.all([
    sb.from("orders").select("*, customers(id, tags), order_items(*, products(slug, product_media(url, position)), variants(image_index))").eq("id", id).maybeSingle(),
    sb.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!o) notFound();

  const a = o.shipping_address ?? {};
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const country = getCountry(o.country);
  type Item = { id: string; name: string; variant_label: string | null; sku: string | null; unit_price: number; quantity: number; products: { slug: string; product_media: { url: string; position: number }[] } | null; variants: { image_index: number | null } | null };
  const items = o.order_items as Item[];
  const img = (i: Item) => {
    const media = [...(i.products?.product_media ?? [])].sort((x, y) => x.position - y.position);
    return media[i.variants?.image_index ?? 0]?.url ?? media[0]?.url;
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={o.number}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusPill status={o.status} />{o.test && <TestBadge />} Placed {when(o.created_at)} · {o.locale.toUpperCase()}</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Fulfilment">
            <WorkflowActions orderId={o.id} status={o.status} defaultCarrier={country.zone === "PT" ? "CTT Expresso" : "DHL Express"} />
            {o.tracking_number && (
              <p className="mt-4 text-sm text-ink-soft">Tracking: <span className="font-medium text-ink">{o.carrier} · {o.tracking_number}</span>{o.shipped_at && ` · shipped ${when(o.shipped_at)}`}</p>
            )}
          </Card>

          {(o.gift_wrap || o.gift_message) && (
            <section aria-label="Gift" className="rounded-[var(--radius-card)] border-2 border-mustard bg-mustard-tint p-5">
              <p className="flex items-center gap-2 font-semibold"><Gift className="h-4 w-4" /> {o.gift_wrap ? "Gift wrap requested" : "Gift message"}</p>
              {o.gift_message && <p className="hand mt-3 text-2xl text-ink">“{o.gift_message}”</p>}
            </section>
          )}

          <Card title={`Items (${items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                    {img(i) && <Image src={img(i)!} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{i.products ? <Link className="hover:text-azulejo" href={`/en/products/${i.products.slug}`} target="_blank">{i.name}</Link> : i.name}</p>
                    <p className="text-ink-soft">{[i.variant_label, i.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="text-sm tabular-nums text-ink-soft">{i.quantity} × {eur(i.unit_price, 2)}</p>
                  <p className="w-20 text-right text-sm font-medium tabular-nums">{eur(i.unit_price * i.quantity, 2)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <Row label="Subtotal" value={eur(o.subtotal, 2)} />
              <Row label={`Shipping (${o.shipping_method})`} value={o.shipping ? eur(o.shipping, 2) : "Free"} />
              {o.gift_wrap && <Row label="Gift wrap" value={eur(store.giftWrapPrice, 2)} />}
              {o.discount_amount > 0 && <Row label={`Discount ${o.discount_code ?? ""}`} value={`−${eur(o.discount_amount, 2)}`} />}
              <Row label="Total" value={eur(o.total, 2)} strong />
              <Row label={o.vat ? "VAT included" : "VAT"} value={o.vat ? eur(o.vat, 2) : "Export (0%)"} muted />
              {o.refunded_amount > 0 && <Row label="Refunded" value={`−${eur(o.refunded_amount, 2)}`} />}
            </dl>
          </Card>

          <Card title="Timeline">
            <NoteForm orderId={o.id} />
            <ol className="mt-5 space-y-4 border-l border-line pl-5">
              {(events ?? []).map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-paper ${e.kind === "note" ? "bg-mustard" : e.kind === "refund" ? "bg-coral" : e.kind === "email" ? "bg-olive" : "bg-azulejo"}`} />
                  <p className={e.kind === "note" ? "rounded-xl bg-mustard-tint px-3 py-2" : ""}>{e.body}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{e.kind === "note" ? "Note · " : ""}{when(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Customer">
            <p className="font-medium">{name || "—"}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a className="link" href={`mailto:${o.email}`}>{o.email}</a></li>
              {a.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" />{a.phone}</li>}
            </ul>
            {o.customers && (
              <Link href={`/admin/customers/${o.customers.id}`} className="mt-3 inline-block text-sm font-medium text-azulejo hover:underline">View customer →</Link>
            )}
          </Card>
          <Card title="Shipping address">
            <address className="flex gap-2 text-sm not-italic leading-relaxed">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
              <span>
                {name}<br />
                {a.company && <>{a.company}<br /></>}
                {a.address1}<br />
                {a.address2 && <>{a.address2}<br /></>}
                {a.postal} {a.city}{a.state ? `, ${a.state}` : ""}<br />
                {country.name.en}
              </span>
            </address>
          </Card>
          <Card title="Payment & invoice">
            <dl className="space-y-1.5 text-sm">
              <Row label="Method" value={o.payment_method ?? "—"} />
              <Row label="Reference" value={<span className="break-all">{o.payment_ref ?? "—"}</span>} />
              <Row label="NIF" value={o.nif ?? "—"} />
            </dl>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft"><Receipt className="h-4 w-4" /> {o.invoice_url ? <a className="link" href={o.invoice_url} target="_blank">Invoice</a> : "Certified invoicing (InvoiceXpress/Moloni) connects in a later phase."}</p>
          </Card>
          {session.role === "owner" && o.test && (
            <Card title="Test order">
              <p className="mb-3 text-sm text-ink-soft">Created to try out the admin. Delete it when you’re done.</p>
              <DeleteTestOrder orderId={o.id} />
            </Card>
          )}
          {session.role === "owner" && (
            <Card title="Refund">
              <RefundForm orderId={o.id} remaining={o.total - o.refunded_amount} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "pt-1 text-base font-semibold" : ""} ${muted ? "text-xs text-ink-soft" : ""}`}>
      <dt className={strong || muted ? "" : "text-ink-soft"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
