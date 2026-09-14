/**
 * Menu principal de l'en-tête : robustesse quand le nombre d'onglets dépasse
 * ce que prévoyait le gabarit d'origine.
 *
 * Le template Joomla « juillet2019 » a été conçu pour exactement 5 entrées de
 * menu. Il les dispose (au-dessus de 768 px) en cellules de tableau
 * (`display:table-cell`, hérité de `.nav-justified` de Bootstrap) sur une
 * SEULE ligne, sans retour à la ligne possible. Dès qu'on ajoute des entrées
 * depuis l'administration, la barre déborde : les onglets en trop partent
 * hors écran à droite (dans le « vide »), inaccessibles, et la page gagne une
 * barre de défilement horizontale.
 *
 * Correctif : au-dessus de 768 px (donc uniquement pour le menu horizontal de
 * bureau — le menu mobile « offcanvas » en dessous de 768 px n'est pas
 * touché), la liste passe en `flex` avec `flex-wrap:wrap` : les onglets en
 * trop reviennent simplement à la ligne, centrés, tous cliquables, sans
 * débordement horizontal.
 *
 * Injecté en fin de document (voir SAFETY_SCRIPTS dans render.ts), comme
 * icon-fix.ts : n'affecte jamais le HTML vérifié à l'octet par
 * extract-legacy.mjs.
 */

// Sélecteurs très spécifiques + !important : on remplace le comportement d'origine.
// Pour éviter que le menu horizontal ne déborde ou ne prenne trop de place en hauteur (wrap)
// sur les écrans moyens (tablettes, petits PC), on force le menu mobile (hamburger) jusqu'à 1199px.
const MENU_LAYOUT_RULES =
  /* Sur grands écrans (>= 1200px), on affiche le menu horizontal avec flex-wrap en sécurité */
  "@media (min-width:1200px){" +
  ".bd-hmenu-6 .navbar-collapse .bd-horizontalmenu-7{display:block !important;width:100% !important}" +
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav{" +
  "display:flex !important;flex-wrap:wrap !important;gap:0;" +
  "justify-content:center !important;align-items:stretch !important;width:100% !important}" +
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav>li{" +
  "display:block !important;float:none !important;width:auto !important;margin:0 !important}" +
  /* Réduction des marges internes et de la taille de police pour maximiser le nombre d'onglets sur une seule ligne */
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav>li>a{padding:10px 8px !important;font-size:13px !important;border-right-width:0 !important}" +
  /* Corrige la hauteur fixe du conteneur de l'en-tête qui masquait les onglets s'ils passaient à la ligne (texte blanc sur fond blanc) */
  ".bd-layoutbox-29{height:auto !important;min-height:47px !important;}" +
  "}" +
  /* Sur écrans moyens (768px à 1199px), on force l'affichage du hamburger au lieu du menu horizontal */
  "@media (min-width:768px) and (max-width:1199px){" +
  ".bd-hmenu-6 .collapse-button{display:block !important}" +
  ".bd-hmenu-6 .navbar-collapse.collapse{display:none !important}" +
  ".bd-hmenu-6 .navbar-collapse.collapse.in, .bd-hmenu-6 .navbar-collapse.collapsing{display:block !important}" +
  /* On s'assure que les items du menu déroulant soient disposés verticalement (et non en table-cell) */
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav>li{" +
  "display:block !important;float:none !important;width:100% !important;margin:0 !important}" +
  "}";

export const MENU_FIX_STYLE = `<style>${MENU_LAYOUT_RULES}</style>`;
