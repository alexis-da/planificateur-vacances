"use client";

import Link from "next/link";
import { useEffect } from "react";
import { boutonPrincipal, boutonSecondaire, carte } from "@/lib/ui";

export default function Erreur({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className={`${carte} p-8 text-center`}>
        <p className="text-4xl" aria-hidden>
          😕
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-slate-600">
          La page n&apos;a pas pu s&apos;afficher. Réessayez dans quelques
          instants.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => retry()} className={boutonPrincipal}>
            Réessayer
          </button>
          <Link href="/" className={boutonSecondaire}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
