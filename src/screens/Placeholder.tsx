/** Stand-in for screens that haven't been built yet. */
export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <>
      <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="m-0 rounded-lg border border-dashed border-line bg-surface p-4 text-sm text-muted">{note}</p>
    </>
  );
}
