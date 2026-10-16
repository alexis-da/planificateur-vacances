import { limiteurGenerations } from "@/lib/limitation";
import { publierGeneration } from "@/lib/qstash";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/server";
import { validerDemande } from "@/lib/voyage";

export async function POST(request: Request) {
  // 0. Vérification de la session
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      {
        erreur:
          "Votre session a expiré. Reconnectez-vous pour créer un voyage.",
      },
      { status: 401 },
    );
  }

  // 1. Validation de la demande
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return Response.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const resultat = validerDemande(corps);
  if ("erreur" in resultat) {
    return Response.json({ erreur: resultat.erreur }, { status: 400 });
  }

  // 2. Vérification du quota de l'utilisateur
  const enTetesQuota: Record<string, string> = {};

  try {
    const quota = await limiteurGenerations.limit(user.id);

    enTetesQuota["X-RateLimit-Limit"] = String(quota.limit);
    enTetesQuota["X-RateLimit-Remaining"] = String(quota.remaining);

    if (!quota.success) {
      const secondes = Math.max(
        1,
        Math.ceil((quota.reset - Date.now()) / 1000),
      );
      const minutes = Math.ceil(secondes / 60);

      return Response.json(
        {
          erreur: `Vous avez atteint votre quota de ${quota.limit} itinéraires par heure. Réessayez dans ${minutes} minute(s).`,
          quotaAtteint: true,
        },
        {
          status: 429,
          headers: { ...enTetesQuota, "Retry-After": String(secondes) },
        },
      );
    }
  } catch (erreur) {
    console.error("Limitation de débit indisponible :", erreur);
  }

  // 3. Enregistrement du voyage, avec le statut « pending »
  const { data: voyage, error } = await supabase
    .from("trips")
    .insert(resultat.demande)
    .select("id, status")
    .single();

  if (error || !voyage) {
    console.error("Erreur lors de l'enregistrement du voyage :", error);
    return Response.json(
      { erreur: "Le voyage n'a pas pu être enregistré. Réessayez plus tard." },
      { status: 500 },
    );
  }

  // 4. Publication du message de génération dans la file
  try {
    await publierGeneration(voyage.id);
  } catch (erreur) {
    console.error("Erreur lors de la publication du message :", erreur);

    // Traitement système, sans utilisateur : usage légitime du client administrateur
    await creerClientAdmin()
      .from("trips")
      .update({
        status: "error",
        error_message: "La génération n'a pas pu être lancée.",
      })
      .eq("id", voyage.id);

    return Response.json(
      { erreur: "La génération n'a pas pu être lancée. Réessayez plus tard." },
      { status: 503 },
    );
  }

  // 5. Réponse immédiate : la demande est acceptée, le traitement suivra
  return Response.json(voyage, { status: 202, headers: enTetesQuota });
}
