// Logique de statut de paiement des commandes, partagée entre le webhook
// Stripe (source de vérité asynchrone) et la page de confirmation (contrôle
// synchrone au retour du client).

import type { Order } from "@prisma/client";
import { prisma } from "./db";
import { isStripeConfigured, getStripeClient } from "./stripe";

/**
 * Marque une commande comme payée et décrémente les stocks — une seule fois.
 *
 * Idempotent : plusieurs appels (webhook réessayé par Stripe + contrôle sur
 * la page de confirmation) ne décrémentent le stock qu'à la première bascule
 * vers PAID.
 */
export async function markOrderPaid(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });

  for (const item of order.items) {
    if (!item.productId) continue;
    await prisma.product
      .update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      .catch(() => {
        // Produit supprimé depuis : rien à décrémenter.
      });
  }
}

/**
 * Réconcilie le statut d'une commande « PENDING » en interrogeant directement
 * Stripe, sans dépendre du webhook.
 *
 * Pourquoi : le webhook (voir /api/stripe/webhook) reste la garantie de
 * fiabilité si le client ferme son navigateur avant la redirection. Mais s'il
 * est mal configuré côté tableau de bord Stripe (mauvaise URL, secret absent),
 * la commande resterait indéfiniment « en attente » alors que le paiement est
 * bien passé. En vérifiant la session Stripe au moment où le client revient
 * sur la page de confirmation, l'affichage devient correct immédiatement, quel
 * que soit l'état du webhook.
 *
 * Ne fait jamais échouer l'affichage : toute erreur réseau/Stripe laisse la
 * commande en l'état (le webhook ou un rechargement ultérieur prendront le
 * relais).
 */
export async function reconcileOrderPayment(reference: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) return null;

  // Seules les commandes en attente d'un paiement Stripe sont concernées.
  if (order.paymentStatus !== "PENDING" || !order.stripeSessionId) return order;
  if (!(await isStripeConfigured())) return order;

  try {
    const stripe = await getStripeClient();
    // Appel synchrone pendant le rendu d'une page (confirmation client, détail
    // commande admin) : borné à un seul essai et 8 s pour qu'un ralentissement
    // de Stripe ne bloque jamais l'affichage (le webhook reste le filet).
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId,
      undefined,
      { maxNetworkRetries: 0, timeout: 8000 },
    );

    if (session.payment_status === "paid") {
      await markOrderPaid(order.id);
      return { ...order, paymentStatus: "PAID", status: "CONFIRMED" };
    }
    if (session.status === "expired") {
      await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED" },
      });
      return { ...order, paymentStatus: "FAILED" };
    }
  } catch (error) {
    console.error("Réconciliation du paiement Stripe impossible :", error);
  }

  return order;
}
