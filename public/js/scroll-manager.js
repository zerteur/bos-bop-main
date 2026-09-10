/**
 * Gestionnaire de défilement du site (remplace l'ancien scroll-lock-fix.js).
 *
 * Corrige deux mécaniques invisibles héritées du template d'origine ; aucun
 * changement d'apparence dans les deux cas, seule la façon dont le
 * défilement RÉAGIT est concernée.
 *
 * 1) Verrou de défilement du menu mobile (offcanvas) : le template pose
 *    `position:fixed` sur <html> (fonctions disableScroll/enableScroll de
 *    assets/js/…_script.js) et ne le libère qu'à la toute fin de l'animation
 *    de fermeture (~700 ms), voire jamais si la fermeture est interrompue.
 *      a. Déverrouillage dès le DÉBUT de la fermeture (évènement Bootstrap
 *         "hide.bs.collapse") : le défilement redevient utilisable sans délai.
 *      b. Filet de sécurité PILOTÉ PAR ÉVÈNEMENTS (MutationObserver sur le
 *         style de <html> et les classes du menu) au lieu d'une boucle
 *         setInterval : zéro réveil périodique, zéro travail quand rien ne
 *         se passe.
 *
 * 2) Molette « à l'ancienne » sur les pages avec effet de parallaxe (ex.
 *    l'accueil) : le script d'origine active, uniquement quand un élément
 *    `.bd-parallax-bg-effect` est présent, une bibliothèque tierce
 *    (`window._smoothWheelInstance`, fonction SmoothWheel du même fichier)
 *    qui intercepte la molette et ranime le défilement pas à pas via
 *    setTimeout au lieu de laisser le navigateur le gérer nativement. Sur
 *    les pavés tactiles et souris modernes (petits deltas très fréquents),
 *    cette file d'attente d'animations produit un défilement saccadé qui
 *    semble « revenir en arrière » en essayant de descendre. Neutralisée
 *    avant que le script d'origine ne construise son instance (ce fichier
 *    est chargé en `defer`, donc avant l'évènement "document ready" jQuery
 *    auquel `onLoad()` est suspendu) : la molette redevient native. L'effet
 *    de parallaxe visuel lui-même (animé séparément via
 *    requestAnimationFrame dans le même fichier) n'est pas touché.
 */
window._smoothWheelInstance = function () {
  return null;
};

(function () {
  "use strict";

  var html = document.documentElement;

  /** Libère le verrou de défilement en restaurant la position exacte. */
  function unlockScroll() {
    if (html.style.position !== "fixed") return;
    var body = document.body;
    var top = body.style.top;
    html.style.position = "";
    html.style.overflowY = "";
    html.style.width = "";
    body.style.top = "";
    var y = top ? -parseInt(top, 10) || 0 : window.scrollY;
    window.scrollTo(window.scrollX, y);
  }

  /** Le menu mobile est-il ouvert ou en cours d'animation ? */
  function menuOpenOrAnimating() {
    return !!document.querySelector(".navbar-collapse.in, .navbar-collapse.collapsing");
  }

  // 1) Déverrouillage immédiat au début de la fermeture du menu.
  function bindInstantUnlock($) {
    $(document).on("hide.bs.collapse", ".navbar-collapse.width", unlockScroll);
  }
  if (window.jQuery) {
    bindInstantUnlock(window.jQuery);
  } else {
    // jQuery peut ne pas être encore présent selon l'ordre de chargement.
    var tries = 0;
    var waitForJQuery = setInterval(function () {
      if (window.jQuery) {
        clearInterval(waitForJQuery);
        bindInstantUnlock(window.jQuery);
      } else if (++tries > 40) {
        clearInterval(waitForJQuery);
      }
    }, 50);
  }

  // 2) Filet de sécurité événementiel : si <html> reste verrouillé alors que
  // le menu n'est ni ouvert ni en cours d'animation, on libère. La
  // vérification est regroupée par requestAnimationFrame pour ne s'exécuter
  // qu'une fois par rafale de mutations.
  var checkScheduled = false;
  function scheduleCheck() {
    if (checkScheduled) return;
    checkScheduled = true;
    requestAnimationFrame(function () {
      checkScheduled = false;
      if (html.style.position === "fixed" && !menuOpenOrAnimating()) unlockScroll();
    });
  }

  var observer = new MutationObserver(scheduleCheck);
  observer.observe(html, { attributes: true, attributeFilter: ["style"] });

  function observeMenus() {
    document.querySelectorAll(".navbar-collapse").forEach(function (menu) {
      observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
    });
    scheduleCheck();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeMenus);
  } else {
    observeMenus();
  }

  // Restauration depuis le cache de navigation (retour arrière).
  window.addEventListener("pageshow", scheduleCheck);
})();
