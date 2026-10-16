import "server-only";
import type { Controle } from "@/lib/statut";
import { redis } from "@/lib/limitation";
import { qstash } from "@/lib/qstash";
import { creerClientAdmin } from "@/lib/supabase/admin";

const controleVercel: Controle = {
  service: "Vercel",
  description: "Hébergement et fonctions serverless",
  verifier: async () => {
    const environnement = process.env.VERCEL_ENV ?? "local";
    const region = process.env.VERCEL_REGION ?? "poste du développeur";
    const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "aucun";
    return `Environnement : ${environnement} · Région : ${region} · Commit : ${commit}`;
  },
};

const controleIA: Controle = {
  service: "Modèle d'IA",
  description: "Génération des itinéraires (API compatible OpenAI)",
  verifier: async () => {
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!baseUrl || !apiKey || !model) {
      throw new Error(
        "Variables AI_BASE_URL, AI_API_KEY ou AI_MODEL manquantes",
      );
    }

    const reponse = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!reponse.ok) {
      throw new Error(`L'API a répondu avec le statut ${reponse.status}`);
    }

    const donnees = await reponse.json();
    const modeleDisponible = donnees.data?.some(
      (m: { id: string }) => m.id === model,
    );

    if (!modeleDisponible) {
      throw new Error(
        `Le modèle ${model} n'est pas disponible chez ce fournisseur`,
      );
    }

    return `Modèle ${model} disponible sur ${new URL(baseUrl).host}`;
  },
};

const controleBase: Controle = {
  service: "Supabase Database",
  description: "Voyages, jours et bagages",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const compter = (statut?: string) => {
      const requete = supabase
        .from("trips")
        .select("id", { count: "exact", head: true });
      return statut ? requete.eq("status", statut) : requete;
    };

    const resultats = await Promise.all([
      compter(),
      compter("pending"),
      compter("error"),
    ]);
    const erreur = resultats.find((r) => r.error)?.error;
    if (erreur) {
      throw new Error(erreur.message);
    }

    const [total, enAttente, enEchec] = resultats.map((r) => r.count ?? 0);
    return `${total} voyage(s) · ${enAttente} en préparation · ${enEchec} en échec`;
  },
};

const controleAuth: Controle = {
  service: "Supabase Auth",
  description: "Connexion par lien magique",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const { error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      throw new Error(error.message);
    }

    return "Service d'authentification joignable";
  },
};

const controleRealtime: Controle = {
  service: "Supabase Realtime",
  description: "Mise à jour de la page détail sans rechargement",
  verifier: async () => {
    const supabase = creerClientAdmin();
    const canal = supabase.channel(`controle-${Date.now()}`);

    try {
      await new Promise<void>((resolve, reject) => {
        canal.subscribe((statut, erreur) => {
          if (statut === "SUBSCRIBED") resolve();
          if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
            reject(erreur ?? new Error(`Connexion impossible (${statut})`));
          }
        });
      });

      return "Connexion WebSocket établie";
    } finally {
      await supabase.removeChannel(canal);
      supabase.realtime.disconnect();
    }
  },
};

const controleRedis: Controle = {
  service: "Upstash Redis",
  description: "Limitation du nombre de générations",
  verifier: async () => {
    const reponse = await redis.ping();

    if (reponse !== "PONG") {
      throw new Error(`Réponse inattendue : ${reponse}`);
    }

    const nombreCles = await redis.dbsize();
    return `Base joignable · ${nombreCles} clé(s) en mémoire`;
  },
};

const controleQStash: Controle = {
  service: "Upstash QStash",
  description: "File de messages des générations",
  verifier: async () => {
    if (!process.env.QSTASH_URL || !process.env.QSTASH_TOKEN) {
      throw new Error("Variables QSTASH_URL ou QSTASH_TOKEN manquantes");
    }

    if (!process.env.APP_URL) {
      throw new Error(
        "Variable APP_URL manquante : QStash ne saurait pas où livrer les messages",
      );
    }

    if (
      !process.env.QSTASH_CURRENT_SIGNING_KEY ||
      !process.env.QSTASH_NEXT_SIGNING_KEY
    ) {
      throw new Error(
        "Clés de signature manquantes : le worker refuserait tous les messages",
      );
    }

    await qstash.schedules.list();

    return `Service joignable · Destination : ${process.env.APP_URL}`;
  },
};

const controleEmail: Controle = {
  service: "Resend",
  description: "E-mail « itinéraire prêt »",
  verifier: async () => {
    const cle = process.env.RESEND_API_KEY;
    if (!cle) {
      throw new Error("Variable RESEND_API_KEY manquante");
    }

    const reponse = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${cle}` },
      cache: "no-store",
    });

    if (reponse.ok) {
      return "Clé valide (accès complet : préférez une clé limitée à l'envoi)";
    }

    const corps = await reponse.json().catch(() => ({}));

    // Une clé limitée à l'envoi est reconnue par Resend, mais refusée sur cette route :
    // c'est la preuve qu'elle est valide, avec le minimum de droits
    if (corps.name === "restricted_api_key") {
      return "Clé valide, limitée à l'envoi d'e-mails";
    }

    throw new Error(
      corps.message ?? `L'API a répondu avec le statut ${reponse.status}`,
    );
  },
};

const VARIABLES_REQUISES = [
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ADMIN_EMAILS",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "APP_URL",
  "QSTASH_URL",
  "QSTASH_TOKEN",
  "QSTASH_CURRENT_SIGNING_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
  "RESEND_API_KEY",
];

const controleSecrets: Controle = {
  service: "Infisical",
  description: "Gestion centralisée des secrets",
  verifier: async () => {
    const manquantes = VARIABLES_REQUISES.filter((nom) => !process.env[nom]);

    if (manquantes.length > 0) {
      throw new Error(`Variables manquantes : ${manquantes.join(", ")}`);
    }

    const reponse = await fetch("https://eu.infisical.com/api/status", {
      cache: "no-store",
    });
    if (!reponse.ok) {
      throw new Error(`Le service a répondu avec le statut ${reponse.status}`);
    }

    return `Service joignable · ${VARIABLES_REQUISES.length} variables configurées`;
  },
};

export const CONTROLES: Controle[] = [
  controleVercel,
  controleIA,
  controleBase,
  controleAuth,
  controleRealtime,
  controleRedis,
  controleQStash,
  controleEmail,
  controleSecrets,
];
