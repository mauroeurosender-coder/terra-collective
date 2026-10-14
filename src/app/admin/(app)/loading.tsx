/** Shown instantly while an admin page loads, so clicks feel immediate. */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-[1280px] animate-pulse space-y-4" aria-busy="true" aria-label="A carregar">
      <div className="h-9 w-56 rounded-xl bg-line/60" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-24 rounded-[var(--radius-card)] bg-paper" />)}
      </div>
      <div className="h-72 rounded-[var(--radius-card)] bg-paper" />
      <div className="h-48 rounded-[var(--radius-card)] bg-paper" />
    </div>
  );
}
