"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { boutonLarge, conteneur } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
    <main className={`${conteneur} flex flex-col items-center py-24 text-center`}>
      <span className="grid size-14 place-items-center rounded-full bg-muted">
        <CircleAlert className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        La page n&apos;a pas pu s&apos;afficher. Réessayez dans quelques instants.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} className={boutonLarge}>
          Réessayer
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), boutonLarge)}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
