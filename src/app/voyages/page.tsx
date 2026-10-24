import Link from "next/link";
import { CircleAlert, MapPin, Plus } from "lucide-react";
import BadgeStatut from "@/components/BadgeStatut";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { formaterDate, formaterEuros } from "@/lib/format";
import { creerClientServeur } from "@/lib/supabase/server";
import { teinte } from "@/lib/teinte";
import { boutonLarge, conteneur, titrePage } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { nombreDeJours, type Voyage } from "@/lib/voyage";

export const dynamic = "force-dynamic";

export default async function MesVoyages() {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("trips")
    .select("id, origin, destination, start_date, end_date, budget, travelers, status, created_at")
    .order("created_at", { ascending: false });

  const voyages = (data ?? []) as Voyage[];

  return (
    <main className={`${conteneur} py-10 md:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={titrePage}>Mes voyages</h1>
          {voyages.length > 0 && (
            <p className="mt-1 text-muted-foreground">
              {voyages.length} voyage(s) enregistré(s)
            </p>
          )}
        </div>
        <Link href="/" className={cn(buttonVariants(), boutonLarge)}>
          <Plus aria-hidden />
          Nouveau voyage
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-8 px-4 py-3">
          <CircleAlert aria-hidden />
          <AlertDescription>
            Impossible de charger vos voyages. Réessayez dans quelques instants.
          </AlertDescription>
        </Alert>
      )}

      {!error && voyages.length === 0 && (
        <section className="mt-12 flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-muted">
            <MapPin className="size-6 text-muted-foreground" aria-hidden />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Aucun voyage pour l&apos;instant</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Indiquez une destination et vos dates : votre premier itinéraire sera prêt en
            quelques secondes.
          </p>
          <Link href="/" className={cn(buttonVariants(), boutonLarge, "mt-6")}>
            Préparer mon premier voyage
          </Link>
        </section>
      )}

      <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {voyages.map((voyage) => (
          <li key={voyage.id}>
            <Link href={`/voyages/${voyage.id}`} className="group block rounded-2xl outline-offset-4">
              <div
                className={cn(
                  "relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl p-5 transition-transform duration-300 group-hover:scale-[1.02]",
                  teinte(voyage.destination),
                )}
              >
                <span className="absolute top-4 left-4">
                  <BadgeStatut statut={voyage.status} />
                </span>
                <span className="text-3xl leading-tight font-semibold tracking-tight">
                  {voyage.destination}
                </span>
              </div>

              <div className="mt-3">
                <p className="font-semibold group-hover:underline">{voyage.destination}</p>
                {voyage.origin && (
                  <p className="text-muted-foreground">Depuis {voyage.origin}</p>
                )}
                <p className="text-muted-foreground">
                  {formaterDate(voyage.start_date, { day: "numeric", month: "short" })} –{" "}
                  {formaterDate(voyage.end_date, { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">{formaterEuros(voyage.budget)}</span>{" "}
                  <span className="text-muted-foreground">
                    · {nombreDeJours(voyage.start_date, voyage.end_date)} jour(s) ·{" "}
                    {voyage.travelers} voyageur(s)
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
