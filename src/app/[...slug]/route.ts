import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  renderPage,
  renderVirtualPage,
  renderNotFound,
  HTML_HEADERS,
} from "@/lib/render";
import { getSession } from "@/lib/auth";
import { isShopEnabled } from "@/lib/settings";
import { readCart, clearCartCookieHeader } from "@/lib/cart";
import { isStripeConfigured } from "@/lib/stripe";
import { reconcileOrderPayment } from "@/lib/orders";
import { seeOther } from "@/lib/http";
import {
  viewShopList,
  viewProductDetail,
  viewCart,
  viewCheckout,
  viewOrderConfirmation,
  resolveCart,
} from "@/lib/shop";

export const dynamic = "force-dynamic";

// Message de confirmation du formulaire de contact : texte d'origine du site
// Joomla (champ form_post_action_data du composant Uniform).
const CONTACT_SUCCESS_HTML =
  "<p><b>Votre message</b><b> </b><b>a bien</b><b> </b><b>été envoyé.</b></p>";

// Échec de la vérification anti-robot (reCAPTCHA) : contrairement au honeypot,
// on l'indique pour qu'un visiteur légitime puisse simplement réessayer.
const CONTACT_RECAPTCHA_ERROR_HTML =
  '<p style="color:#c0392b;"><b>La vérification anti-robot n\'a pas abouti.</b> Merci de cocher la case «&nbsp;Je ne suis pas un robot&nbsp;», puis de renvoyer votre message.</p>';

async function renderShopRoute(
  request: NextRequest,
  parts: string[],
): Promise<Response | null> {
  if (!(await isShopEnabled())) return null;

  const [first, second] = parts;

  if (first === "livres" && parts.length === 1) {
    const products = await prisma.product.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    const html = await renderVirtualPage({
      path: "livres",
      shortTitle: "Les livres",
      metaDescription: "Les ouvrages sélectionnés par BOS & BOP.",
      contentHtml: viewShopList(products),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  if (first === "livres" && parts.length === 2) {
    const product = await prisma.product.findUnique({ where: { slug: second } });
    if (!product || !product.published) return renderNotFound();
    const html = await renderVirtualPage({
      path: `livres/${product.slug}`,
      shortTitle: product.title,
      metaDescription: `${product.title} — ${product.author}`.trim(),
      contentHtml: viewProductDetail(product),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  if (first === "panier" && parts.length === 1) {
    const lines = await resolveCart(readCart(request));
    const html = await renderVirtualPage({
      path: "panier",
      shortTitle: "Mon panier",
      contentHtml: viewCart(lines),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  if (first === "commande" && parts.length === 1) {
    const lines = await resolveCart(readCart(request));
    if (lines.length === 0) {
      return seeOther("/panier");
    }
    const error = request.nextUrl.searchParams.get("erreur") ?? undefined;
    const html = await renderVirtualPage({
      path: "commande",
      shortTitle: "Commande",
      contentHtml: viewCheckout(lines, error, await isStripeConfigured()),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  if (first === "commande" && second === "confirmation") {
    const reference = request.nextUrl.searchParams.get("ref") ?? "";
    // Contrôle synchrone du paiement auprès de Stripe (ne dépend pas du
    // webhook) : la commande affiche « payée » dès le retour du client, même
    // si le webhook est mal configuré côté Stripe (voir src/lib/orders.ts).
    const order = reference ? await reconcileOrderPayment(reference) : null;
    const html = await renderVirtualPage({
      path: "commande/confirmation",
      shortTitle: "Commande confirmée",
      contentHtml: viewOrderConfirmation(reference, order?.paymentStatus ?? "UNPAID"),
    });
    // Atteindre cette page ferme le processus de commande (paiement effectué
    // ou circuit sans paiement en ligne) : le panier est vidé ici, pas avant
    // (voir /api/checkout — un panier annulé sur Stripe reste réutilisable).
    return new Response(html, { headers: { ...HTML_HEADERS, "Set-Cookie": clearCartCookieHeader() } });
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug: parts } = await context.params;

  // Boutique (activable depuis l'administration)
  const shopResponse = await renderShopRoute(request, parts);
  if (shopResponse) return shopResponse;

  // Pages du CMS
  if (parts.length === 1) {
    const page = await prisma.page.findUnique({ where: { slug: parts[0] } });
    if (page) {
      // Les pages dépubliées restent visibles pour un administrateur connecté
      if (!page.published && !(await getSession())) return renderNotFound();
      const sent = request.nextUrl.searchParams.get("sent") === "1";
      const erreur = request.nextUrl.searchParams.get("erreur");
      const formMessage = sent
        ? CONTACT_SUCCESS_HTML
        : erreur === "recaptcha"
          ? CONTACT_RECAPTCHA_ERROR_HTML
          : undefined;
      const html = await renderPage(page, { injectFormMessage: formMessage });
      return new Response(html, { headers: HTML_HEADERS });
    }
  }

  return renderNotFound();
}
