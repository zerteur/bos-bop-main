import Stripe from "stripe";
import { getSetting } from "./settings";

/**
 * Client Stripe. Clé secrète et secret de webhook configurables depuis le
 * tableau de bord (Réglages → Paiement en ligne), stockés dans les réglages
 * du site (table Setting) au même titre qu'un autre réglage.
 *
 * Les variables d'environnement STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 * restent prioritaires si elles sont définies (utile pour un déploiement
 * géré entièrement par fichiers de configuration) ; sinon, la valeur
 * enregistrée depuis l'administration est utilisée.
 *
 * Tant qu'aucune des deux n'est renseignée, la boutique reste pleinement
 * fonctionnelle : le paiement en ligne bascule automatiquement sur le
 * circuit « commande enregistrée, réglage organisé manuellement » (voir
 * src/app/api/checkout/route.ts).
 */

async function secretKey(): Promise<string> {
  return process.env.STRIPE_SECRET_KEY || (await getSetting("stripeSecretKey", ""));
}

async function webhookSecret(): Promise<string> {
  return process.env.STRIPE_WEBHOOK_SECRET || (await getSetting("stripeWebhookSecret", ""));
}

export async function isStripeConfigured(): Promise<boolean> {
  return !!(await secretKey());
}

export async function isStripeWebhookConfigured(): Promise<boolean> {
  return !!(await webhookSecret());
}

export async function getStripeClient(): Promise<Stripe> {
  const key = await secretKey();
  if (!key) throw new Error("Aucune clé secrète Stripe configurée.");
  return new Stripe(key);
}

export async function getStripeWebhookSecret(): Promise<string> {
  const secret = await webhookSecret();
  if (!secret) throw new Error("Aucun secret de webhook Stripe configuré.");
  return secret;
}
