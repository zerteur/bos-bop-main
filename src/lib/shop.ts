import type { Product } from "@prisma/client";
import { prisma } from "./db";
import { escapeHtml } from "./render";
import { sectionShell } from "./blocks";
import type { Cart } from "./cart";

// ---------------------------------------------------------------------------
// Vues HTML de la boutique. Le balisage reprend les classes du gabarit
// d'origine (sections, colonnes Bootstrap, boutons) pour une intégration
// visuelle homogène avec le reste du site.
// ---------------------------------------------------------------------------

export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

const section = (inner: string) => `\n${sectionShell(inner)}\n`;

// Couleurs du site (gabarit d'origine) : marine et or.
const NAVY = "#102f40";
const GOLD = "#ddc076";

/** Visuel de l'ouvrage : image du produit ou vignette de remplacement. */
function productImage(product: Product, height: number): string {
  const frame =
    `display:flex;align-items:center;justify-content:center;height:${height}px;` +
    `background:#f7f6f2;border-radius:6px;overflow:hidden;`;
  if (product.imageUrl) {
    return `<div style="${frame}"><img alt="${escapeHtml(product.title)}" src="${escapeHtml(product.imageUrl)}" style="max-width:100%;max-height:100%;object-fit:contain;"/></div>`;
  }
  return `<div style="${frame}">
<svg viewBox="0 0 24 24" width="${Math.round(height / 3)}" height="${Math.round(height / 3)}" aria-hidden="true" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/>
<path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>
</svg>
</div>`;
}

function productCard(product: Product): string {
  const author = product.author
    ? `<p style="margin:2px 0 0;color:#777;font-style:italic;">${escapeHtml(product.author)}</p>`
    : "";
  const action =
    product.stock > 0
      ? `<form action="/api/cart/add" method="post" style="margin:12px 0 0;">
<input name="productId" type="hidden" value="${product.id}"/>
<input name="quantity" type="hidden" value="1"/>
<button type="submit">Ajouter au panier</button>
</form>`
      : `<p style="margin:12px 0 0;"><em>Bientôt disponible</em></p>`;
  return `<div class="col-sm-4" style="margin-bottom:26px;">
<div style="border:1px solid #e6e4dd;border-radius:8px;padding:18px;text-align:center;background:#fff;box-shadow:0 1px 4px rgba(16,47,64,.06);height:100%;">
<a href="/livres/${escapeHtml(product.slug)}" title="${escapeHtml(product.title)}" style="text-decoration:none;">${productImage(product, 190)}</a>
<h3 style="margin:14px 0 0;font-size:19px;"><a href="/livres/${escapeHtml(product.slug)}" style="color:${NAVY};text-decoration:none;">${escapeHtml(product.title)}</a></h3>
${author}
<p style="margin:10px 0 0;color:${NAVY};font-size:21px;font-weight:700;">${formatPrice(product.priceCents)}</p>
${action}
</div>
</div>`;
}

export function viewShopList(products: Product[]): string {
  const cards = products.map(productCard).join("\n");
  const body =
    products.length === 0
      ? "<p>Aucun livre disponible pour le moment. Revenez bientôt !</p>"
      : `<div class="row" style="display:flex;flex-wrap:wrap;">\n${cards}\n</div>`;
  return section(`<div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:10px;">
<h2 style="margin-top:0;">Les livres BOS &amp; BOP</h2>
<a href="/panier" title="Voir mon panier" style="color:${NAVY};font-weight:600;">Voir mon panier &rarr;</a>
</div>
<p>Retrouvez ici les ouvrages sélectionnés par BOS &amp; BOP pour vous accompagner dans votre orientation.</p>
${body}`);
}

export function viewProductDetail(product: Product): string {
  const addForm =
    product.stock > 0
      ? `<form action="/api/cart/add" method="post" style="margin:18px 0 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
<input name="productId" type="hidden" value="${product.id}"/>
<label style="display:flex;align-items:center;gap:8px;margin:0;">Quantité
<input max="99" min="1" name="quantity" type="number" value="1" style="width:64px;padding:8px;border:1px solid #ccc;border-radius:5px;"/>
</label>
<button type="submit">Ajouter au panier</button>
</form>`
      : `<p style="margin:18px 0 0;"><em>Cet ouvrage sera bientôt disponible.</em></p>`;
  return section(`<p style="margin-bottom:16px;"><a href="/livres" title="Retour à la liste des livres" style="color:${NAVY};">&larr; Retour aux livres</a></p>
<div class="row">
<div class="col-sm-5">
${productImage(product, 320)}
</div>
<div class="col-sm-7">
<h2 style="margin-top:0;">${escapeHtml(product.title)}</h2>
${product.author ? `<p style="color:#777;font-style:italic;margin-top:2px;">de ${escapeHtml(product.author)}</p>` : ""}
<p style="color:${NAVY};font-size:26px;font-weight:700;margin:12px 0;">${formatPrice(product.priceCents)}</p>
${product.description}
${addForm}
</div>
</div>`);
}

export type CartLine = { product: Product; quantity: number };

/** Résout le panier cookie en lignes valides (produits publiés uniquement). */
export async function resolveCart(cart: Cart): Promise<CartLine[]> {
  const ids = Object.keys(cart).map(Number);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, published: true },
  });
  return products
    .map((product) => ({ product, quantity: cart[String(product.id)] }))
    .filter((line) => line.quantity > 0);
}

export function cartTotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
}

export function viewCart(lines: CartLine[]): string {
  if (lines.length === 0) {
    return section(`<h2 style="margin-top:0;">Mon panier</h2>
<div style="border:1px dashed #d8d5cc;border-radius:8px;padding:34px;text-align:center;">
<p style="margin:0 0 14px;">Votre panier est vide.</p>
<p style="margin:0;"><a href="/livres" title="Voir les livres"> <button>Voir les livres</button> </a></p>
</div>`);
  }
  const cell = "padding:12px 10px;border-bottom:1px solid #eceae4;vertical-align:middle;";
  const rows = lines
    .map(
      (l) => `<tr>
<td style="${cell}">
<div style="display:flex;align-items:center;gap:12px;">
<a href="/livres/${escapeHtml(l.product.slug)}" style="flex:0 0 54px;">${productImage(l.product, 54)}</a>
<a href="/livres/${escapeHtml(l.product.slug)}" style="color:${NAVY};font-weight:600;text-decoration:none;">${escapeHtml(l.product.title)}</a>
</div>
</td>
<td style="${cell}text-align:right;white-space:nowrap;">${formatPrice(l.product.priceCents)}</td>
<td style="${cell}text-align:center;">
<form action="/api/cart/update" method="post" style="margin:0;display:inline-flex;align-items:center;gap:6px;">
<input name="productId" type="hidden" value="${l.product.id}"/>
<input max="99" min="0" name="quantity" type="number" value="${l.quantity}" style="width:60px;padding:7px;border:1px solid #ccc;border-radius:5px;"/>
<button type="submit" title="Mettre à jour la quantité">OK</button>
</form>
</td>
<td style="${cell}text-align:right;white-space:nowrap;font-weight:600;">${formatPrice(l.product.priceCents * l.quantity)}</td>
<td style="${cell}text-align:center;">
<form action="/api/cart/update" method="post" style="margin:0;">
<input name="productId" type="hidden" value="${l.product.id}"/>
<input name="quantity" type="hidden" value="0"/>
<button type="submit" title="Retirer du panier" aria-label="Retirer ${escapeHtml(l.product.title)} du panier">&times;</button>
</form>
</td>
</tr>`,
    )
    .join("\n");
  const th = `padding:10px;border-bottom:2px solid ${GOLD};text-align:left;color:${NAVY};`;
  return section(`<h2 style="margin-top:0;">Mon panier</h2>
<div style="overflow-x:auto;">
<table style="width:100%;border-collapse:collapse;background:#fff;">
<thead>
<tr>
<th style="${th}">Ouvrage</th>
<th style="${th}text-align:right;">Prix unitaire</th>
<th style="${th}text-align:center;">Quantité</th>
<th style="${th}text-align:right;">Sous-total</th>
<th style="${th}"></th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
<p style="text-align:right;font-size:20px;margin:16px 0;color:${NAVY};"><strong>Total : ${formatPrice(cartTotalCents(lines))}</strong></p>
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
<a href="/livres" title="Continuer mes achats" style="color:${NAVY};">&larr; Continuer mes achats</a>
<a href="/commande" title="Passer la commande"> <button>Passer la commande</button> </a>
</div>`);
}

export function viewCheckout(lines: CartLine[], error: string | undefined, stripeEnabled: boolean): string {
  // Des <div> plutôt qu'une liste <ul> : les listes de contenu héritent de la
  // puce décorative du site (icon-fix), hors de propos dans un récapitulatif.
  const recap = lines
    .map(
      (l) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #eceae4;">
<span>${escapeHtml(l.product.title)} <span style="color:#888;">× ${l.quantity}</span></span>
<span style="white-space:nowrap;font-weight:600;">${formatPrice(l.product.priceCents * l.quantity)}</span>
</div>`,
    )
    .join("\n");
  const errorHtml = error
    ? `<div style="border:1px solid #c0392b;background:#fdf1ef;color:#c0392b;border-radius:6px;padding:12px 14px;margin-bottom:16px;">${escapeHtml(error)}</div>`
    : "";
  const paymentNote = stripeEnabled
    ? "<p style=\"margin-top:14px;\"><em>Étape suivante : paiement sécurisé par carte bancaire (Stripe).</em></p>"
    : "<p style=\"margin-top:14px;\"><em>Le paiement en ligne n'est pas encore activé : après validation, nous vous contactons pour organiser le règlement et la remise (en main propre à Toulouse ou par envoi postal).</em></p>";
  const input = "width:100%;padding:9px 10px;border:1px solid #ccc;border-radius:5px;";
  return section(`<p style="margin-bottom:16px;"><a href="/panier" style="color:${NAVY};">&larr; Retour au panier</a></p>
<h2 style="margin-top:0;">Valider ma commande</h2>
${errorHtml}
<div class="row">
<div class="col-sm-6">
<form action="/api/checkout" method="post">
<p><label style="font-weight:600;">Nom complet<span class="required">*</span><br/><input name="customerName" required="required" style="${input}" type="text"/></label></p>
<p><label style="font-weight:600;">Email<span class="required">*</span><br/><input name="email" required="required" style="${input}" type="email"/></label></p>
<p><label style="font-weight:600;">Téléphone<br/><input name="phone" style="${input}" type="text"/></label></p>
<p><label style="font-weight:600;">Adresse de livraison<span class="required">*</span><br/><textarea name="address" required="required" rows="4" style="${input}"></textarea></label></p>
<p><label style="font-weight:600;">Remarque (facultatif)<br/><textarea name="note" rows="3" style="${input}"></textarea></label></p>
<p><button type="submit">${stripeEnabled ? "Passer au paiement" : "Confirmer la commande"}</button></p>
</form>
</div>
<div class="col-sm-6">
<div style="border:1px solid #e6e4dd;border-radius:8px;padding:20px;background:#fbfaf7;">
<h3 style="margin-top:0;color:${NAVY};">Récapitulatif</h3>
<div style="margin:0;padding:0;">
${recap}
</div>
<p style="display:flex;justify-content:space-between;font-size:19px;margin:14px 0 0;color:${NAVY};"><strong>Total</strong><strong>${formatPrice(cartTotalCents(lines))}</strong></p>
${paymentNote}
</div>
</div>
</div>`);
}

export function viewOrderConfirmation(reference: string, paymentStatus: string): string {
  const isPending = paymentStatus === "PENDING";
  const paymentNote =
    paymentStatus === "PAID"
      ? "<p style=\"margin:10px 0 0;\">Votre paiement en ligne a bien été reçu, merci !</p>"
      : paymentStatus === "FAILED"
        ? "<p style=\"margin:10px 0 0;\">Le paiement en ligne n'a pas abouti. Vous pouvez réessayer, ou nous vous recontactons pour organiser le règlement autrement.</p>"
        : isPending
          ? "<p style=\"margin:10px 0 0;\"><em>Votre paiement est en cours de confirmation. Cette page se met à jour automatiquement, et vous recevrez un email dès qu'il est validé.</em></p>"
          : "<p style=\"margin:10px 0 0;\">Nous vous recontactons rapidement par email ou téléphone pour organiser le règlement et la livraison.</p>";
  // En attente (paiement asynchrone type SEPA), la page se recharge quelques
  // fois : à chaque rechargement, le statut est revérifié auprès de Stripe
  // (voir reconcileOrderPayment) et finit par basculer sur « payé ». Limité à
  // quelques essais pour ne pas boucler indéfiniment si le paiement traîne.
  const autoRefresh = isPending
    ? '<script>(function(){var K="bosbop_conf_reload";try{var n=parseInt(sessionStorage.getItem(K)||"0",10);if(n<5){sessionStorage.setItem(K,String(n+1));setTimeout(function(){location.reload();},3000);}else{sessionStorage.removeItem(K);}}catch(e){}})();</script>'
    : '<script>try{sessionStorage.removeItem("bosbop_conf_reload");}catch(e){}</script>';
  return section(`<div style="max-width:620px;margin:0 auto;text-align:center;border:1px solid #e6e4dd;border-radius:10px;padding:36px 28px;background:#fff;">
<svg viewBox="0 0 24 24" width="52" height="52" aria-hidden="true" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;">
<circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/>
</svg>
<h2 style="margin:0;">Merci pour votre commande !</h2>
<p style="margin:14px 0 0;">Votre commande <strong style="color:${NAVY};">${escapeHtml(reference)}</strong> a bien été enregistrée.</p>
${paymentNote}
<p style="margin:22px 0 0;"><a href="/" title="Retour à l'accueil"> <button>Retour à l'accueil</button> </a></p>
</div>${autoRefresh}`);
}
