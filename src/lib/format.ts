export function formaterDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", {
    ...options,
    timeZone: "UTC",
  });
}

export function formaterEuros(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(montant);
}
