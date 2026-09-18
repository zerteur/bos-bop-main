/**
 * Correctifs d'affichage fluide du site public (téléphone / tablette).
 *
 * Le gabarit Joomla d'origine est déjà « responsive » (menu hamburger,
 * colonnes Bootstrap). Ces règles ciblent uniquement les débordements
 * horizontaux encore visibles : images, iframes Facebook, bandeau cookies,
 * pied de page à hauteur fixe, titres H1 trop grands, tableaux.
 *
 * Injecté en fin de document (voir SAFETY_SCRIPTS dans render.ts) : n'affecte
 * jamais le HTML vérifié à l'octet par extract-legacy.mjs.
 */

const RULES =
  "html{overflow-x:hidden;-webkit-text-size-adjust:100%;}" +
  "img{max-width:100%;height:auto;}" +
  "iframe{max-width:100%;}" +
  "table{max-width:100%;}" +
  ".fb_iframe_widget,.fb_iframe_widget span,.fb_iframe_widget iframe{max-width:100% !important;}" +
  "#cookie-banner{padding:16px 18px !important;}" +
  "#cookie-banner>div{flex-wrap:wrap !important;max-width:100% !important;}" +
  ".custom-share-buttons{flex-wrap:wrap;}" +
  "@media (max-width:991px){" +
  ".container-fluid>.row,.separated-grid.row{margin-left:0 !important;margin-right:0 !important;}" +
  "}" +
  "@media (max-width:767px){" +
  ".bd-footerarea-1{min-height:0 !important;}" +
  "h1{font-size:32px !important;line-height:1.2 !important;}" +
  "h1.bd-textblock-20{font-size:26px !important;line-height:1.25 !important;}" +
  ".bd-postcontent-7,.bd-tagstyles{overflow-wrap:anywhere;}" +
  "table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;}" +
  ".bd-layoutbox-33{overflow:hidden;}" +
  ".custom-share-buttons{margin-left:0 !important;}" +
  "}" +
  "@media (max-width:480px){" +
  "#cookie-banner{padding:12px 14px !important;}" +
  "#cookie-banner p{font-size:13px !important;}" +
  "#cookie-banner button{padding:8px 16px !important;}" +
  "input,select,textarea{font-size:16px !important;}" +
  ".bd-block-70{padding:4px 8px;}" +
  "}" +
  "@media (max-width:360px){" +
  "h1.bd-textblock-20{font-size:22px !important;}" +
  "}";

export const RESPONSIVE_FIX_STYLE = `<style>${RULES}</style>`;
