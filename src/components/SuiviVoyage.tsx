"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { creerClientNavigateur } from "@/lib/supabase/client";

// S'abonne aux changements du voyage et recharge la page dès qu'il n'est plus en préparation
export default function SuiviVoyage({ id }: { id: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const supabase = creerClientNavigateur();
    let canal: ReturnType<typeof supabase.channel> | undefined;
    let actif = true;

    async function abonner() {
      // L'abonnement doit être fait au nom de l'utilisateur,
      // pour que la Row Level Security autorise la réception des événements
      await supabase.auth.getSession();
      if (!actif) return;

      canal = supabase
        .channel(`voyage-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "trips",
            filter: `id=eq.${id}`,
          },
          (evenement) => {
            if ((evenement.new as { status?: string }).status !== "pending") {
              router.refresh();
            }
          },
        )
        .subscribe((statut) => {
          // La génération a pu se terminer avant l'abonnement : on relit une fois la page
          if (statut === "SUBSCRIBED") router.refresh();

          if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
            setErreur(
              "La mise à jour automatique est indisponible. Rechargez la page dans quelques instants.",
            );
          }
        });
    }

    abonner();

    return () => {
      actif = false;
      if (canal) supabase.removeChannel(canal);
    };
  }, [id, router]);

  return (
    <section className="mt-10 flex flex-col items-center rounded-2xl border px-6 py-14 text-center">
      <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
      <h2 className="mt-5 text-xl font-semibold">Votre itinéraire est en préparation</h2>
      <p className="mt-2 max-w-md text-muted-foreground">
        Nous cherchons de vrais lieux, composons vos journées et estimons votre budget.
        Cette page se mettra à jour toute seule, et un e-mail vous préviendra.
      </p>
      {erreur && (
        <Alert className="mt-6 max-w-md border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-900">
          <TriangleAlert aria-hidden />
          <AlertDescription className="text-amber-800">{erreur}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
