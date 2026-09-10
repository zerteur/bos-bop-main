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

// Sélecteurs très spécifiques + !important : le CSS d'origine impose
// `display:block !important` / `display:table-cell` avec des sélecteurs déjà
// spécifiques (`.bd-horizontalmenu-7 .nav`, `.nav-justified > li`…).
const MENU_LAYOUT_RULES =
  "@media (min-width:768px){" +
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav{" +
  "display:flex !important;flex-wrap:wrap !important;" +
  "justify-content:center !important;align-items:stretch !important;width:100% !important}" +
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav>li{" +
  "display:block !important;float:none !important;width:auto !important}" +
  // Le filet vertical entre onglets (border-right) n'a plus de sens en bout
  // de ligne : on le neutralise pour le dernier onglet de chaque rangée.
  ".bd-hmenu-6 .navbar-collapse .bd-menu-13.nav>li:last-child>a{border-right-width:0 !important}" +
  "}";

export const MENU_FIX_STYLE = `<style>${MENU_LAYOUT_RULES}</style>`;
