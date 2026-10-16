"use client";

import Link from "next/link";
import { useState } from "react";
import { LIMITES, nombreDeJours, validerDemande } from "@/lib/voyage";
import {
  alerteAttention,
  alerteErreur,
  boutonPrincipal,
  boutonSecondaire,
  carte,
  champ,
  libelle,
} from "@/lib/ui";

type Etat =
  | { type: "saisie" }
  | { type: "chargement" }
  | { type: "resultat"; id: string; destination: string }
  | { type: "erreur"; message: string }
  | { type: "quota"; message: string };

const CHAMPS_VIDES = {
  destination: "",
  start_date: "",
  end_date: "",
  budget: "",
  travelers: "2",
  preferences: "",
};

type NomChamp = keyof typeof CHAMPS_VIDES;

export default function FormulaireVoyage() {
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [etat, setEtat] = useState<Etat>({ type: "saisie" });
  const [restantes, setRestantes] = useState<number | null>(null);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const chargement = etat.type === "chargement";
  const duree =
    champs.start_date && champs.end_date
      ? nombreDeJours(champs.start_date, champs.end_date)
      : null;
  const dureeInvalide =
    duree !== null && (duree < 1 || duree > LIMITES.joursMax);

  function modifier(nom: NomChamp) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setChamps((actuels) => ({ ...actuels, [nom]: e.target.value }));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();

    // Vérification immédiate dans le navigateur : le serveur refait la même
    const verification = validerDemande({
      ...champs,
      budget: Number(champs.budget),
      travelers: Number(champs.travelers),
    });

    if ("erreur" in verification) {
      setEtat({ type: "erreur", message: verification.erreur });
      return;
    }

    setEtat({ type: "chargement" });

    try {
      const reponse = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verification.demande),
      });
      const donnees = await reponse.json().catch(() => ({}));

      const entete = reponse.headers.get("X-RateLimit-Remaining");
      if (entete !== null) setRestantes(Number(entete));

      if (reponse.status === 429) {
        setEtat({ type: "quota", message: donnees.erreur ?? "Quota atteint." });
        return;
      }

      if (!reponse.ok) {
        setEtat({
          type: "erreur",
          message:
            donnees.erreur ?? "Une erreur est survenue. Réessayez plus tard.",
        });
        return;
      }

      setEtat({
        type: "resultat",
        id: donnees.id,
        destination: verification.demande.destination,
      });
      setChamps(CHAMPS_VIDES);
    } catch {
      setEtat({
        type: "erreur",
        message:
          "Impossible de contacter le serveur. Vérifiez votre connexion.",
      });
    }
  }

  if (etat.type === "resultat") {
    return (
      <section className={`${carte} p-6 md:p-8`}>
        <p className="text-4xl" aria-hidden>
          🧳
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Votre voyage pour {etat.destination} est en préparation
        </h2>
        <p className="mt-2 text-slate-600">
          L&apos;IA prépare votre itinéraire et votre liste de bagages. La page
          du voyage se met à jour toute seule, et un e-mail vous préviendra dès
          qu&apos;il sera prêt.
        </p>
        {restantes !== null && (
          <p className="mt-2 text-sm text-slate-500">
            Il vous reste {restantes} génération(s) pour l&apos;heure en cours.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/voyages/${etat.id}`} className={boutonPrincipal}>
            Suivre la préparation
          </Link>
          <button
            type="button"
            onClick={() => setEtat({ type: "saisie" })}
            className={boutonSecondaire}
          >
            Préparer un autre voyage
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={envoyer} className={`${carte} p-6 md:p-8`} noValidate>
      <fieldset disabled={chargement} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="destination" className={libelle}>
            Destination
          </label>
          <input
            id="destination"
            value={champs.destination}
            onChange={modifier("destination")}
            maxLength={LIMITES.destinationMax}
            placeholder="Exemple : Lisbonne, Portugal"
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="start_date" className={libelle}>
            Date de départ
          </label>
          <input
            id="start_date"
            type="date"
            min={aujourdhui}
            value={champs.start_date}
            onChange={modifier("start_date")}
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="end_date" className={libelle}>
            Date de retour
          </label>
          <input
            id="end_date"
            type="date"
            min={champs.start_date || aujourdhui}
            value={champs.end_date}
            onChange={modifier("end_date")}
            className={champ}
          />
        </div>

        {duree !== null && (
          <p
            className={`-mt-2 text-sm sm:col-span-2 ${
              dureeInvalide ? "text-red-600" : "text-slate-500"
            }`}
          >
            {duree < 1
              ? "La date de retour doit être après la date de départ."
              : `${duree} jour(s)${
                  duree > LIMITES.joursMax
                    ? ` : ${LIMITES.joursMax} jours maximum`
                    : ""
                }`}
          </p>
        )}

        <div>
          <label htmlFor="budget" className={libelle}>
            Budget total (€)
          </label>
          <input
            id="budget"
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITES.budgetMax}
            value={champs.budget}
            onChange={modifier("budget")}
            placeholder="1200"
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="travelers" className={libelle}>
            Nombre de voyageurs
          </label>
          <input
            id="travelers"
            type="number"
            inputMode="numeric"
            min={1}
            max={LIMITES.voyageursMax}
            value={champs.travelers}
            onChange={modifier("travelers")}
            className={champ}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferences" className={libelle}>
            Vos envies{" "}
            <span className="font-normal text-slate-400">(facultatif)</span>
          </label>
          <textarea
            id="preferences"
            value={champs.preferences}
            onChange={modifier("preferences")}
            maxLength={LIMITES.enviesMax}
            rows={4}
            placeholder="Musées, cuisine locale, randonnée, rythme tranquille…"
            className={champ}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {champs.preferences.length} / {LIMITES.enviesMax}
          </p>
        </div>
      </fieldset>

      {etat.type === "erreur" && (
        <p className={`mt-5 ${alerteErreur}`}>{etat.message}</p>
      )}

      {etat.type === "quota" && (
        <div className={`mt-5 ${alerteAttention}`}>
          <p className="font-semibold">⏳ Quota atteint</p>
          <p className="mt-1">{etat.message}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {restantes !== null ? (
          <p className="text-sm text-slate-500">
            {restantes > 0
              ? `Il vous reste ${restantes} génération(s) pour l'heure en cours.`
              : "Vous avez utilisé tout votre quota pour l'heure en cours."}
          </p>
        ) : (
          <span />
        )}
        <button type="submit" disabled={chargement} className={boutonPrincipal}>
          {chargement && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {chargement ? "Envoi de la demande…" : "Préparer mon itinéraire"}
        </button>
      </div>
    </form>
  );
}
