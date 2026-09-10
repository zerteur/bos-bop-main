import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formString } from "@/lib/forms";
import { readCart } from "@/lib/cart";
import { resolveCart, cartTotalCents } from "@/lib/shop";
import { isShopEnabled } from "@/lib/settings";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe";
import { seeOther, getPublicOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

function makeReference(): string {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BOS-${stamp}-${random}`;
}

// Enregistre la commande, puis :
//  - si Stripe est configuré (STRIPE_SECRET_KEY, voir src/lib/stripe.ts) :
//    redirige vers une session Stripe Checkout. La commande reste en attente
//    (paymentStatus "PENDING", stocks non décrémentés) jusqu'à la confirmation
//    du paiement par webhook (voir /api/stripe/webhook) ;
//  - sinon : circuit d'origine, commande directement enregistrée et stocks
//    décrémentés, réglage organisé manuellement avec le client.
export async function POST(request: NextRequest) {
  if (!(await isShopEnabled())) {
    return seeOther("/");
  }
  const form = await request.formData();
  const field = (name: string) => formString(form, name, 2000);

  const customerName = field("customerName");
  const email = field("email");
  const address = field("address");

  if (!customerName || !email || !address) {
    const erreur = encodeURIComponent("Merci de renseigner votre nom, votre email et votre adresse.");
    return seeOther(`/commande?erreur=${erreur}`);
  }

  const lines = await resolveCart(readCart(request));
  if (lines.length === 0) {
    return seeOther("/panier");
  }

  const useStripe = await isStripeConfigured();

  const order = await prisma.order.create({
    data: {
      reference: makeReference(),
      customerName,
      email,
      phone: field("phone"),
      address,
      note: field("note"),
      totalCents: cartTotalCents(lines),
      paymentStatus: useStripe ? "PENDING" : "UNPAID",
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          titleSnapshot: line.product.title,
          unitCents: line.product.priceCents,
          quantity: line.quantity,
        })),
      },
    },
  });

  const confirmationPath = `/commande/confirmation?ref=${encodeURIComponent(order.reference)}`;

  if (!useStripe) {
    // Pas de paiement à attendre : stocks décrémentés immédiatement.
    for (const line of lines) {
      await prisma.product.update({
        where: { id: line.product.id },
        data: { stock: Math.max(0, line.product.stock - line.quantity) },
      });
    }
    return seeOther(confirmationPath);
  }

  // Repli sur le circuit sans paiement en ligne pour CETTE commande si
  // Stripe est injoignable ou mal configuré : le client ne doit jamais se
  // retrouver bloqué par un problème côté prestataire de paiement.
  async function fallbackToManualPayment(): Promise<Response> {
    for (const line of lines) {
      await prisma.product.update({
        where: { id: line.product.id },
        data: { stock: Math.max(0, line.product.stock - line.quantity) },
      });
    }
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "UNPAID" } });
    return seeOther(confirmationPath);
  }

  // Origine dérivée de la requête elle-même (jamais du réglage "Adresse
  // publique du site", qui se périme dès que le site change de domaine —
  // voir getPublicOrigin dans src/lib/http.ts).
  const siteUrl = getPublicOrigin(request);
  try {
    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: order.reference,
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "eur",
          unit_amount: line.product.priceCents,
          product_data: { name: line.product.title },
        },
      })),
      success_url: `${siteUrl}/commande/confirmation?ref=${encodeURIComponent(order.reference)}`,
      cancel_url: `${siteUrl}/commande`,
      metadata: { orderId: String(order.id), orderReference: order.reference },
    });

    if (!session.url) return fallbackToManualPayment();

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    // Le panier n'est volontairement pas vidé ici : si le client annule le
    // paiement Stripe, cancel_url le ramène sur /commande avec son panier
    // intact pour réessayer. Il n'est vidé qu'à l'arrivée sur la confirmation
    // (voir src/app/[...slug]/route.ts), atteinte uniquement après paiement.
    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error("Échec de création de la session Stripe :", error);
    return fallbackToManualPayment();
  }
}
