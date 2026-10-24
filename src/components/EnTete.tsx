import Link from "next/link";
import { Plane } from "lucide-react";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { estAdministrateur } from "@/lib/admin";
import { creerClientServeur } from "@/lib/supabase/server";
import { conteneur } from "@/lib/ui";

const lienNavigation =
  "rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export default async function EnTete() {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className={`${conteneur} flex h-18 items-center justify-between gap-4`}>
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Plane className="size-6 -rotate-45" aria-hidden />
          <span className="text-xl font-bold tracking-tight">escapade</span>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            <Link href="/" className={`${lienNavigation} hidden sm:inline-flex`}>
              Nouveau voyage
            </Link>
            <Link href="/voyages" className={lienNavigation}>
              Mes voyages
            </Link>
            {estAdministrateur(user.email) && (
              <Link href="/admin" className={lienNavigation}>
                Admin
              </Link>
            )}
            <div className="ml-2 flex items-center gap-3 rounded-full border py-1 pr-1 pl-4 shadow-xs">
              <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:inline">
                {user.email}
              </span>
              <BoutonDeconnexion />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
