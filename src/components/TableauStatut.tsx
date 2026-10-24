"use client";

import { useEffect, useState } from "react";
import type { ResultatControle, Statut } from "@/lib/statut";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { boutonLarge, conteneur, titrePage } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ReponseStatut = {
  verifieLe: string;
  statutGlobal: Statut;
  services: ResultatControle[];
};

const AFFICHAGE: Record<Statut, { libelle: string; classes: string }> = {
  operationnel: {
    libelle: "Opérationnel",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  degrade: { libelle: "Dégradé", classes: "border-amber-200 bg-amber-50 text-amber-800" },
  en_panne: { libelle: "En panne", classes: "border-red-200 bg-red-50 text-red-800" },
};

const MESSAGE_GLOBAL: Record<Statut, string> = {
  operationnel: "Tous les services sont opérationnels.",
  degrade: "Au moins un service répond lentement.",
  en_panne: "Au moins un service est en panne.",
};

async function recupererStatut(): Promise<ReponseStatut> {
  const reponse = await fetch("/api/admin/statut", { cache: "no-store" });
  if (!reponse.ok) {
    throw new Error(`Statut ${reponse.status}`);
  }
  return reponse.json();
}

export default function TableauStatut() {
  const [donnees, setDonnees] = useState<ReponseStatut | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  function actualiser() {
    setChargement(true);
    recupererStatut()
      .then((resultat) => {
        setDonnees(resultat);
        setErreur("");
      })
      .catch(() => setErreur("Impossible de joindre la route de statut."))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    recupererStatut()
      .then(setDonnees)
      .catch(() => setErreur("Impossible de joindre la route de statut."))
      .finally(() => setChargement(false));
  }, []);

  return (
    <main className={`${conteneur} py-10 md:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={titrePage}>Administration</h1>
          <p className="mt-1 text-muted-foreground">
            État des services utilisés par l&apos;application.
          </p>
        </div>
        <Button onClick={actualiser} disabled={chargement} variant="outline" className={boutonLarge}>
          <RefreshCw className={cn(chargement && "animate-spin")} aria-hidden />
          {chargement ? "Vérification…" : "Relancer les tests"}
        </Button>
      </div>

      {erreur && (
        <Alert variant="destructive" className="mt-8 px-4 py-3">
          <CircleAlert aria-hidden />
          <AlertDescription>{erreur}</AlertDescription>
        </Alert>
      )}

      {donnees && (
        <>
          <p
            className={cn(
              "mt-8 rounded-xl border px-4 py-3 font-medium",
              AFFICHAGE[donnees.statutGlobal].classes,
            )}
          >
            {MESSAGE_GLOBAL[donnees.statutGlobal]}
          </p>

          <ul className="mt-6 divide-y rounded-2xl border">
            {donnees.services.map((s) => (
              <li key={s.service} className="grid gap-2 px-5 py-4 sm:grid-cols-[220px_1fr_auto] sm:items-center sm:gap-6">
                <div>
                  <p className="font-medium">{s.service}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <p className="text-sm">
                  {s.message}
                  <span className="ml-2 text-muted-foreground">{s.latenceMs} ms</span>
                </p>
                <Badge variant="outline" className={cn("h-6 px-2.5", AFFICHAGE[s.statut].classes)}>
                  {AFFICHAGE[s.statut].libelle}
                </Badge>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-muted-foreground">
            Dernière vérification : {new Date(donnees.verifieLe).toLocaleString("fr-FR")}
          </p>
        </>
      )}
    </main>
  );
}
