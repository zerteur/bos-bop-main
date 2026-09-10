// Aides HTTP partagées par les routes.

import { NextRequest } from "next/server";
import { headers as nextHeaders } from "next/headers";

/**
 * Redirection 303 « voir autre chose » vers un chemin RELATIF du site.
 *
 * Toujours préférer ceci à `Response.redirect(new URL(path, request.url))` :
 * derrière un reverse proxy (Nginx + pm2…), `request.url` reflète l'adresse
 * INTERNE du serveur Next.js (http://localhost:3000/…) et non le domaine
 * public — le visiteur se retrouvait alors redirigé vers localhost après un
 * ajout au panier ou l'envoi du formulaire de contact. Une Location relative
 * (autorisée par la RFC 7231, comprise par tous les navigateurs) reste sur
 * le domaine que le visiteur utilise déjà, quel que soit le proxy.
 */
export function seeOther(path: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: path, ...extraHeaders },
  });
}

/**
 * Origine publique (schéma + hôte) de la requête en cours, telle que vue par
 * le visiteur — jamais celle, interne, du serveur Next.js derrière le proxy.
 *
 * Nécessaire pour les URL ABSOLUES qu'on ne peut pas remplacer par un chemin
 * relatif (voir seeOther ci-dessus) : notamment `success_url`/`cancel_url` de
 * Stripe Checkout, que Stripe lui-même doit pouvoir suivre. Se fier à un
 * réglage enregistré ("Adresse publique du site") pour cela pose problème dès
 * que le site change de domaine (mise en préproduction, bascule finale du
 * DNS…) : le réglage devient obsolète et les clients sont renvoyés vers un
 * domaine mort après paiement. On dérive donc l'origine directement de la
 * requête, comme `isHttpsRequest()` dans auth.ts (même variable
 * COOKIE_SECURE pour forcer le protocole si l'auto-détection ne convient pas
 * au déploiement).
 */
function resolveOrigin(
  h: { get(name: string): string | null },
  fallbackHost: string,
  fallbackProto: string,
): string {
  const forwardedHost = h.get("x-forwarded-host");
  const host = (forwardedHost ?? h.get("host") ?? fallbackHost).split(",")[0].trim();

  let proto: string;
  if (process.env.COOKIE_SECURE === "1") {
    proto = "https";
  } else if (process.env.COOKIE_SECURE === "0") {
    proto = "http";
  } else {
    const forwardedProto = h.get("x-forwarded-proto");
    proto = forwardedProto ? forwardedProto.split(",")[0].trim() : fallbackProto;
  }

  return `${proto}://${host}`;
}

export function getPublicOrigin(request: NextRequest): string {
  return resolveOrigin(
    request.headers,
    request.nextUrl.host,
    request.nextUrl.protocol.replace(":", ""),
  );
}

/**
 * Même détection que `getPublicOrigin`, mais depuis un composant serveur
 * (pages d'administration) où seule l'API `headers()` de `next/headers` est
 * disponible, sans objet `NextRequest`. Repli sur HTTPS par défaut : ces
 * pages n'ont d'utilité qu'affichées (ex. l'adresse de webhook à recopier
 * dans Stripe), jamais pour construire une redirection réelle.
 */
export async function getPublicOriginFromHeaders(): Promise<string> {
  const store = await nextHeaders();
  return resolveOrigin(store, "localhost", "https");
}
