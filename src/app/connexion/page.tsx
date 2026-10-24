import { redirect } from "next/navigation";
import { CalendarDays, Luggage, Mail, MapPin, Wallet } from "lucide-react";
import FormulaireConnexion from "@/components/FormulaireConnexion";
import { Card, CardContent } from "@/components/ui/card";
import { creerClientServeur } from "@/lib/supabase/server";
import { conteneur } from "@/lib/ui";

const ATOUTS = [
  {
    icone: CalendarDays,
    titre: "Un programme jour par jour",
    texte: "Matin, après-midi et soir, au rythme qui vous convient.",
  },
  {
    icone: MapPin,
    titre: "De vrais lieux",
    texte: "Restaurants et sites qui existent vraiment sur place.",
  },
  {
    icone: Wallet,
    titre: "Un budget réaliste",
    texte: "Transport, hébergement et dépenses estimés d'avance.",
  },
  {
    icone: Luggage,
    titre: "Une valise prête",
    texte: "Une liste de bagages adaptée, à cocher au fur et à mesure.",
  },
];

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { erreur } = await searchParams;

  return (
    <main className={`${conteneur} grid gap-12 py-12 md:grid-cols-[1.15fr_1fr] md:items-center md:py-20`}>
      <section>
        <p className="text-sm font-semibold text-primary">Planificateur de vacances</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Vos vacances, organisées en quelques secondes.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Indiquez une destination, vos dates et vos envies. Nous vous proposons un
          itinéraire complet, que vous retrouvez à tout moment.
        </p>

        <ul className="mt-10 hidden gap-x-8 gap-y-6 sm:grid sm:grid-cols-2">
          {ATOUTS.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="flex gap-3">
              <Icone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">{titre}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Card className="rounded-2xl py-8 shadow-[0_6px_20px_rgba(0,0,0,0.08)] ring-0 border">
        <CardContent className="px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
            Saisissez votre adresse e-mail : vous recevrez un lien pour vous connecter,
            sans mot de passe.
          </p>
          <FormulaireConnexion erreurLien={erreur === "lien-invalide"} />
        </CardContent>
      </Card>
    </main>
  );
}
