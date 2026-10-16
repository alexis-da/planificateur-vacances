export default function Chargement() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-32 animate-pulse rounded-2xl bg-slate-200/70"
          />
        ))}
      </div>
    </main>
  );
}
