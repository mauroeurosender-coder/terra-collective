import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getCountry } from "@/lib/geo";
import { getSettings } from "@/lib/data/source";
import { Logo, SardineLine } from "@/components/illustrations";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Packing slip" };

export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: o } = await sb.from("orders").select("*, order_items(name, variant_label, sku, quantity)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const a = o.shipping_address ?? {};
  const pt = o.locale === "pt";
  const { store } = await getSettings();
  return (
    <div className="min-h-dvh bg-white print:bg-white">
      <div className="mx-auto max-w-[720px] px-8 py-10 text-ink print:p-0">
        <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
        <header className="flex items-start justify-between border-b border-line pb-6">
          <Logo />
          <div className="text-right text-sm">
            <p className="text-lg font-semibold">{o.number}</p>
            <p className="text-ink-soft">{new Date(o.created_at).toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
            <p className="text-ink-soft">{o.shipping_method === "express" ? "EXPRESS" : "Standard"}</p>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-8 border-b border-line py-6 text-sm">
          <div>
            <p className="eyebrow mb-2">{pt ? "Enviar para" : "Ship to"}</p>
            <p className="leading-relaxed">
              {a.firstName} {a.lastName}<br />
              {a.company && <>{a.company}<br /></>}
              {a.address1}<br />
              {a.address2 && <>{a.address2}<br /></>}
              {a.postal} {a.city}{a.state ? `, ${a.state}` : ""}<br />
              <b>{getCountry(o.country).name.en.toUpperCase()}</b><br />
              {a.phone}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">{pt ? "De" : "From"}</p>
            <p className="leading-relaxed">{store.name}<br />{store.address}</p>
          </div>
        </section>
        <table className="my-6 w-full text-sm">
          <thead className="text-left text-xs text-ink-soft">
            <tr><th className="w-10 pb-2">✓</th><th className="pb-2">{pt ? "Artigo" : "Item"}</th><th className="pb-2">SKU</th><th className="pb-2 text-right">{pt ? "Qtd." : "Qty"}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(o.order_items as { name: string; variant_label: string | null; sku: string | null; quantity: number }[]).map((i, n) => (
              <tr key={n}>
                <td className="py-3"><span className="inline-block h-4 w-4 rounded border border-ink/40" /></td>
                <td className="py-3"><b>{i.name}</b>{i.variant_label && <span className="block text-ink-soft">{i.variant_label}</span>}</td>
                <td className="py-3 text-ink-soft">{i.sku}</td>
                <td className="py-3 text-right text-base font-semibold">{i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(o.gift_wrap || o.gift_message) && (
          <section className="rounded-xl border-2 border-dashed border-ink/30 p-5">
            <p className="font-semibold">🎁 {o.gift_wrap ? (pt ? "Embrulhar para oferta. Não incluir preços." : "Gift wrap. Don’t include prices.") : "Gift message"}</p>
            {o.gift_message && <p className="hand mt-3 text-2xl text-ink">“{o.gift_message}”</p>}
          </section>
        )}
        <footer className="mt-10 flex items-center gap-3 text-sm text-ink-soft">
          <SardineLine className="h-6 w-14 text-azulejo" />
          <p>{pt ? "Obrigado por apoiar o feito à mão. Cada peça é única." : "Thank you for supporting handmade. Every piece is one of a kind."}</p>
        </footer>
      </div>
    </div>
  );
}
