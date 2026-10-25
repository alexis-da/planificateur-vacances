# Escapade

## Présentation

Escapade est un planificateur de vacances. Un utilisateur connecté saisit sa ville de départ, une destination, ses dates, un budget, le nombre de voyageurs et ses envies. Un modèle d'IA génère un itinéraire jour par jour (matin, après-midi, soir) qui cite des lieux et des restaurants réels de la destination, une estimation du budget complet (transport aller-retour, hébergement, dépenses sur place) et une liste de bagages à cocher. Chaque voyage est enregistré, rattaché à son auteur et consultable dans « Mes voyages ».

Fonctionnalités :

- connexion par e-mail et mot de passe, avec création de compte libre ;
- création d'un voyage avec validation des données (dates cohérentes, 14 jours maximum, budget et voyageurs bornés) ;
- génération asynchrone : la demande est acceptée immédiatement, l'itinéraire est produit en arrière-plan ;
- itinéraire fondé sur des lieux réels : restaurants et sites de la destination récupérés dans OpenStreetMap, puis transmis au modèle ;
- budget estimé : transport aller-retour depuis la ville de départ, hébergement pour toutes les nuits, dépenses par jour, avec une alerte si le total dépasse le budget saisi ;
- page détail mise à jour en temps réel, sans rechargement, quand l'itinéraire est prêt ;
- e-mail « Ton itinéraire pour <destination> est prêt » avec un lien vers le voyage ;
- liste de bagages cochable, l'état est enregistré ;
- limitation à 5 générations par heure et par utilisateur ;
- page /admin réservée aux administrateurs, qui contrôle tous les services.

## Adresse de production

[https://planificateur-vacances-ten.vercel.app](https://planificateur-vacances-ten.vercel.app)

## Architecture (services, briques et pourquoi)

```
Navigateur ──► Next.js sur Vercel ──► Supabase (Auth + Postgres + RLS)
                   │      ▲                 │
                   │      │ worker          │ Realtime (WebSocket)
                   ▼      │                 ▼
               Upstash QStash          Navigateur (page détail)
                   │
                   └─► worker : Geoapify (lieux réels) ─► Modèle d'IA (Groq) ─► Resend (e-mail)

Upstash Redis : quota par utilisateur, vérifié avant la mise en file
Infisical : secrets synchronisés vers Vercel et injectés en local
```

| Service                | Rôle                                                                                                                 | Pourquoi                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**             | Hébergement Next.js, routes API serverless, déploiement continu depuis GitHub (`main` → production, `dev` → preview) | Intégration native avec Next.js, palier gratuit, environnements séparés                                                      |
| **Supabase**           | Authentification par e-mail et mot de passe, base Postgres, Row Level Security, Realtime                             | Auth, base et temps réel dans un seul service ; la RLS garantit l'isolement des données au niveau de la base                 |
| **Modèle d'IA (Groq)** | Génération de l'itinéraire et du budget, appelé uniquement côté serveur                                              | API compatible OpenAI, réponse JSON structurée, palier gratuit                                                               |
| **Geoapify**           | Restaurants et sites réels de la destination (données OpenStreetMap), transmis au modèle avant la génération         | Évite les noms inventés par l'IA ; palier gratuit sans carte bancaire. En cas de panne, la génération continue sans liste    |
| **Upstash Redis**      | Limitation de débit des appels au modèle (fenêtre glissante, par utilisateur)                                        | Compatible serverless (HTTP), palier gratuit                                                                                 |
| **Upstash QStash**     | File de messages entre la création et le worker de génération                                                        | Découple la requête de l'utilisateur d'un traitement long ; nouvelles tentatives automatiques                                |
| **Resend**             | E-mail « itinéraire prêt » ; serveur SMTP de Supabase Auth                                                           | API simple, palier gratuit, contourne la limite de 2 e-mails/heure de Supabase                                               |
| **Infisical**          | Source unique des secrets, synchronisée vers Vercel (Preview et Production) et injectée en local                     | Aucun secret dans le dépôt ni recopié à la main ; Staging et Production importent Development et ne redéfinissent que l'utile |

**Authentification.** Le TD utilisait le lien magique. Sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte, donc personne d'autre ne pourrait se connecter. L'application utilise donc la connexion par e-mail et mot de passe de Supabase Auth (8 caractères minimum), sans confirmation par e-mail. N'importe qui peut créer un compte et tester l'application. Les données restent isolées par la Row Level Security.

**Brique 1 : QStash (génération asynchrone).** `POST /api/trips` valide la demande, vérifie le quota, enregistre le voyage avec le statut `pending`, publie un message QStash puis répond **202** immédiatement. QStash appelle le worker `/api/jobs/generer-voyage`, qui vérifie la signature du message (`verifySignatureAppRouter`), récupère les lieux réels de la destination (Geoapify), appelle le modèle, valide la réponse, enregistre les jours, les bagages et le budget, puis passe le voyage à `done`. Le worker est idempotent : un voyage déjà traité est ignoré, et une tentative partielle est nettoyée. En cas d'erreur passagère (quota du modèle, panne, délai dépassé), il répond 500 et QStash réessaie (3 fois). Après la dernière tentative, le voyage passe à `error` avec un message clair. Sur les déploiements Preview protégés de Vercel, le message porte l'en-tête `x-vercel-protection-bypass` (secret fourni par Vercel) pour atteindre le worker.

**Brique 2 : Realtime.** La page détail d'un voyage `pending` s'abonne aux mises à jour de sa ligne dans `trips` (`postgres_changes`, filtrées par `id`, soumises à la RLS). Dès que le statut change, la page est rechargée côté serveur et affiche l'itinéraire sans action de l'utilisateur. Une relecture est faite à l'abonnement, au cas où la génération se serait terminée avant.

**Brique 3 : Resend.** À la fin du traitement, le worker envoie l'e-mail « Ton itinéraire pour <destination> est prêt » avec le lien vers le voyage, ou un e-mail d'échec. Les données saisies sont échappées dans le HTML. Un échec d'envoi est journalisé mais ne fait jamais échouer le traitement.

**Page /admin.** Réservée aux adresses listées dans `ADMIN_EMAILS` (sinon 404). Elle contrôle chaque service avec un délai maximal de 5 s : Vercel, modèle d'IA, Supabase Database (nombre de voyages, en préparation, en échec), Auth et Realtime, Upstash Redis et QStash, Resend, Geoapify, Infisical (variables manquantes).

**Interface.** Design clair et sobre, inspiré des sites de réservation de voyage : fond blanc, texte anthracite, une seule couleur d'accent (corail), typographie DM Sans, champs « à étiquette intégrée » comme sur les moteurs de recherche de séjours, et un récapitulatif du budget présenté comme un détail de prix. Les éléments d'interface viennent de [shadcn/ui](https://ui.shadcn.com) (boutons, cartes, champs, badges, cases à cocher, barre de progression, alertes), des composants open source copiés dans `src/components/ui/`, et les pictogrammes de [Lucide](https://lucide.dev). L'interface est responsive et n'utilise aucun emoji.

**Porte de qualité.** `npm run build` exécute `eslint`, puis `next typegen && tsc --noEmit`, puis `next build`. Vercel refuse donc tout déploiement qui contient une erreur de lint ou de type.

**Gestion des erreurs.** Données invalides, quota atteint, panne ou saturation du modèle, réponse mal formée, échec de la file : chaque cas renvoie un message clair. Une panne de Geoapify ou de Resend n'interrompt jamais la génération. Les pages `error.tsx` et `not-found.tsx` évitent toute page blanche.

## Modèle d'IA (fournisseur, modèle, justification)

- **Fournisseur** : Groq (API compatible OpenAI, `AI_BASE_URL=https://api.groq.com/openai/v1`)
- **Modèle** : `openai/gpt-oss-120b`, avec `reasoning_effort: "low"` et `temperature: 0.5`
- **Justification** : modèle ouvert, rapide sur l'infrastructure Groq, avec la prise en charge des sorties JSON strictes (`response_format: json_schema`) et un palier gratuit suffisant pour le projet. La version 20b a été testée d'abord : ses suggestions restaient génériques, quelle que soit la ville. La version 120b connaît bien mieux les destinations. La réflexion réduite (`reasoning_effort: "low"`) laisse assez de jetons pour la réponse des voyages longs (jusqu'à 14 jours). Le fournisseur et le modèle se changent par variables d'environnement, sans modifier le code.
- **Consigne** : le modèle reçoit une liste de lieux réels (Geoapify / OpenStreetMap) et ne peut citer que des restaurants de cette liste. Chaque moment de la journée nomme un lieu propre à la destination, et les lieux sont regroupés par quartier. Aucun prix exact, horaire, adresse ni hôtel n'est inventé. Le transport aller-retour depuis la ville de départ, l'hébergement et les dépenses par jour sont estimés en ordres de grandeur, et le modèle signale un budget insuffisant plutôt que de sous-estimer. Les envies de l'utilisateur sont suivies quand elles concernent le voyage, mais toute tentative de modifier les règles, le rôle ou le format est ignorée (protection contre l'injection de consignes).
- **Validation** : la réponse est soumise à un schéma JSON strict, puis vérifiée côté serveur avant l'insertion (nombre de jours exact, numérotation, textes non vides, montants entiers positifs, catégories de bagages autorisées). En cas de format invalide, une seconde tentative est faite.

## Structure de données (tables, relations, règles de sécurité)

Script versionné : [`supabase/schema.sql`](supabase/schema.sql).

| Table           | Colonnes principales                                                                                                                                                                                                                       | Relations                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `trips`         | `id`, `user_id`, `origin`, `destination`, `start_date`, `end_date`, `budget`, `travelers`, `preferences`, `summary`, `transport_estimate`, `lodging_estimate`, `budget_advice`, `status` (`pending`/`done`/`error`), `error_message`, `created_at` | `user_id` → `auth.users`                                                  |
| `trip_days`     | `id`, `trip_id`, `user_id`, `day_number`, `date`, `morning`, `afternoon`, `evening`, `estimated_budget`                                                                                                                                    | `trip_id` → `trips` (on delete cascade), unique (`trip_id`, `day_number`) |
| `packing_items` | `id`, `trip_id`, `user_id`, `label`, `category`, `checked`                                                                                                                                                                                 | `trip_id` → `trips` (on delete cascade)                                   |

Contraintes en base : retour après le départ, 14 jours maximum, budget et voyageurs bornés, montants estimés positifs, longueurs maximales des textes.

Règles de sécurité (Row Level Security activée sur les 3 tables, condition `user_id = auth.uid()`) :

- `trips` : lecture et suppression de ses propres voyages ; création uniquement avec le statut `pending` et sans résultat (ni résumé, ni estimations, ni message d'erreur) ;
- `trip_days` : lecture seule, les jours sont écrits par le worker avec la clé secrète ;
- `packing_items` : lecture, et modification limitée à la colonne `checked` (droit de colonne `grant update (checked)`).

La clé secrète Supabase n'est utilisée que côté serveur, par le worker, le contrôle /admin et le marquage d'échec. La table `trips` est publiée dans `supabase_realtime`.

## Lancer le projet en local

Prérequis : Node.js 20+, un compte sur chaque service (paliers gratuits) et la [CLI Infisical](https://infisical.com/docs/cli/overview).

1. Cloner le dépôt et installer les dépendances :
   ```bash
   git clone https://github.com/alexis-da/planificateur-vacances.git
   cd planificateur-vacances
   npm install
   ```
2. Créer les tables : exécuter `supabase/schema.sql` dans le SQL Editor de Supabase.
3. Configurer les secrets : toutes les variables sont listées dans `.env.example`.
   - Avec Infisical : `infisical login`, puis `infisical init`.
   - Sans Infisical : copier `.env.example` vers `.env.local` et le remplir.
4. Lancer QStash en local (dans un terminal séparé), puis reporter ses valeurs dans `QSTASH_*` et mettre `APP_URL=http://localhost:3000` :
   ```bash
   npx @upstash/qstash-cli dev
   ```
5. Lancer l'application :
   ```bash
   infisical run --env=dev -- npm run dev
   ```
6. Avant chaque commit :
   ```bash
   rm -rf .next && npm run lint && npm run typecheck
   ```

## Limites et améliorations possibles

- **Prix réels** : le transport et l'hébergement sont estimés par l'IA. Les API de réservation (vols, hôtels) sont réservées aux partenaires ou payantes ; les brancher donnerait des prix et des disponibilités réels.
- **Popularité des lieux** : OpenStreetMap ne fournit ni notes ni avis. Les restaurants proposés existent, mais ils ne sont pas classés par qualité. Une source d'avis (TripAdvisor, Google Places) demanderait un compte de facturation.
- **Données en temps réel** : ni météo, ni horaires d'ouverture, ni événements.
- **E-mails** : sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte (`onboarding@resend.dev`). Les autres utilisateurs ne reçoivent donc pas l'e-mail « itinéraire prêt » (l'échec est journalisé sans bloquer la génération), et la confirmation d'adresse à l'inscription est désactivée. Vérifier un domaine lèverait ces deux limites.
- **Quotas gratuits** : le palier gratuit de Groq limite le nombre de jetons par minute pour `gpt-oss-120b`. Plusieurs longs voyages générés en même temps peuvent être ralentis (QStash réessaie alors automatiquement).
- **Édition** : impossible de régénérer une journée, de modifier une activité, d'ajouter un objet à la liste de bagages ou de supprimer un voyage depuis l'interface (la règle RLS de suppression est déjà en place).
- **Atomicité** : l'enregistrement du résultat se fait en plusieurs requêtes (rendues sûres par l'idempotence du worker). Une fonction Postgres transactionnelle (RPC) serait plus robuste.
- **Observabilité** : pas de suivi des erreurs ni de traces des appels au modèle (Sentry et Langfuse étaient possibles, mais écartés pour limiter le nombre de services).
- **Tests** : pas de tests automatisés (validation des demandes et du format de réponse du modèle à couvrir en priorité).
- **Confidentialité** : la demande (envies comprises) est transmise au fournisseur d'IA, et la destination à Geoapify ; ce point doit être annoncé aux utilisateurs.
