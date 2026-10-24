"use client";

import { useState } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { boutonLarge, champ } from "@/lib/ui";

export default function FormulaireConnexion({
  erreurLien,
}: {
  erreurLien: boolean;
}) {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(
    erreurLien
      ? "Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau."
      : "",
  );

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");

    const supabase = creerClientNavigateur();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setEnvoi(false);

    if (error) {
      console.error(error);
      setErreur(
        "L'envoi du lien a échoué. Patientez quelques minutes avant de réessayer.",
      );
      return;
    }

    setEnvoye(true);
  }

  if (envoye) {
    return (
      <Alert className="mt-6 border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
        <MailCheck aria-hidden />
        <AlertTitle>Vérifiez votre boîte de réception</AlertTitle>
        <AlertDescription className="text-emerald-800">
          Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>.
          Ouvrez-le dans ce même navigateur.
        </AlertDescription>
      </Alert>
    );
  }

  return (
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

      <Button type="submit" disabled={envoi || email === ""} className={boutonLarge}>
        {envoi ? "Envoi en cours…" : "Recevoir un lien de connexion"}
      </Button>

      {erreur && (
        <Alert variant="destructive" className="px-4 py-3">
          <CircleAlert aria-hidden />
          <AlertDescription>{erreur}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
