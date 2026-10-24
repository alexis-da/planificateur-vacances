"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert, Clock, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { boutonLarge } from "@/lib/ui";
import { LIMITES, nombreDeJours, validerDemande } from "@/lib/voyage";

type Etat =
  | { type: "saisie" }
  | { type: "chargement" }
  | { type: "resultat"; id: string; destination: string }
  | { type: "erreur"; message: string }
  | { type: "quota"; message: string };

const CHAMPS_VIDES = {
  origin: "",
  destination: "",
  start_date: "",
  end_date: "",
  budget: "",
  travelers: "2",
  preferences: "",
};

type NomChamp = keyof typeof CHAMPS_VIDES;

// Champ « à étiquette intégrée », comme sur les moteurs de réservation de voyage
const CADRE =
  "block cursor-text rounded-xl border border-input px-4 py-2.5 transition-shadow focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground";
const ETIQUETTE = "block text-xs font-semibold";
const SAISIE =
  "h-7 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent";

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
  const dureeInvalide = duree !== null && (duree < 1 || duree > LIMITES.joursMax);

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
          message: donnees.erreur ?? "Une erreur est survenue. Réessayez plus tard.",
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
        message: "Impossible de contacter le serveur. Vérifiez votre connexion.",
      });
    }
  }

  if (etat.type === "resultat") {
    return (
      <Card className="rounded-2xl border py-8 ring-0">
        <CardContent className="px-8">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Votre voyage pour {etat.destination} est en préparation
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Nous préparons votre itinéraire, votre budget et votre liste de bagages. La
            page du voyage se met à jour toute seule, et un e-mail vous préviendra dès
            qu&apos;il sera prêt.
          </p>
          {restantes !== null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Il vous reste {restantes} génération(s) pour l&apos;heure en cours.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/voyages/${etat.id}`}
              className={cn(buttonVariants(), boutonLarge)}
            >
              Suivre la préparation
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEtat({ type: "saisie" })}
              className={boutonLarge}
            >
              Préparer un autre voyage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border py-0 shadow-[0_6px_20px_rgba(0,0,0,0.06)] ring-0">
      <form onSubmit={envoyer} noValidate>
        <CardContent className="px-6 py-6 md:px-8 md:py-8">
          <fieldset disabled={chargement} className="grid gap-6">
            <section>
              <h2 className="text-lg font-semibold">Le voyage</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Ville de départ</span>
                  <Input
                    value={champs.origin}
                    onChange={modifier("origin")}
                    maxLength={LIMITES.destinationMax}
                    placeholder="Paris"
                    className={SAISIE}
                  />
                </label>
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Destination</span>
                  <Input
                    value={champs.destination}
                    onChange={modifier("destination")}
                    maxLength={LIMITES.destinationMax}
                    placeholder="Lisbonne, Portugal"
                    className={SAISIE}
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Les dates</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Départ</span>
                  <Input
                    type="date"
                    min={aujourdhui}
                    value={champs.start_date}
                    onChange={modifier("start_date")}
                    className={SAISIE}
                  />
                </label>
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Retour</span>
                  <Input
                    type="date"
                    min={champs.start_date || aujourdhui}
                    value={champs.end_date}
                    onChange={modifier("end_date")}
                    className={SAISIE}
                  />
                </label>
              </div>
              {duree !== null && (
                <p
                  className={cn(
                    "mt-2 text-sm",
                    dureeInvalide ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {duree < 1
                    ? "La date de retour doit être après la date de départ."
                    : `${duree} jour(s)${
                        duree > LIMITES.joursMax ? ` : ${LIMITES.joursMax} jours maximum` : ""
                      }`}
                </p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold">Le groupe et le budget</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Voyageurs</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={LIMITES.voyageursMax}
                    value={champs.travelers}
                    onChange={modifier("travelers")}
                    className={SAISIE}
                  />
                </label>
                <label className={CADRE}>
                  <span className={ETIQUETTE}>Budget total, en euros</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={LIMITES.budgetMax}
                    value={champs.budget}
                    onChange={modifier("budget")}
                    placeholder="1 200"
                    className={SAISIE}
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">
                Vos envies{" "}
                <span className="text-sm font-normal text-muted-foreground">(facultatif)</span>
              </h2>
              <label className={cn(CADRE, "mt-3")}>
                <span className="sr-only">Vos envies</span>
                <Textarea
                  value={champs.preferences}
                  onChange={modifier("preferences")}
                  maxLength={LIMITES.enviesMax}
                  rows={4}
                  placeholder="Musées, cuisine locale, randonnée, rythme tranquille…"
                  className="min-h-24 resize-y border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent"
                />
              </label>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {champs.preferences.length} / {LIMITES.enviesMax}
              </p>
            </section>
          </fieldset>

          {etat.type === "erreur" && (
            <Alert variant="destructive" className="mt-6 px-4 py-3">
              <CircleAlert aria-hidden />
              <AlertDescription>{etat.message}</AlertDescription>
            </Alert>
          )}

          {etat.type === "quota" && (
            <Alert className="mt-6 border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <Clock aria-hidden />
              <AlertTitle>Quota atteint</AlertTitle>
              <AlertDescription className="text-amber-800">{etat.message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {restantes === null
                ? "Résultat en quelques secondes, par e-mail aussi."
                : restantes > 0
                  ? `Il vous reste ${restantes} génération(s) pour l'heure en cours.`
                  : "Vous avez utilisé tout votre quota pour l'heure en cours."}
            </p>
            <Button type="submit" disabled={chargement} className={cn(boutonLarge, "px-7")}>
              {chargement && <Loader2 className="animate-spin" aria-hidden />}
              {chargement ? "Envoi de la demande…" : "Préparer mon itinéraire"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
