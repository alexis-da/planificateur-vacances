import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { boutonLarge, conteneur } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function PageIntrouvable() {
  return (
    <main className={`${conteneur} flex flex-col items-center py-24 text-center`}>
      <span className="grid size-14 place-items-center rounded-full bg-muted">
        <Compass className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Ce voyage n&apos;existe pas ou ne vous appartient pas.
      </p>
      <Link href="/voyages" className={cn(buttonVariants(), boutonLarge, "mt-8")}>
        Voir mes voyages
      </Link>
    </main>
  );
}
