import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "bosbop_session";
const SESSION_DURATION_S = 60 * 60 * 24 * 7; // 7 jours

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // En développement uniquement : ne jamais déployer sans SESSION_SECRET
    return new TextEncoder().encode("bos-bop-secret-de-developpement");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: number; email: string; name: string };

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

/** Session administrateur courante (ou null). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** À appeler en tête de chaque action d'administration. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Authentification requise");
  return session;
}

/**
 * Détermine si la connexion courante est en HTTPS, pour savoir si le cookie
 * de session peut porter l'attribut `Secure`.
 *
 * NODE_ENV === "production" n'est PAS un bon indicateur : beaucoup de
 * déploiements (VPS sans certificat encore configuré, prévisualisation en
 * HTTP, etc.) tournent en "production" sans TLS. Un cookie marqué `Secure`
 * envoyé sur une connexion HTTP est silencieusement refusé par le
 * navigateur : l'utilisateur semble alors se déconnecter à chaque
 * navigation alors que la connexion a bien réussi côté serveur.
 *
 * On se base sur l'en-tête `x-forwarded-proto` (posé par tout reverse proxy
 * sérieux — Nginx, Vercel, Railway, Fly.io…) puis, à défaut, sur le
 * protocole de l'URL elle-même.
 */
async function isHttpsRequest(): Promise<boolean> {
  // Permet de forcer explicitement le comportement si l'auto-détection ne
  // convient pas au déploiement (ex : Next.js exposé directement en HTTPS
  // par un serveur personnalisé, sans reverse proxy).
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;

  const store = await headers();
  const forwardedProto = store.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return false;
}

export async function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: await isHttpsRequest(),
    path: "/",
    maxAge: SESSION_DURATION_S,
  };
}
