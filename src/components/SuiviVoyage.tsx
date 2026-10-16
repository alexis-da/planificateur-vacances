"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { alerteAttention, carte } from "@/lib/ui";

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
    <section
      className={`${carte} mt-6 flex flex-col items-center p-10 text-center`}
    >
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600"
      />
      <h2 className="mt-4 text-xl font-semibold">Itinéraire en préparation…</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        L&apos;IA compose vos journées et votre liste de bagages. Cette page se
        mettra à jour automatiquement, et un e-mail vous préviendra.
      </p>
      {erreur && <p className={`mt-4 ${alerteAttention}`}>{erreur}</p>}
    </section>
  );
}
