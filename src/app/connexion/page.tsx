import { redirect } from "next/navigation";
import FormulaireConnexion from "@/components/FormulaireConnexion";
import { creerClientServeur } from "@/lib/supabase/server";
import { carte } from "@/lib/ui";

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
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
      <section>
        <p className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
          ✈ Escapade
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Vos vacances, organisées en quelques secondes.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Indiquez une destination, vos dates et vos envies : l&apos;IA vous
          propose un itinéraire jour par jour et une liste de bagages, que vous
          retrouvez à tout moment.
        </p>
        <ul className="mt-6 grid gap-2 text-sm text-slate-600">
          <li>🗺️ Matin, après-midi et soir pour chaque journée</li>
          <li>🎒 Une liste de bagages à cocher</li>
          <li>📬 Un e-mail dès que votre itinéraire est prêt</li>
        </ul>
      </section>

      <section className={`${carte} p-6 md:p-8`}>
        <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
        <p className="mt-2 text-sm text-slate-600">
          Saisissez votre adresse e-mail : vous recevrez un lien pour vous
          connecter, sans mot de passe.
        </p>
        <FormulaireConnexion erreurLien={erreur === "lien-invalide"} />
      </section>
    </main>
  );
}
