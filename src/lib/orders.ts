// Logique de statut de paiement des commandes, partagée entre le webhook
// Stripe (source de vérité asynchrone) et la page de confirmation (contrôle
// synchrone au retour du client).

import type { Order } from "@prisma/client";
import { prisma } from "./db";
import { isStripeConfigured, getStripeClient } from "./stripe";
import { sendPaymentAndEbooksEmail } from "./email";

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
    include: { items: { include: { product: true } } },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "CONFIRMED" },
  });

  const ebookLinks: { title: string, url: string }[] = [];

  for (const item of order.items) {
    if (!item.productId || !item.product) continue;
    
    if (item.product.pdfPath || item.product.epubPath) {
      const access = await prisma.purchaseAccess.create({
        data: {
          orderId: order.id,
          productId: item.productId,
        },
      });
      ebookLinks.push({
        title: item.product.title,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/lire/${access.id}`,
      });
    }
  }

  // On envoie le mail de confirmation de paiement (avec les liens PDF s'il y en a)
  await sendPaymentAndEbooksEmail(order.email, order.reference, ebookLinks);
}

/**
 * Réconcilie le statut d'une commande « PENDING » en interrogeant directement
 * Stripe, sans dépendre du webhook.
 */
export async function reconcileOrderPayment(reference: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) return null;

  if (order.paymentStatus !== "PENDING" || !order.stripeSessionId) return order;
  if (!(await isStripeConfigured())) return order;

  try {
    const stripe = await getStripeClient();
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
