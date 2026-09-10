// Lecture défensive des entrées utilisateur (formulaires et JSON).

/** Champ texte d'un FormData : chaîne épurée et bornée (sinon ""). */
export function formString(form: FormData, name: string, max = 5000): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Valeur JSON quelconque -> chaîne épurée et bornée (sinon ""). */
export function jsonString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
