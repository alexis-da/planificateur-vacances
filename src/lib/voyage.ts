export type StatutVoyage = "pending" | "done" | "error";

export const LIMITES = {
  destinationMin: 2,
  destinationMax: 100,
  joursMax: 14,
  budgetMax: 100000,
  voyageursMax: 20,
  enviesMax: 1000,
};

export const CATEGORIES_BAGAGES = [
  "Documents",
  "Vêtements",
  "Hygiène",
  "Santé",
  "Électronique",
  "Divers",
];

export type DemandeVoyage = {
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  travelers: number;
  preferences: string;
};

export type JourGenere = {
  day_number: number;
  morning: string;
  afternoon: string;
  evening: string;
  estimated_budget: number;
};

export type BagageGenere = {
  label: string;
  category: string;
};

export type ItineraireGenere = {
  summary: string;
  days: JourGenere[];
  packing: BagageGenere[];
};

export type Voyage = DemandeVoyage & {
  id: string;
  summary: string | null;
  status: StatutVoyage;
  error_message: string | null;
  created_at: string;
};

export type JourVoyage = JourGenere & { id: string; date: string };

export type Bagage = BagageGenere & { id: string; checked: boolean };

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function estDateValide(valeur: unknown): valeur is string {
  if (typeof valeur !== "string" || !FORMAT_DATE.test(valeur)) return false;
  const date = new Date(`${valeur}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === valeur
  );
}

export function nombreDeJours(debut: string, fin: string): number {
  const ecart =
    Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`);
  return Math.round(ecart / 86_400_000) + 1;
}

export function ajouterJours(date: string, jours: number): string {
  const resultat = new Date(`${date}T00:00:00Z`);
  resultat.setUTCDate(resultat.getUTCDate() + jours);
  return resultat.toISOString().slice(0, 10);
}

// Utilisée côté navigateur (message immédiat) et côté serveur (seule source fiable)
export function validerDemande(
  corps: unknown,
): { demande: DemandeVoyage } | { erreur: string } {
  const b = (
    typeof corps === "object" && corps !== null ? corps : {}
  ) as Record<string, unknown>;

  const destination =
    typeof b.destination === "string" ? b.destination.trim() : "";
  if (
    destination.length < LIMITES.destinationMin ||
    destination.length > LIMITES.destinationMax
  ) {
    return {
      erreur: `La destination est obligatoire (${LIMITES.destinationMax} caractères maximum).`,
    };
  }

  const debut = b.start_date;
  const fin = b.end_date;
  if (!estDateValide(debut) || !estDateValide(fin)) {
    return { erreur: "Les dates de départ et de retour sont obligatoires." };
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (debut < aujourdhui) {
    return { erreur: "La date de départ ne peut pas être dans le passé." };
  }

  if (fin < debut) {
    return { erreur: "La date de retour doit être après la date de départ." };
  }

  const jours = nombreDeJours(debut, fin);
  if (jours > LIMITES.joursMax) {
    return {
      erreur: `Le voyage ne peut pas dépasser ${LIMITES.joursMax} jours (actuellement ${jours}).`,
    };
  }

  const budget = Number(b.budget);
  if (!Number.isInteger(budget) || budget < 1 || budget > LIMITES.budgetMax) {
    return {
      erreur: `Le budget doit être un nombre entier d'euros entre 1 et ${LIMITES.budgetMax}.`,
    };
  }

  const travelers = Number(b.travelers);
  if (
    !Number.isInteger(travelers) ||
    travelers < 1 ||
    travelers > LIMITES.voyageursMax
  ) {
    return {
      erreur: `Le nombre de voyageurs doit être compris entre 1 et ${LIMITES.voyageursMax}.`,
    };
  }

  const preferences =
    typeof b.preferences === "string" ? b.preferences.trim() : "";
  if (preferences.length > LIMITES.enviesMax) {
    return {
      erreur: `Les envies ne peuvent pas dépasser ${LIMITES.enviesMax} caractères.`,
    };
  }

  return {
    demande: {
      destination,
      start_date: debut,
      end_date: fin,
      budget,
      travelers,
      preferences,
    },
  };
}
