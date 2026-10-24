// Teintes douces pour la vignette d'un voyage, choisies de façon stable d'après la destination
const TEINTES = [
  "bg-[#f6e7dc] text-[#8a4b2a]",
  "bg-[#e3eef0] text-[#2f5d66]",
  "bg-[#ece7f3] text-[#5a4680]",
  "bg-[#e8efe3] text-[#4a6a37]",
  "bg-[#f4e6e8] text-[#8c3a4a]",
  "bg-[#f3eedc] text-[#7a6420]",
];

export function teinte(destination: string): string {
  const somme = [...destination].reduce((total, lettre) => total + lettre.charCodeAt(0), 0);
  return TEINTES[somme % TEINTES.length];
}
