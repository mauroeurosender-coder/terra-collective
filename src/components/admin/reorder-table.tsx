import clsx from "clsx";
import { TARGET_DAYS, type ReorderRow } from "@/lib/admin/reorder";
import { Card } from "./ui";

/** Products and inventory items that will run out within 3 weeks at the current pace. */
export function ReorderTable({ rows }: { rows: ReorderRow[] }) {
  return (
    <Card title="Repor stock" action={<span className="text-xs text-ink-soft">Vendas dos últimos 30 dias (site + Etsy) · sugestão para {TARGET_DAYS} dias</span>}>
      <span id="reorder" className="block scroll-mt-24" />
      {!rows.length ? (
        <p className="text-sm text-ink-soft">Nada a repor: ao ritmo atual, tudo dura mais de 3 semanas.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-ink-soft">
              <tr><th className="px-2 pb-2 font-medium">Artigo</th><th className="px-2 pb-2 text-right font-medium">Stock</th><th className="px-2 pb-2 text-right font-medium">Vendidos 30 dias</th><th className="px-2 pb-2 text-right font-medium">Dura</th><th className="px-2 pb-2 text-right font-medium">Encomendar</th></tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td className="px-2 py-2.5">{r.name}{r.kind === "item" && <span className="ml-1.5 rounded bg-azulejo-tint px-1.5 py-0.5 text-[0.65rem] font-semibold text-azulejo-deep">inventário</span>}</td>
                  <td className={clsx("px-2 py-2.5 text-right", r.stock <= 0 && "font-semibold text-coral-ink")}>{r.stock}</td>
                  <td className="px-2 py-2.5 text-right">{r.sold30}</td>
                  <td className={clsx("px-2 py-2.5 text-right", r.daysLeft != null && r.daysLeft < 7 && "font-semibold text-coral-ink")}>{r.daysLeft == null ? "—" : r.daysLeft < 1 ? "esgotado" : `${Math.floor(r.daysLeft)} dias`}</td>
                  <td className="px-2 py-2.5 text-right font-semibold">{r.suggest || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
