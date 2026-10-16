import { creerClientServeur } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { erreur: "Authentification requise." },
      { status: 401 },
    );
  }

  const corps = await request.json().catch(() => null);
  if (typeof corps?.checked !== "boolean") {
    return Response.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  // La Row Level Security limite la modification aux objets de l'utilisateur
  const { data, error } = await supabase
    .from("packing_items")
    .update({ checked: corps.checked })
    .eq("id", id)
    .select("id, checked")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ erreur: "Objet introuvable." }, { status: 404 });
  }

  return Response.json(data);
}
