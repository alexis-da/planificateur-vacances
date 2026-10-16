import Link from "next/link";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDate, formaterEuros } from "@/lib/format";
import { creerClientServeur } from "@/lib/supabase/server";
import { alerteErreur, boutonPrincipal, carte } from "@/lib/ui";
import { nombreDeJours, type Voyage } from "@/lib/voyage";

export const dynamic = "force-dynamic";

export default async function MesVoyages() {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination, start_date, end_date, budget, travelers, status, created_at")
    .order("created_at", { ascending: false });

  const voyages = (data ?? []) as Voyage[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Mes voyages</h1>
        <Link href="/" className={boutonPrincipal}>
          + Nouveau voyage
        </Link>
      </div>

      {error && (
        <p className={`mt-6 ${alerteErreur}`}>
          Impossible de charger vos voyages. Réessayez dans quelques instants.
        </p>
      )}

      {!error && voyages.length === 0 && (
        <section className={`${carte} mt-8 flex flex-col items-center p-12 text-center`}>
          <p className="text-5xl" aria-hidden>
            🌍
          </p>
          <h2 className="mt-4 text-xl font-semibold">Aucun voyage pour l&apos;instant</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-600">
            Indiquez une destination et vos dates : votre premier itinéraire sera prêt en
            quelques secondes.
          </p>
          <Link href="/" className={`mt-6 ${boutonPrincipal}`}>
            Préparer mon premier voyage
          </Link>
        </section>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {voyages.map((voyage) => (
          <li key={voyage.id}>
            <Link
              href={`/voyages/${voyage.id}`}
              className={`${carte} group block h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="h-2 bg-linear-to-r from-teal-500 to-sky-500" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold group-hover:text-teal-700">
                    {voyage.destination}
                  </h2>
                  <BadgeStatut statut={voyage.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {formaterDate(voyage.start_date, { day: "numeric", month: "short" })} →{" "}
                  {formaterDate(voyage.end_date)}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {nombreDeJours(voyage.start_date, voyage.end_date)} jour(s) ·{" "}
                  {voyage.travelers} voyageur(s) · {formaterEuros(voyage.budget)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}