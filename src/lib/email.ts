import "server-only";
import { Resend } from "resend";

const EXPEDITEUR = "Escapade <onboarding@resend.dev>";

// Une donnée saisie par l'utilisateur ne doit jamais pouvoir injecter de balises dans l'e-mail
function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Notification = {
  destinataire: string;
  voyageId: string;
  destination: string;
  statut: "done" | "error";
  messageErreur?: string;
};

export async function envoyerNotification(notification: Notification) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    throw new Error("La variable RESEND_API_KEY n'est pas définie.");
  }

  const resend = new Resend(cle);
  const lien = `${process.env.APP_URL}/voyages/${notification.voyageId}`;
  const destinationHtml = echapperHtml(notification.destination);
  const pret = notification.statut === "done";

  const sujet = pret
    ? `Ton itinéraire pour ${notification.destination} est prêt`
    : `La préparation de ton voyage pour ${notification.destination} a échoué`;

  const html = pret
    ? `<p>Bonjour,</p>
       <p>Ton itinéraire pour <strong>${destinationHtml}</strong> est prêt, avec ta liste de bagages.</p>
       <p><a href="${lien}">Voir mon itinéraire</a></p>`
    : `<p>Bonjour,</p>
       <p>La préparation de ton voyage pour <strong>${destinationHtml}</strong> a échoué :
       ${echapperHtml(notification.messageErreur ?? "erreur inconnue")}</p>
       <p>Tu peux réessayer depuis l'application.</p>`;

  const texte = pret
    ? `Ton itinéraire pour ${notification.destination} est prêt : ${lien}`
    : `La préparation de ton voyage pour ${notification.destination} a échoué. Tu peux réessayer depuis l'application.`;

  const { error } = await resend.emails.send({
    from: EXPEDITEUR,
    to: [notification.destinataire],
    subject: sujet,
    html,
    text: texte,
  });

  if (error) {
    throw new Error(`Envoi refusé par Resend : ${error.message}`);
  }
}
