/** Shown only to whoever opened a theme preview link. */
export function ThemePreviewBar({ name }: { name: string }) {
  return (
    <div className="bg-mustard px-4 py-2 text-center text-sm font-medium text-ink">
      Previewing the <b>{name}</b> theme. Only you can see this.{" "}
      <a href="?preview-theme=off" className="underline underline-offset-2">Stop preview</a>
    </div>
  );
}
