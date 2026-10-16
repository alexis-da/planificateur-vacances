"use client";

import { useState } from "react";
import { alerteErreur, carte } from "@/lib/ui";
import { CATEGORIES_BAGAGES, type Bagage } from "@/lib/voyage";

export default function ListeBagages({
  bagagesInitiaux,
}: {
  bagagesInitiaux: Bagage[];
}) {
  const [bagages, setBagages] = useState(bagagesInitiaux);
  const [erreur, setErreur] = useState("");

  const prets = bagages.filter((b) => b.checked).length;
  const progression = bagages.length
    ? Math.round((prets / bagages.length) * 100)
    : 0;

  function modifierLocalement(id: string, checked: boolean) {
    setBagages((liste) =>
      liste.map((b) => (b.id === id ? { ...b, checked } : b)),
    );
  }

  async function basculer(bagage: Bagage) {
    const checked = !bagage.checked;
    setErreur("");
    // Affichage immédiat, annulé si l'enregistrement échoue
    modifierLocalement(bagage.id, checked);

    try {
      const reponse = await fetch(`/api/packing/${bagage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      if (!reponse.ok) throw new Error();
    } catch {
      modifierLocalement(bagage.id, !checked);
      setErreur("La modification n'a pas pu être enregistrée. Réessayez.");
    }
  }

  return (
    <section className={`${carte} p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🎒 Bagages</h2>
        <span className="text-sm text-slate-500">
          {prets} / {bagages.length}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${progression}%` }}
        />
      </div>

      {erreur && <p className={`mt-4 ${alerteErreur}`}>{erreur}</p>}

      <div className="mt-4 grid gap-5">
        {CATEGORIES_BAGAGES.map((categorie) => {
          const objets = bagages.filter((b) => b.category === categorie);
          if (objets.length === 0) return null;

          return (
            <div key={categorie}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {categorie}
              </h3>
              <ul className="mt-2 grid gap-1">
                {objets.map((objet) => (
                  <li key={objet.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={objet.checked}
                        onChange={() => basculer(objet)}
                        className="h-4 w-4 accent-teal-600"
                      />
                      <span
                        className={
                          objet.checked ? "text-slate-400 line-through" : ""
                        }
                      >
                        {objet.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
