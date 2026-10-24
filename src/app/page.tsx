import FormulaireVoyage from "@/components/FormulaireVoyage";
import { Separator } from "@/components/ui/separator";
import { QUOTA_GENERATIONS } from "@/lib/limitation";
import { conteneur, titrePage } from "@/lib/ui";

const ETAPES = [
  {
    titre: "Décrivez votre voyage",
    texte: "Ville de départ, destination, dates, budget et envies.",
  },
  {
    titre: "Nous cherchons de vrais lieux",
    texte: "Restaurants et sites qui existent sur place, pas des noms inventés.",
  },
  {
    titre: "Votre programme se compose",
    texte: "Itinéraire jour par jour, budget estimé et liste de bagages.",
  },
  {
    titre: "Vous êtes prévenu",
    texte: "La page se met à jour toute seule et un e-mail vous attend.",
  },
];

export default function Accueil() {
  return (
    <main className={`${conteneur} py-10 md:py-14`}>
      <header className="max-w-2xl">
        <h1 className={titrePage}>Où partez-vous ?</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Décrivez votre voyage, nous nous occupons du programme.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <FormulaireVoyage />

        <aside className="lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Comment ça marche</h2>
          <ol className="mt-5 grid gap-5">
            {ETAPES.map((etape, index) => (
              <li key={etape.titre} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{etape.titre}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{etape.texte}</p>
                </div>
              </li>
            ))}
          </ol>
          <Separator className="my-6" />
          <p className="text-sm text-muted-foreground">
            {QUOTA_GENERATIONS} itinéraires par heure et par personne, 14 jours maximum par
            voyage.
          </p>
        </aside>
      </div>
    </main>
  );
}
