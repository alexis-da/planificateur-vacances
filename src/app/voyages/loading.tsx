import { Skeleton } from "@/components/ui/skeleton";
import { conteneur } from "@/lib/ui";

export default function Chargement() {
  return (
    <main className={`${conteneur} py-10 md:py-14`}>
      <Skeleton className="h-10 w-56" />
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
