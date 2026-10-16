"use client";

import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function BoutonDeconnexion() {
  const router = useRouter();

  async function deconnecter() {
    await creerClientNavigateur().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <button
      onClick={deconnecter}
      className="ml-1 rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-700"
    >
      Se déconnecter
    </button>
  );
}
