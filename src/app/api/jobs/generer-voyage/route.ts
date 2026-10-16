import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { envoyerNotification } from "@/lib/email";
import { genererVoyage } from "@/lib/generer-voyage";
import { ErreurIA, messageErreurIA } from "@/lib/ia";
import { NOMBRE_REESSAIS } from "@/lib/qstash";
import { creerClientAdmin } from "@/lib/supabase/admin";
import {
  ajouterJours,
  type DemandeVoyage,
  type ItineraireGenere,
} from "@/lib/voyage";

export const maxDuration = 60;

type ClientAdmin = ReturnType<typeof creerClientAdmin>;

type VoyageATraiter = DemandeVoyage & {
  id: string;
  user_id: string;
  status: string;
};

function estReessayable(erreur: unknown): boolean {
  if (erreur instanceof ErreurIA) {
    return erreur.status === 429 || erreur.status >= 500;
  }
  // Délai dépassé, panne réseau ou erreur inattendue : une nouvelle tentative peut réussir
  return true;
}

// Effet secondaire : un échec d'envoi est journalisé, mais ne fait jamais échouer le traitement
async function notifier(
  supabase: ClientAdmin,
  voyage: VoyageATraiter,
  statut: "done" | "error",
  messageErreur?: string,
) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(
      voyage.user_id,
    );
    const destinataire = data.user?.email;

    if (error || !destinataire) {
      throw new Error("Adresse e-mail du voyageur introuvable.");
    }

    await envoyerNotification({
      destinataire,
      voyageId: voyage.id,
      destination: voyage.destination,
      statut,
      messageErreur,
    });
  } catch (erreur) {
    console.error("Échec de l'envoi de la notification :", erreur);
  }
}

async function enregistrerItineraire(
  supabase: ClientAdmin,
  voyage: VoyageATraiter,
  itineraire: ItineraireGenere,
) {
  // Idempotence : une tentative précédente a pu enregistrer une partie du résultat
  const suppressions = await Promise.all([
    supabase.from("trip_days").delete().eq("trip_id", voyage.id),
    supabase.from("packing_items").delete().eq("trip_id", voyage.id),
  ]);
  const erreurSuppression = suppressions.find((r) => r.error)?.error;
  if (erreurSuppression) {
    throw new Error(`Nettoyage impossible : ${erreurSuppression.message}`);
  }

  const { error: erreurJours } = await supabase.from("trip_days").insert(
    itineraire.days.map((jour) => ({
      trip_id: voyage.id,
      user_id: voyage.user_id,
      day_number: jour.day_number,
      date: ajouterJours(voyage.start_date, jour.day_number - 1),
      morning: jour.morning,
      afternoon: jour.afternoon,
      evening: jour.evening,
      estimated_budget: jour.estimated_budget,
    })),
  );
  if (erreurJours) {
    throw new Error(
      `Enregistrement des jours impossible : ${erreurJours.message}`,
    );
  }

  const { error: erreurBagages } = await supabase.from("packing_items").insert(
    itineraire.packing.map((objet) => ({
      trip_id: voyage.id,
      user_id: voyage.user_id,
      label: objet.label,
      category: objet.category,
    })),
  );
  if (erreurBagages) {
    throw new Error(
      `Enregistrement des bagages impossible : ${erreurBagages.message}`,
    );
  }

  // Passer le statut à « done » en dernier : la page détail se met à jour à ce moment-là
  const { error: erreurVoyage } = await supabase
    .from("trips")
    .update({
      summary: itineraire.summary,
      status: "done",
      error_message: null,
    })
    .eq("id", voyage.id);
  if (erreurVoyage) {
    throw new Error(
      `Mise à jour du voyage impossible : ${erreurVoyage.message}`,
    );
  }
}

async function traiter(request: Request) {
  const { tripId } = await request.json();
  const tentative = Number(request.headers.get("Upstash-Retried") ?? "0");

  // Le worker n'a pas d'utilisateur connecté : il utilise le client administrateur
  const supabase = creerClientAdmin();

  const { data: voyage } = await supabase
    .from("trips")
    .select(
      "id, user_id, destination, start_date, end_date, budget, travelers, preferences, status",
    )
    .eq("id", tripId)
    .maybeSingle<VoyageATraiter>();

  // Idempotence : un voyage absent ou déjà traité n'est pas généré une seconde fois
  if (!voyage || voyage.status !== "pending") {
    return Response.json({ resultat: "ignoré" });
  }

  try {
    const itineraire = await genererVoyage(voyage);
    await enregistrerItineraire(supabase, voyage, itineraire);
    await notifier(supabase, voyage, "done");

    return Response.json({ resultat: "prêt" });
  } catch (erreur) {
    console.error(
      `Échec de la génération (tentative ${tentative + 1}) :`,
      erreur,
    );

    // Erreur passagère et tentatives restantes : on demande à QStash de réessayer
    if (estReessayable(erreur) && tentative < NOMBRE_REESSAIS) {
      return Response.json({ resultat: "nouvelle tentative" }, { status: 500 });
    }

    // Erreur définitive ou dernière tentative : on enregistre l'échec et on prévient le voyageur
    const message = messageErreurIA(erreur);

    await supabase
      .from("trips")
      .update({ status: "error", error_message: message })
      .eq("id", voyage.id);

    await notifier(supabase, voyage, "error", message);

    return Response.json({ resultat: "erreur" });
  }
}

export const POST = verifySignatureAppRouter(traiter);
