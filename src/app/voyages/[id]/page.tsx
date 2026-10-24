import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CircleAlert, Moon, Sun, Sunrise, TriangleAlert } from "lucide-react";
import BadgeStatut from "@/components/BadgeStatut";
import ListeBagages from "@/components/ListeBagages";
import SuiviVoyage from "@/components/SuiviVoyage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formaterDate, formaterEuros } from "@/lib/format";
import { creerClientServeur } from "@/lib/supabase/server";
import { teinte } from "@/lib/teinte";
import { conteneur } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { nombreDeJours, type Bagage, type JourVoyage, type Voyage } from "@/lib/voyage";

export const dynamic = "force-dynamic";

const MOMENTS = [
  { cle: "morning", libelle: "Matin", icone: Sunrise },
  { cle: "afternoon", libelle: "Après-midi", icone: Sun },
  { cle: "evening", libelle: "Soir", icone: Moon },
] as const;

function LigneBudget({ libelle, montant }: { libelle: string; montant: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{libelle}</dt>
      <dd>{formaterEuros(montant)}</dd>
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
      "id, origin, destination, start_date, end_date, budget, travelers, preferences, summary, transport_estimate, lodging_estimate, budget_advice, status, error_message, created_at",
    )
    .eq("id", id)
    .maybeSingle<Voyage>();

  if (!voyage) {
    notFound();
  }

  const [{ data: donneesJours }, { data: donneesBagages }] = await Promise.all([
    supabase
      .from("trip_days")
      .select("id, day_number, date, morning, afternoon, evening, estimated_budget")
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
  const budgetSurPlace = jours.reduce((total, jour) => total + jour.estimated_budget, 0);
  const budgetTotal =
    budgetSurPlace + (voyage.transport_estimate ?? 0) + (voyage.lodging_estimate ?? 0);
  const duree = nombreDeJours(voyage.start_date, voyage.end_date);
  const nuits = duree - 1;
  const budgetComplet = voyage.transport_estimate !== null && voyage.lodging_estimate !== null;

  return (
    <main className={`${conteneur} py-8 md:py-10`}>
      <Link
        href="/voyages"
        className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Mes voyages
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {voyage.destination}
          </h1>
          <BadgeStatut statut={voyage.status} />
        </div>
        <p className="mt-2 text-muted-foreground">
          {formaterDate(voyage.start_date)} – {formaterDate(voyage.end_date)} · {duree} jour(s)
          · {voyage.travelers} voyageur(s)
          {voyage.origin && ` · depuis ${voyage.origin}`}
        </p>
      </header>

      <div
        className={cn(
          "mt-6 flex h-40 items-end rounded-2xl p-6 md:h-56 md:p-8",
          teinte(voyage.destination),
        )}
      >
        <p className="max-w-2xl text-lg font-medium md:text-xl">
          {voyage.preferences ? `Vos envies : ${voyage.preferences}` : "Un voyage à votre rythme."}
        </p>
      </div>

      {voyage.status === "pending" && <SuiviVoyage id={voyage.id} />}

      {voyage.status === "error" && (
        <Alert variant="destructive" className="mt-10 px-4 py-3">
          <CircleAlert aria-hidden />
          <AlertTitle>La préparation de ce voyage a échoué</AlertTitle>
          <AlertDescription>
            <p>{voyage.error_message ?? "Erreur inconnue."}</p>
            <Link href="/" className="font-medium">
              Réessayer avec un nouveau voyage
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {voyage.status === "done" && (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            {voyage.summary && (
              <section>
                <h2 className="text-xl font-semibold">Votre voyage en bref</h2>
                <p className="mt-3 text-base leading-relaxed">{voyage.summary}</p>
              </section>
            )}

            <Separator className="my-10" />

            <section>
              <h2 className="text-xl font-semibold">Itinéraire jour par jour</h2>
              <ol className="mt-6">
                {jours.map((jour, index) => (
                  <li key={jour.id}>
                    {index > 0 && <Separator className="my-8" />}
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-lg font-semibold">
                        Jour {jour.day_number}
                        <span className="ml-2 font-normal text-muted-foreground first-letter:uppercase">
                          {formaterDate(jour.date, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        environ {formaterEuros(jour.estimated_budget)}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-4">
                      {MOMENTS.map(({ cle, libelle, icone: Icone }) => (
                        <div key={cle} className="grid grid-cols-[24px_1fr] gap-x-3">
                          <Icone className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                          <div>
                            <dt className="font-medium">{libelle}</dt>
                            <dd className="mt-0.5 leading-relaxed text-muted-foreground">
                              {jour[cle]}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ol>
            </section>

            <p className="mt-10 text-sm text-muted-foreground">
              Suggestions et budgets indicatifs générés par IA : vérifiez horaires, prix et
              disponibilités avant de réserver.
            </p>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-28">
            {budgetComplet && (
              <Card className="rounded-2xl border py-6 shadow-[0_6px_20px_rgba(0,0,0,0.08)] ring-0">
                <CardContent className="px-6">
                  <p className="text-sm text-muted-foreground">Budget estimé</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formaterEuros(budgetTotal)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      pour {voyage.travelers} voyageur(s)
                    </span>
                  </p>

                  <dl className="mt-5 grid gap-3 text-sm">
                    <LigneBudget
                      libelle="Transport aller-retour"
                      montant={voyage.transport_estimate ?? 0}
                    />
                    <LigneBudget
                      libelle={`Hébergement, ${nuits} nuit(s)`}
                      montant={voyage.lodging_estimate ?? 0}
                    />
                    <LigneBudget libelle="Dépenses sur place" montant={budgetSurPlace} />
                  </dl>

                  <Separator className="my-4" />

                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-4 font-semibold">
                      <dt>Total estimé</dt>
                      <dd>{formaterEuros(budgetTotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Votre budget</dt>
                      <dd>{formaterEuros(voyage.budget)}</dd>
                    </div>
                  </dl>

                  {budgetTotal > voyage.budget && (
                    <Alert className="mt-4 border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
                      <TriangleAlert aria-hidden />
                      <AlertDescription className="text-amber-800">
                        Dépassement d&apos;environ {formaterEuros(budgetTotal - voyage.budget)}.
                      </AlertDescription>
                    </Alert>
                  )}

                  {voyage.budget_advice && (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {voyage.budget_advice}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <ListeBagages bagagesInitiaux={bagages} />
          </aside>
        </div>
      )}
    </main>
  );
}
