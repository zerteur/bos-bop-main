// Limiteur de fréquence en mémoire (best-effort, réinitialisé à chaque
// redémarrage du serveur) : suffisant pour absorber les envois en rafale
// d'un même visiteur ou robot sans dépendre d'une infrastructure externe
// (Redis, etc.) qui serait disproportionnée pour le volume de ce site.
const hits = new Map<string, number[]>();

/** true si `key` a dépassé `max` occurrences sur la fenêtre `windowMs`. */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

/** Meilleure estimation de l'adresse IP du client derrière un reverse proxy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "inconnu";
}
