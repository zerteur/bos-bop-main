import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripeClient, getStripeWebhookSecret, isStripeWebhookConfigured } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Confirmation de paiement Stripe. Doit lire le corps BRUT de la requête
// (pas de parsing JSON) : la vérification de signature Stripe porte sur les
// octets exacts envoyés, un corps reconstruit après parsing échouerait.
export async function POST(request: NextRequest) {
  if (!(await isStripeWebhookConfigured())) {
    return Response.json({ error: "Webhook Stripe non configuré." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Signature manquante" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const [stripe, webhookSecret] = await Promise.all([getStripeClient(), getStripeWebhookSecret()]);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Signature Stripe invalide :", error);
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);
    if (orderId) await markOrderPaid(orderId);
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.orderId);
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED" },
      });
    }
  }

  return Response.json({ received: true });
}
