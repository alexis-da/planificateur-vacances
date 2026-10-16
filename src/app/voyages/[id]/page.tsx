import Link from "next/link";
import { notFound } from "next/navigation";
import BadgeStatut from "@/components/BadgeStatut";
import ListeBagages from "@/components/ListeBagages";
import SuiviVoyage from "@/components/SuiviVoyage";
import { formaterDate, formaterEuros } from "@/lib/format";
import { creerClientServeur } from "@/lib/supabase/server";
import { alerteErreur, carte } from "@/lib/ui";
import {
  nombreDeJours,
  type Bagage,
  type JourVoyage,
  type Voyage,
} from "@/lib/voyage";

export const dynamic = "force-dynamic";

const MOMENTS = [
  { cle: "morning", libelle: "Matin", icone: "🌅" },
  { cle: "afternoon", libelle: "Après-midi", icone: "☀️" },
  { cle: "evening", libelle: "Soir", icone: "🌙" },
] as const;

function Info({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-slate-500">{libelle}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{valeur}</dd>
    </div>
  );
}

export default async function DetailVoyage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await creerClientServeur();

  const { data: voyage } = await supabase
    .from("trips")
    .select(
      "id, destination, start_date, end_date, budget, travelers, preferences, summary, status, error_message, created_at",
    )
    .eq("id", id)
    .maybeSingle<Voyage>();

  if (!voyage) {
    notFound();
  }

  const [{ data: donneesJours }, { data: donneesBagages }] = await Promise.all([
    supabase
      .from("trip_days")
      .select(
        "id, day_number, date, morning, afternoon, evening, estimated_budget",
      )
      .eq("trip_id", id)
      .order("day_number"),
    supabase
      .from("packing_items")
      .select("id, label, category, checked")
      .eq("trip_id", id)
      .order("label"),
  ]);

  const jours = (donneesJours ?? []) as JourVoyage[];
  const bagages = (donneesBagages ?? []) as Bagage[];
  const budgetEstime = jours.reduce(
    (total, jour) => total + jour.estimated_budget,
    0,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/voyages"
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Mes voyages
      </Link>

      <header className={`${carte} mt-4 overflow-hidden`}>
        <div className="bg-linear-to-br from-teal-500 to-sky-500 px-6 py-8 text-white md:px-8">
          <BadgeStatut statut={voyage.status} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            {voyage.destination}
          </h1>
          <p className="mt-1 text-white/90">
            Du {formaterDate(voyage.start_date)} au{" "}
            {formaterDate(voyage.end_date)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm sm:grid-cols-4 md:px-8">
          <Info
            libelle="Durée"
            valeur={`${nombreDeJours(voyage.start_date, voyage.end_date)} jour(s)`}
          />
          <Info libelle="Voyageurs" valeur={String(voyage.travelers)} />
          <Info libelle="Budget" valeur={formaterEuros(voyage.budget)} />
          {voyage.status === "done" && (
            <Info
              libelle="Estimation"
              valeur={`≈ ${formaterEuros(budgetEstime)}`}
            />
          )}
        </dl>

        {voyage.preferences && (
          <p className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600 md:px-8">
            <span className="font-medium text-slate-800">Envies : </span>
            {voyage.preferences}
          </p>
        )}
      </header>

      {voyage.status === "pending" && <SuiviVoyage id={voyage.id} />}

      {voyage.status === "error" && (
        <div className={`mt-6 ${alerteErreur}`}>
          <p className="font-semibold">La préparation de ce voyage a échoué.</p>
          <p className="mt-1">{voyage.error_message ?? "Erreur inconnue."}</p>
          <Link href="/" className="mt-3 inline-block font-medium underline">
            Réessayer avec un nouveau voyage
          </Link>
        </div>
      )}

      {voyage.status === "done" && (
        <>
          {voyage.summary && (
            <p className={`${carte} mt-6 p-6 leading-relaxed text-slate-700`}>
              {voyage.summary}
            </p>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <section>
              <h2 className="text-xl font-semibold">🗺️ Itinéraire</h2>
              <ol className="mt-4 grid gap-4">
                {jours.map((jour) => (
                  <li key={jour.id} className={`${carte} p-5`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">
                        Jour {jour.day_number}
                        <span className="font-normal text-slate-500">
                          {" "}
                          ·{" "}
                          {formaterDate(jour.date, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        ≈ {formaterEuros(jour.estimated_budget)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3">
                      {MOMENTS.map((moment) => (
                        <div
                          key={moment.cle}
                          className="grid gap-1 sm:grid-cols-[120px_1fr]"
                        >
                          <dt className="text-sm font-medium text-teal-700">
                            {moment.icone} {moment.libelle}
                          </dt>
                          <dd className="text-sm text-slate-700">
                            {jour[moment.cle]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ol>
            </section>

            <aside className="lg:sticky lg:top-20">
              <ListeBagages bagagesInitiaux={bagages} />
            </aside>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Suggestions et budgets indicatifs générés par IA : vérifiez
            horaires, prix et disponibilités avant de réserver.
          </p>
        </>
      )}
    </main>
  );
}
