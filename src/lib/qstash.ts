import "server-only";
import { Client } from "@upstash/qstash";

export const NOMBRE_REESSAIS = 3;

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN ?? "",
  // Une valeur vide est ignorée : la bibliothèque utilise alors l'adresse de QStash dans le cloud
  baseUrl: process.env.QSTASH_URL || undefined,
});

export async function publierGeneration(tripId: string) {
  const appUrl = process.env.APP_URL;

  if (!process.env.QSTASH_URL || !process.env.QSTASH_TOKEN) {
    throw new Error(
      "Les variables QSTASH_URL et QSTASH_TOKEN doivent être définies.",
    );
  }

  if (!appUrl) {
    throw new Error("La variable APP_URL n'est pas définie.");
  }

  // Fournie par Vercel : permet à QStash de joindre un déploiement Preview protégé
  const contournement = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  return qstash.publishJSON({
    url: `${appUrl}/api/jobs/generer-voyage`,
    body: { tripId },
    retries: NOMBRE_REESSAIS,
    ...(contournement && {
      headers: { "x-vercel-protection-bypass": contournement },
    }),
  });
}
