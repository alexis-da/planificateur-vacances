import FormulaireVoyage from "@/components/FormulaireVoyage";
import { QUOTA_GENERATIONS } from "@/lib/limitation";
import { carte } from "@/lib/ui";

const ETAPES = [
  {
    icone: "📝",
    texte: "Décrivez votre voyage : destination, dates, budget et envies.",
  },
  {
    icone: "✨",
    texte: "L'IA prépare un itinéraire jour par jour et une liste de bagages.",
  },
  {
    icone: "📬",
    texte: "La page se met à jour toute seule et un e-mail vous prévient.",
  },
];

export default function Accueil() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Où partez-vous ?
        </h1>
        <p className="mt-2 text-slate-600">
          Décrivez votre voyage, l&apos;IA s&apos;occupe du programme.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <FormulaireVoyage />

        <aside className={`${carte} p-6`}>
          <h2 className="font-semibold">Comment ça marche</h2>
          <ol className="mt-4 grid gap-4">
            {ETAPES.map((etape) => (
              <li
                key={etape.icone}
                className="flex gap-3 text-sm text-slate-600"
              >
                <span aria-hidden className="text-lg">
                  {etape.icone}
                </span>
                {etape.texte}
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
            {QUOTA_GENERATIONS} itinéraires par heure et par utilisateur · 14
            jours maximum par voyage.
          </p>
        </aside>
      </div>
    </main>
  );
}
