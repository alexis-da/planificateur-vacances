"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CATEGORIES_BAGAGES, type Bagage } from "@/lib/voyage";

export default function ListeBagages({
  bagagesInitiaux,
}: {
  bagagesInitiaux: Bagage[];
}) {
  const [bagages, setBagages] = useState(bagagesInitiaux);
  const [erreur, setErreur] = useState("");

  const prets = bagages.filter((b) => b.checked).length;
  const progression = bagages.length ? Math.round((prets / bagages.length) * 100) : 0;

  function modifierLocalement(id: string, checked: boolean) {
    setBagages((liste) => liste.map((b) => (b.id === id ? { ...b, checked } : b)));
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
    <Card className="rounded-2xl border py-6 ring-0">
      <CardContent className="px-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Bagages</h2>
          <span className="text-sm text-muted-foreground">
            {prets} sur {bagages.length}
          </span>
        </div>

        <Progress value={progression} className="mt-3" aria-label="Bagages prêts" />

        {erreur && (
          <Alert variant="destructive" className="mt-4 px-4 py-3">
            <CircleAlert aria-hidden />
            <AlertDescription>{erreur}</AlertDescription>
          </Alert>
        )}

        <div className="mt-5 grid gap-5">
          {CATEGORIES_BAGAGES.map((categorie) => {
            const objets = bagages.filter((b) => b.category === categorie);
            if (objets.length === 0) return null;

            return (
              <div key={categorie}>
                <h3 className="text-sm font-semibold">{categorie}</h3>
                <ul className="mt-2 grid gap-0.5">
                  {objets.map((objet) => (
                    <li key={objet.id}>
                      <label className="-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                        <Checkbox
                          checked={objet.checked}
                          onCheckedChange={() => basculer(objet)}
                        />
                        <span
                          className={cn(objet.checked && "text-muted-foreground line-through")}
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
      </CardContent>
    </Card>
  );
}
