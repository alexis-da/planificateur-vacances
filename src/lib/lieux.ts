import "server-only";

const ADRESSE_GEOAPIFY = "https://api.geoapify.com";

export type Lieu = {
  nom: string;
  type: "visite" | "restaurant";
  quartier: string | null;
};

type ProprietesLieu = {
  name?: string;
  district?: string;
  suburb?: string;
  city?: string;
};

async function appelerGeoapify(
  chemin: string,
  parametres: Record<string, string>,
) {
  const cle = process.env.GEOAPIFY_API_KEY;
  if (!cle) {
    throw new Error("La variable GEOAPIFY_API_KEY n'est pas définie.");
  }

  const url = new URL(chemin, ADRESSE_GEOAPIFY);
  for (const [nom, valeur] of Object.entries({ ...parametres, apiKey: cle })) {
    url.searchParams.set(nom, valeur);
  }

  const reponse = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!reponse.ok) {
    throw new Error(`Geoapify a répondu avec le statut ${reponse.status}`);
  }

  return reponse.json();
}

export async function localiser(destination: string) {
  const donnees = await appelerGeoapify("/v1/geocode/search", {
    text: destination,
    limit: "1",
    lang: "fr",
    format: "json",
  });

  const resultat = donnees.results?.[0];
  if (!resultat?.place_id) return null;

  return {
    placeId: String(resultat.place_id),
    nom: String(resultat.formatted),
  };
}

async function chercher(
  placeId: string,
  categories: string,
  limite: number,
  type: Lieu["type"],
): Promise<Lieu[]> {
  const donnees = await appelerGeoapify("/v2/places", {
    categories,
    filter: `place:${placeId}`,
    limit: String(limite),
    lang: "fr",
  });

  const lieux: Lieu[] = [];
  const dejaVus = new Set<string>();

  for (const element of donnees.features ?? []) {
    const proprietes: ProprietesLieu = element.properties ?? {};
    const nom = proprietes.name?.trim();

    // Lieux sans nom, aux noms anormalement longs ou en double : inutilisables
    if (!nom || nom.length > 80 || dejaVus.has(nom.toLowerCase())) continue;
    dejaVus.add(nom.toLowerCase());

    lieux.push({
      nom,
      type,
      quartier:
        proprietes.district ?? proprietes.suburb ?? proprietes.city ?? null,
    });
  }

  return lieux;
}

// Restaurants et sites réels de la destination, issus d'OpenStreetMap
export async function rechercherLieux(destination: string): Promise<Lieu[]> {
  const lieu = await localiser(destination);
  if (!lieu) return [];

  const [visites, restaurants] = await Promise.all([
    chercher(
      lieu.placeId,
      "tourism.sights,tourism.attraction,entertainment.museum,leisure.park",
      40,
      "visite",
    ),
    chercher(lieu.placeId, "catering.restaurant", 30, "restaurant"),
  ]);

  return [...visites, ...restaurants];
}
