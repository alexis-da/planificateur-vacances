# Escapade

## Présentation

Escapade est un planificateur de vacances. Un utilisateur connecté par lien magique saisit une destination, ses dates, un budget, le nombre de voyageurs et ses envies. Un modèle d'IA génère un itinéraire jour par jour (matin, après-midi, soir et budget estimé) et une liste de bagages à cocher. Chaque voyage est enregistré, rattaché à son auteur et consultable dans « Mes voyages ».

Fonctionnalités :

- connexion sans mot de passe (lien magique) ;
- création d'un voyage avec validation des données (dates cohérentes, 14 jours maximum, budget et voyageurs bornés) ;
- génération asynchrone : la demande est acceptée immédiatement, l'itinéraire est produit en arrière-plan ;
- page détail mise à jour en temps réel, sans rechargement, quand l'itinéraire est prêt ;
- e-mail « Ton itinéraire pour <destination> est prêt » avec un lien vers le voyage ;
- liste de bagages cochable, l'état est enregistré ;
- limitation à 5 générations par heure et par utilisateur ;
- page /admin réservée aux administrateurs, qui contrôle tous les services.

## Adresse de production

<https://adresse-prod.vercel.app>

## Architecture (services, briques et pourquoi)

```
Navigateur ──► Next.js sur Vercel ──► Supabase (Auth + Postgres + RLS)
                   │      ▲                 │
                   │      │ worker          │ Realtime (WebSocket)
                   ▼      │                 ▼
               Upstash QStash          Navigateur (page détail)
                   │
     Upstash Redis (quota)   Modèle d'IA (Groq)   Resend (e-mail)
```

| Service                | Rôle                                                                                                                 | Pourquoi                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Vercel**             | Hébergement Next.js, routes API serverless, déploiement continu depuis GitHub (`main` → production, `dev` → preview) | Intégration native avec Next.js, palier gratuit, environnements séparés                                      |
| **Supabase**           | Authentification par lien magique, base Postgres, Row Level Security, Realtime                                       | Auth, base et temps réel dans un seul service ; la RLS garantit l'isolement des données au niveau de la base |
| **Modèle d'IA (Groq)** | Génération de l'itinéraire, appelé uniquement côté serveur                                                           | API compatible OpenAI, réponse JSON structurée, palier gratuit                                               |
| **Upstash Redis**      | Limitation de débit des appels au modèle (fenêtre glissante, par utilisateur)                                        | Compatible serverless (HTTP), palier gratuit                                                                 |
| **Upstash QStash**     | File de messages entre la création et le worker de génération                                                        | Découple la requête de l'utilisateur d'un traitement long ; nouvelles tentatives automatiques                |
| **Resend**             | E-mail « itinéraire prêt » et e-mails de connexion (SMTP de Supabase)                                                | API simple, palier gratuit, contourne la limite de 2 e-mails/heure de Supabase                               |
| **Infisical**          | Source unique des secrets, synchronisée vers Vercel (Preview et Production) et injectée en local                     | Aucun secret dans le dépôt ni recopié à la main                                                              |

**Brique 1 : QStash (génération asynchrone).** `POST /api/trips` valide la demande, vérifie le quota, enregistre le voyage avec le statut `pending`, publie un message QStash puis répond **202** immédiatement. QStash appelle le worker `/api/jobs/generer-voyage`, qui vérifie la signature du message (`verifySignatureAppRouter`), appelle le modèle, valide la réponse puis enregistre les jours et les bagages et passe le voyage à `done`. Le worker est idempotent : un voyage déjà traité est ignoré, et une tentative partielle est nettoyée. En cas d'erreur passagère (quota du modèle, panne, délai dépassé), il répond 500 et QStash réessaie (3 fois). Après la dernière tentative, le voyage passe à `error` avec un message clair.

**Brique 2 : Realtime.** La page détail d'un voyage `pending` s'abonne aux mises à jour de sa ligne dans `trips` (`postgres_changes`, filtrées par `id`, soumises à la RLS). Dès que le statut change, la page est rechargée côté serveur et affiche l'itinéraire sans action de l'utilisateur. Une relecture est faite à l'abonnement, au cas où la génération se serait terminée avant.

**Brique 3 : Resend.** À la fin du traitement, le worker envoie l'e-mail « Ton itinéraire pour <destination> est prêt » avec le lien vers le voyage, ou un e-mail d'échec. Les données saisies sont échappées dans le HTML. Un échec d'envoi est journalisé mais ne fait jamais échouer le traitement.

**Page /admin.** Réservée aux adresses listées dans `ADMIN_EMAILS` (sinon 404). Elle contrôle chaque service avec un délai maximal de 5 s : Vercel, modèle d'IA, Supabase Database, Auth et Realtime, Upstash Redis et QStash, Resend, Infisical (variables manquantes).

**Porte de qualité.** `npm run build` exécute `eslint`, puis `next typegen && tsc --noEmit`, puis `next build`. Vercel refuse donc tout déploiement qui contient une erreur de lint ou de type.

**Gestion des erreurs.** Données invalides, quota atteint, panne ou saturation du modèle, réponse mal formée, échec de la file : chaque cas renvoie un message clair. Les pages `error.tsx` et `not-found.tsx` évitent toute page blanche.

## Modèle d'IA (fournisseur, modèle, justification)

- **Fournisseur** : Groq (API compatible OpenAI, `AI_BASE_URL=https://api.groq.com/openai/v1`)
- **Modèle** : `openai/gpt-oss-20b`
- **Justification** : modèle ouvert, rapide sur l'infrastructure Groq (un itinéraire de 14 jours est généré en quelques secondes, bien en deçà de la durée maximale d'une fonction Vercel), avec la prise en charge des sorties JSON strictes (`response_format: json_schema`) et un palier gratuit suffisant pour le projet. Le fournisseur et le modèle se changent par variables d'environnement, sans modifier le code.
- **Consigne** : suggestions d'activités réalistes, sans prix, horaires, adresses ni établissements inventés. Le budget par jour est une estimation indicative, et les envies de l'utilisateur sont traitées comme des données (protection contre l'injection de consignes).
- **Validation** : la réponse est soumise à un schéma JSON strict, puis vérifiée côté serveur avant l'insertion (nombre de jours exact, numérotation, textes non vides, catégories autorisées). En cas de format invalide, une seconde tentative est faite.

## Structure de données (tables, relations, règles de sécurité)

Script versionné : [`supabase/schema.sql`](supabase/schema.sql).

| Table           | Colonnes principales                                                                                                                                                          | Relations                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `trips`         | `id`, `user_id`, `destination`, `start_date`, `end_date`, `budget`, `travelers`, `preferences`, `summary`, `status` (`pending`/`done`/`error`), `error_message`, `created_at` | `user_id` → `auth.users`                                                  |
| `trip_days`     | `id`, `trip_id`, `user_id`, `day_number`, `date`, `morning`, `afternoon`, `evening`, `estimated_budget`                                                                       | `trip_id` → `trips` (on delete cascade), unique (`trip_id`, `day_number`) |
| `packing_items` | `id`, `trip_id`, `user_id`, `label`, `category`, `checked`                                                                                                                    | `trip_id` → `trips` (on delete cascade)                                   |

Contraintes en base : retour après le départ, 14 jours maximum, budget et voyageurs bornés, longueurs maximales des textes.

Règles de sécurité (Row Level Security activée sur les 3 tables, condition `user_id = auth.uid()`) :

- `trips` : lecture, création (statut `pending` uniquement, sans résultat) et suppression de ses propres voyages ;
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

- **E-mails** : sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte (`onboarding@resend.dev`). Vérifier un domaine permettrait d'ouvrir l'application à tous.
- **Itinéraire** : il repose sur les connaissances du modèle, sans données en temps réel (météo, horaires, prix, disponibilités). L'intégrer à des API spécialisées le fiabiliserait.
- **Édition** : impossible de régénérer une journée, de modifier une activité ou d'ajouter un objet à la liste de bagages.
- **Atomicité** : l'enregistrement du résultat se fait en plusieurs requêtes (rendues sûres par l'idempotence du worker). Une fonction Postgres transactionnelle (RPC) serait plus robuste.
- **Observabilité** : pas de suivi des erreurs ni de traces des appels au modèle (Sentry et Langfuse étaient possibles, mais écartés pour limiter le nombre de services).
- **Tests** : pas de tests automatisés (validation des demandes et du format de réponse du modèle à couvrir en priorité).
- **Confidentialité** : les envies de l'utilisateur sont transmises au fournisseur d'IA ; ce point doit être annoncé aux utilisateurs.
