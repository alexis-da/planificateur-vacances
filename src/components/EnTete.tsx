import Link from "next/link";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { estAdministrateur } from "@/lib/admin";
import { creerClientServeur } from "@/lib/supabase/server";

const lienNavigation =
  "rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

export default async function EnTete() {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-teal-500 to-sky-500 text-base text-white"
          >
            ✈
          </span>
          <span className="text-base tracking-tight">Escapade</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/" className={lienNavigation}>
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
          <span className="ml-2 hidden text-slate-400 md:inline">
            {user.email}
          </span>
          <BoutonDeconnexion />
        </nav>
      </div>
    </header>
  );
}
