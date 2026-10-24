"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { creerClientNavigateur } from "@/lib/supabase/client";

export default function BoutonDeconnexion() {
  const router = useRouter();

  async function deconnecter() {
    await creerClientNavigateur().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      onClick={deconnecter}
      className="h-8 rounded-full px-3"
      aria-label="Se déconnecter"
    >
      <LogOut aria-hidden />
      <span className="hidden sm:inline">Déconnexion</span>
    </Button>
  );
}
