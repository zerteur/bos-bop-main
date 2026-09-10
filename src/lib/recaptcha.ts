// Intégration reCAPTCHA (v2 « Je ne suis pas un robot ») du formulaire de
// contact.
//
// Le formulaire d'origine embarquait un reCAPTCHA INVISIBLE dont la clé de site
// est verrouillée sur l'ancien domaine (www.bos-bop.fr) et dont le chargeur
// api.js n'était qu'une copie locale périmée : résultat, un badge cassé et une
// vérification qui n'aboutissait jamais. On retire donc entièrement ce widget
// d'origine (voir applyContactRecaptcha) et, si des clés sont configurées, on
// le remplace par une case reCAPTCHA v2 classique, chargée depuis le vrai
// service Google et vérifiée côté serveur (voir /api/contact).
//
// Les clés se règlent depuis l'administration (Réglages) ou par variables
// d'environnement (RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET_KEY, prioritaires).
// Sans clé configurée : pas de widget, l'anti-spam repose sur le champ piège
// (honeypot) et la limite de fréquence, sans dépendance à un service tiers.

import { getSetting } from "./settings";
import { escapeHtml } from "./shell.mjs";

export async function getRecaptchaSiteKey(): Promise<string> {
  return process.env.RECAPTCHA_SITE_KEY || (await getSetting("recaptchaSiteKey", ""));
}

export async function getRecaptchaSecretKey(): Promise<string> {
  return process.env.RECAPTCHA_SECRET_KEY || (await getSetting("recaptchaSecretKey", ""));
}

/** Widget affichable : il suffit d'une clé de site (publique). */
export async function isRecaptchaConfigured(): Promise<boolean> {
  return !!(await getRecaptchaSiteKey());
}

/** Vérification serveur possible : nécessite la clé secrète. */
export async function isRecaptchaSecretConfigured(): Promise<boolean> {
  return !!(await getRecaptchaSecretKey());
}

/**
 * Vérifie un jeton reCAPTCHA côté serveur auprès de Google.
 *
 * - Non configuré (pas de clé secrète) : renvoie true — la protection repose
 *   alors sur le honeypot + la limite de fréquence, on n'exige rien de plus.
 * - Configuré mais aucun jeton (case non cochée) : renvoie false — le visiteur
 *   doit valider la case.
 * - Google injoignable (erreur réseau) : renvoie true (bénéfice du doute) pour
 *   ne pas bloquer un visiteur légitime pendant une panne du service ; le
 *   honeypot et la limite de fréquence restent actifs.
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = await getRecaptchaSecretKey();
  if (!secret) return true;
  if (!token) return false;

  try {
    // remoteip est volontairement OMIS : derrière un reverse proxy, l'IP vue
    // par le serveur (clientIp) peut différer de celle que Google associe au
    // jeton et provoquer un échec de vérification. Ce paramètre est facultatif.
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success !== true) {
      // Journalisé pour le diagnostic : par ex. "invalid-input-secret" (clé
      // secrète erronée ou ne correspondant pas à la clé de site),
      // "invalid-input-response" (jeton absent/expiré/tronqué),
      // "timeout-or-duplicate" (jeton déjà utilisé ou périmé).
      console.error(
        "Vérification reCAPTCHA refusée par Google :",
        (data["error-codes"] || []).join(", ") || "(aucun code d'erreur)",
      );
    }
    return data.success === true;
  } catch (error) {
    console.error("Vérification reCAPTCHA impossible (Google injoignable) :", error);
    return true;
  }
}

// --- Post-traitement du HTML de la page de contact -------------------------
// Ces remplacements s'appliquent après renderShell (voir renderDocument dans
// render.ts) : ils n'affectent JAMAIS le HTML vérifié à l'octet par
// extract-legacy.mjs (qui n'appelle pas renderDocument). Sur les autres pages,
// les motifs ci-dessous ne trouvent rien : simples no-ops.

// Chargeur api.js d'origine (copie locale périmée).
const ORIGINAL_RECAPTCHA_API_RE =
  /<script async="" defer="" src="\/assets\/js\/855ca1ab621d_api\.js"><\/script>/;

// Widget invisible d'origine + son script d'initialisation qui le suit
// immédiatement (le premier </script> rencontré ferme ce script d'init).
const ORIGINAL_INVISIBLE_RECAPTCHA_RE =
  /<div class="g-invisible-recaptcha g-recaptcha"[\s\S]*?<\/script>/;

const FORM_ACTIONS_MARKER = '<div class="form-actions">';

/**
 * Retire le reCAPTCHA invisible cassé d'origine et, si une clé de site est
 * fournie, insère à la place une case reCAPTCHA v2 avant les boutons du
 * formulaire, puis charge le vrai script Google en fin de document.
 */
export function applyContactRecaptcha(html: string, siteKey: string): string {
  let out = html
    .replace(ORIGINAL_RECAPTCHA_API_RE, "")
    .replace(ORIGINAL_INVISIBLE_RECAPTCHA_RE, "");

  const key = siteKey.trim();
  if (key && out.includes(FORM_ACTIONS_MARKER)) {
    const widget =
      `<div class="g-recaptcha" data-sitekey="${escapeHtml(key)}" style="margin:16px 0;"></div>`;
    out = out.replace(FORM_ACTIONS_MARKER, widget + FORM_ACTIONS_MARKER);

    const apiScript =
      '<script src="https://www.google.com/recaptcha/api.js" async="async" defer="defer"></script>';
    out = out.includes("</body>") ? out.replace("</body>", apiScript + "</body>") : out + apiScript;
  }

  return out;
}
