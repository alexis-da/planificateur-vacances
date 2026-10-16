"use client";

import { useEffect, useState } from "react";
import type { ResultatControle, Statut } from "@/lib/statut";
import { alerteErreur, boutonPrincipal, carte } from "@/lib/ui";

type ReponseStatut = {
  verifieLe: string;
  statutGlobal: Statut;
  services: ResultatControle[];
};

const AFFICHAGE: Record<Statut, { libelle: string; classes: string }> = {
  operationnel: {
    libelle: "Opérationnel",
    classes: "bg-emerald-100 text-emerald-800",
  },
  degrade: { libelle: "Dégradé", classes: "bg-amber-100 text-amber-800" },
  en_panne: { libelle: "En panne", classes: "bg-red-100 text-red-800" },
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
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-slate-600">
            État des services utilisés par l&apos;application.
          </p>
        </div>
        <button
          onClick={actualiser}
          disabled={chargement}
          className={boutonPrincipal}
        >
          {chargement ? "Vérification…" : "Relancer les tests"}
        </button>
      </div>

      {erreur && <p className={`mt-6 ${alerteErreur}`}>{erreur}</p>}

      {donnees && (
        <>
          <p
            className={`mt-6 rounded-xl p-4 font-medium ${AFFICHAGE[donnees.statutGlobal].classes}`}
          >
            {MESSAGE_GLOBAL[donnees.statutGlobal]}
          </p>

          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {donnees.services.map((s) => (
              <li key={s.service} className={`${carte} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.service}</p>
                    <p className="text-sm text-slate-500">{s.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${AFFICHAGE[s.statut].classes}`}
                  >
                    {AFFICHAGE[s.statut].libelle}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{s.message}</p>
                <p className="mt-2 text-xs text-slate-400">{s.latenceMs} ms</p>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-slate-500">
            Dernière vérification :{" "}
            {new Date(donnees.verifieLe).toLocaleString("fr-FR")}
          </p>
        </>
      )}
    </main>
  );
}
