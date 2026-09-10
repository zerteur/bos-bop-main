/**
 * Pastille flottante « Mon panier » (boutique).
 *
 * Injectée UNIQUEMENT quand la boutique est activée (voir renderDocument dans
 * src/lib/render.ts) : boutique désactivée, ce fichier n'est pas chargé et le
 * site reste strictement identique à l'original.
 *
 * Volontairement AUTONOME, en bas à droite de chaque page, séparée de
 * l'encadré téléphone de l'en-tête (que l'on ne touche donc plus du tout) :
 * le panier reste accessible partout, en défilement, sans se mélanger aux
 * coordonnées de contact.
 *
 * Le compteur lit le cookie du panier (bosbop_panier, JSON {id: quantité},
 * non HttpOnly — il ne contient rien de sensible) : il est donc toujours à
 * jour à chaque affichage de page, y compris au retour arrière du navigateur
 * (évènement pageshow, pages servies depuis le cache de navigation).
 */
(function () {
  "use strict";

  var CART_ICON =
    '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px">' +
    '<path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.22L20.5 8H6.1"/>' +
    '<circle cx="10" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>';

  var CSS =
    // Pastille marine flottante en bas à droite, accents dorés (charte du
    // site), avec ombre portée pour la détacher du contenu.
    "#bd-cart-widget{position:fixed;right:18px;bottom:18px;z-index:9998;" +
    "display:inline-flex;align-items:center;gap:9px;padding:11px 18px;border-radius:26px;" +
    "background:#102f40;color:#fff;text-decoration:none;font-size:15px;font-weight:600;" +
    "white-space:nowrap;cursor:pointer;box-shadow:0 4px 16px rgba(16,47,64,.35);" +
    "transition:background .15s ease,transform .15s ease;}" +
    "#bd-cart-widget:hover{background:#1d4a63;transform:translateY(-1px);}" +
    "#bd-cart-widget .bd-cart-icon{color:#ddc076;display:inline-flex;}" +
    "#bd-cart-widget .bd-cart-badge{display:none;min-width:21px;height:21px;border-radius:11px;" +
    "background:#ddc076;color:#102f40;font-size:12px;line-height:21px;text-align:center;" +
    "padding:0 6px;font-weight:700;margin-left:1px;}";

  function cartCount() {
    var match = document.cookie.match(/(?:^|;\s*)bosbop_panier=([^;]*)/);
    if (!match) return 0;
    try {
      var data = JSON.parse(decodeURIComponent(match[1]));
      var total = 0;
      for (var id in data) total += Math.max(0, Math.floor(Number(data[id])) || 0);
      return total;
    } catch (e) {
      return 0;
    }
  }

  function ensureWidget() {
    var widget = document.getElementById("bd-cart-widget");
    if (!widget) {
      var style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);

      widget = document.createElement("a");
      widget.id = "bd-cart-widget";
      widget.href = "/panier";
      widget.title = "Voir mon panier";
      widget.innerHTML =
        '<span class="bd-cart-icon">' + CART_ICON + "</span>" +
        '<span class="bd-cart-label">Mon panier</span>' +
        '<span class="bd-cart-badge" aria-label="articles dans le panier"></span>';
      document.body.appendChild(widget);
    }
    return widget;
  }

  function refresh() {
    var widget = ensureWidget();
    var badge = widget.querySelector(".bd-cart-badge");
    var count = cartCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-block" : "none";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
  window.addEventListener("pageshow", refresh);
})();
