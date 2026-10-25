"use client";

import { useState } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { boutonLarge, champ } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Mode = "connexion" | "inscription";

const MOT_DE_PASSE_MIN = 8;

const ERREURS_PREVUES = [
  "invalid_credentials",
  "user_already_exists",
  "email_exists",
  "weak_password",
  "email_not_confirmed",
  "over_request_rate_limit",
  "over_email_send_rate_limit",
];

function messageErreur(code: string | undefined, mode: Mode): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse. Connectez-vous.";
    case "weak_password":
      return `Mot de passe trop faible : ${MOT_DE_PASSE_MIN} caractères minimum.`;
    case "email_not_confirmed":
      return "Cette adresse n'a pas encore été confirmée.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    default:
      return mode === "connexion"
        ? "La connexion a échoué. Réessayez dans quelques instants."
        : "La création du compte a échoué. Réessayez dans quelques instants.";
  }
}

export default function FormulaireConnexion({
  erreurLien,
}: {
  erreurLien: boolean;
}) {
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState(
    erreurLien ? "Ce lien de connexion est invalide ou a expiré." : "",
  );

  function changerMode(nouveau: Mode) {
    setMode(nouveau);
    setErreur("");
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (mode === "inscription" && motDePasse.length < MOT_DE_PASSE_MIN) {
      setErreur(
        `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`,
      );
      return;
    }

    setEnvoi(true);
    const supabase = creerClientNavigateur();

    const { data, error } =
      mode === "connexion"
        ? await supabase.auth.signInWithPassword({
            email,
            password: motDePasse,
          })
        : await supabase.auth.signUp({
            email,
            password: motDePasse,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

    if (error) {
      if (!ERREURS_PREVUES.includes(error.code ?? "")) console.error(error);
      setErreur(messageErreur(error.code, mode));
      setEnvoi(false);
      return;
    }

    // Inscription sans session : la confirmation par e-mail est activée dans Supabase
    if (!data.session) {
      setConfirmation(true);
      setEnvoi(false);
      return;
    }

    window.location.assign("/");
  }

  if (confirmation) {
    return (
      <Alert className="mt-6 border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
        <MailCheck aria-hidden />
        <AlertTitle>Compte créé</AlertTitle>
        <AlertDescription className="text-emerald-800">
          Confirmez votre adresse grâce au lien envoyé à{" "}
          <strong>{email}</strong>, puis connectez-vous.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist">
        {(["connexion", "inscription"] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={mode === valeur}
            onClick={() => changerMode(valeur)}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              mode === valeur
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {valeur === "connexion" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <form onSubmit={envoyer} className="mt-6 flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className={champ}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mot-de-passe">Mot de passe</Label>
          <Input
            id="mot-de-passe"
            type="password"
            required
            minLength={mode === "inscription" ? MOT_DE_PASSE_MIN : undefined}
            autoComplete={
              mode === "connexion" ? "current-password" : "new-password"
            }
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className={champ}
          />
          {mode === "inscription" && (
            <p className="text-sm text-muted-foreground">
              {MOT_DE_PASSE_MIN} caractères minimum.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={envoi || email === "" || motDePasse === ""}
          className={boutonLarge}
        >
          {envoi
            ? "Un instant…"
            : mode === "connexion"
              ? "Se connecter"
              : "Créer mon compte"}
        </Button>

        {erreur && (
          <Alert variant="destructive" className="px-4 py-3">
            <CircleAlert aria-hidden />
            <AlertDescription>{erreur}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}
