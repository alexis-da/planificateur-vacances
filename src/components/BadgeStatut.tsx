import type { StatutVoyage } from "@/lib/voyage";

const AFFICHAGE: Record<StatutVoyage, { libelle: string; classes: string }> = {
  pending: {
    libelle: "En préparation",
    classes: "bg-amber-100 text-amber-800",
  },
  done: { libelle: "Prêt", classes: "bg-emerald-100 text-emerald-800" },
  error: { libelle: "Échec", classes: "bg-red-100 text-red-800" },
};

export default function BadgeStatut({ statut }: { statut: StatutVoyage }) {
  const { libelle, classes } = AFFICHAGE[statut];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {statut === "pending" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      )}
      {libelle}
    </span>
  );
}
