import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StatutVoyage } from "@/lib/voyage";

const AFFICHAGE: Record<StatutVoyage, { libelle: string; classes: string }> = {
  pending: { libelle: "En préparation", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  done: { libelle: "Prêt", classes: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  error: { libelle: "Échec", classes: "bg-red-50 text-red-800 border-red-200" },
};

export default function BadgeStatut({ statut }: { statut: StatutVoyage }) {
  const { libelle, classes } = AFFICHAGE[statut];

  return (
    <Badge variant="outline" className={cn("h-6 px-2.5", classes)}>
      {statut === "pending" && (
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
      )}
      {libelle}
    </Badge>
  );
}
