import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formString } from "@/lib/forms";
import { isRateLimited, clientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { seeOther } from "@/lib/http";

export const dynamic = "force-dynamic";

// Nom du champ piège (honeypot) injecté par public/js/contact-form.js :
// invisible pour un humain, souvent rempli aveuglément par les robots de spam.
const HONEYPOT_FIELD = "bd_site_web";

// Réception du formulaire de contact (balisage Joomla "Uniform" conservé à
// l'identique : les noms de champs numériques viennent du site d'origine).
//
// Anti-spam en défense en profondeur, sans jamais bloquer le site si un service
// tiers est absent :
//   1. champ piège (honeypot) + limite de fréquence par IP — toujours actifs,
//      sans dépendance externe ;
//   2. reCAPTCHA v2 — uniquement si des clés sont configurées (voir
//      src/lib/recaptcha.ts et Réglages).
//
// Deux formats de réponse, selon l'appelant :
//   - `Accept: application/json` (envoi en AJAX par contact-form.js) : un
//     petit objet JSON, lu directement par ce script pour vider le formulaire
//     et afficher le bon message sans recharger la page ;
//   - sinon (JavaScript désactivé, ou repli après échec réseau côté client) :
//     redirection 303 classique vers la page de contact avec ?sent=1 ou
//     ?erreur=recaptcha, gérée par src/app/[...slug]/route.ts.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const field = (name: string) => formString(form, name, 2000);
  const wantsJson = (request.headers.get("accept") || "").includes("application/json");

  // Retour sur la page d'origine. Seul le CHEMIN du referer est repris (jamais
  // son hôte) et la redirection est relative : on reste toujours sur le domaine
  // que le visiteur utilise, même derrière un reverse proxy (voir seeOther).
  const referer = request.headers.get("referer");
  let path = "/contact-orientation-scolaire-professionnel-toulouse";
  if (referer) {
    try {
      path = new URL(referer).pathname;
    } catch {
      // referer invalide : on garde la page de contact par défaut
    }
  }

  const respond = (result: { ok: boolean; error?: string }, redirectPath: string): Response => {
    if (wantsJson) return Response.json(result);
    return seeOther(redirectPath);
  };

  const isBot = field(HONEYPOT_FIELD) !== "";
  const limited = isRateLimited(`contact:${clientIp(request)}`, 5, 10 * 60 * 1000);

  // Robot évident (honeypot) ou trop de tentatives : succès silencieux, pour ne
  // donner aucun indice exploitable au robot.
  if (isBot || limited) {
    return respond({ ok: true }, `${path}?sent=1`);
  }

  // reCAPTCHA (seulement s'il est configuré) : contrairement au honeypot, un
  // visiteur légitime peut avoir oublié de cocher la case — on affiche donc une
  // erreur pour qu'il puisse réessayer, au lieu d'un faux succès silencieux.
  //
  // Le jeton reCAPTCHA est lu SANS la troncature à 2000 caractères des autres
  // champs : les jetons v2 récents dépassent souvent cette longueur, et un
  // jeton tronqué est rejeté par Google (« vérification non aboutie » alors que
  // la case a bien été cochée).
  const recaptchaToken = formString(form, "g-recaptcha-response", 20000);
  const recaptchaOk = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaOk) {
    return respond({ ok: false, error: "recaptcha" }, `${path}?erreur=recaptcha`);
  }

  const audience = field("4") === "Others" ? field("fieldOthers[4]") : field("4");
  const message = {
    civility: field("name[1][title]"),
    firstName: field("name[1][first]"),
    lastName: field("name[1][last]"),
    audience,
    phone: field("phone[3][default]"),
    email: field("2"),
    subject: field("5"),
    body: field("6"),
  };

  // Ne pas enregistrer les soumissions manifestement vides
  const hasContent = Object.values(message).some((v) => v !== "");
  if (hasContent) {
    await prisma.contactMessage.create({ data: message });
  }

  return respond({ ok: true }, `${path}?sent=1`);
}
