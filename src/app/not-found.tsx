import Link from "next/link";
import { boutonPrincipal, carte } from "@/lib/ui";

export default function PageIntrouvable() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className={`${carte} p-8 text-center`}>
        <p className="text-4xl" aria-hidden>
          🧭
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ce voyage n&apos;existe pas ou ne vous appartient pas.
        </p>
        <Link href="/voyages" className={`mt-6 ${boutonPrincipal}`}>
          Voir mes voyages
        </Link>
      </div>
    </main>
  );
}
