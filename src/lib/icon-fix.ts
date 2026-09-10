/**
 * Correctif pour la police d'icônes « Billion Web Font » du template
 * d'origine : ses fichiers (public/assets/fonts/…) n'ont jamais été inclus
 * dans le dump fourni (seules les feuilles de style qui la référencent ont
 * été capturées). Sans ce fichier, le navigateur retombe sur une police par
 * défaut et affiche le point de code Unicode brut utilisé comme emplacement
 * de glyphe (`.icon-phone:before{content:'\288'}` → le caractère « ƈ », par
 * exemple), ce qui produit les « caractères bizarres » visibles à côté du
 * téléphone, de l'email, du bouton « retour en haut », de la puce de liste, etc.
 *
 * Correctif : de petites icônes SVG (dessinées pour ce projet, contour fin,
 * couleur héritée via `currentColor` comme le faisait la police d'origine)
 * remplacent le contenu des classes/points de code réellement utilisés sur le
 * site (recensés en grepant `content:'\...'` dans les feuilles du template en
 * regard des classes présentes dans templates/ et content/). Injecté en fin
 * de document (voir SAFETY_SCRIPTS dans render.ts) : n'affecte donc jamais le
 * HTML vérifié à l'octet par extract-legacy.mjs.
 */

type IconName =
  | "phone"
  | "envelope"
  | "calendar"
  | "comment"
  | "close"
  | "chevronUp"
  | "check"
  | "chevronRight";

const ICON_PATHS: Record<IconName, string> = {
  phone:
    "<path d='M6.5 3.5h3l1.2 4-2 1.3c1 2.2 2.8 4 5 5l1.3-2 4 1.2v3c0 1.1-.9 2-2 2-8 0-14.5-6.5-14.5-14.5 0-1.1.9-2 2-2z'/>",
  envelope:
    "<rect x='3' y='5' width='18' height='14' rx='2'/><path d='M3.5 6.5 12 13l8.5-6.5'/>",
  calendar:
    "<rect x='3.5' y='5' width='17' height='15' rx='2'/><line x1='3.5' y1='10' x2='20.5' y2='10'/><line x1='8' y1='3' x2='8' y2='7'/><line x1='16' y1='3' x2='16' y2='7'/>",
  comment:
    "<path d='M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z'/>",
  close: "<path d='M6 6l12 12M18 6L6 18'/>",
  chevronUp: "<path d='M6 15l6-6 6 6'/>",
  check: "<path d='M5 12.5l4.5 4.5L19 7'/>",
  chevronRight: "<path d='M9 6l6 6-6 6'/>",
};

function svgDataUri(inner: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
  return `data:image/svg+xml,${svg.replaceAll("#", "%23")}`;
}

// Icônes rattachées à une classe unique et sans ambiguïté.
const CLASS_TO_ICON: Record<string, IconName> = {
  "icon-phone": "phone",
  "icon-envelope": "envelope",
  "icon-calendar": "calendar",
  "icon-comment": "comment",
  "bd-icon-55": "close", // croix de fermeture du menu mobile (templates/header.html)
  "bd-icon-66": "chevronUp", // flèche du bouton « retour en haut » (templates/tail.html)
};

function maskDeclarations(icon: IconName): string {
  const uri = svgDataUri(ICON_PATHS[icon]);
  return (
    `background-color:currentColor !important;` +
    `-webkit-mask:url("${uri}") center/contain no-repeat !important;` +
    `mask:url("${uri}") center/contain no-repeat !important;`
  );
}

// Toutes les déclarations passent en !important : les blocs concernés (liste
// à puces personnalisée, icônes de gabarit…) sont ciblés par le CSS d'origine
// avec des sélecteurs très spécifiques (ex.
// `.bd-block-79 .bd-blockcontent:not(.shape-only).bd-custom-bulletlist …`)
// qui l'emporteraient sinon sur notre correctif moins spécifique (ex.
// `width:auto` écraserait notre `width` et réduirait l'icône à 0px).
function iconRule(className: string, icon: IconName): string {
  return (
    `.${className}:before{content:"" !important;display:inline-block !important;` +
    `width:1em !important;height:1em !important;${maskDeclarations(icon)}` +
    `vertical-align:-0.15em !important}`
  );
}

// Puce de liste par défaut du template (`content:'\20d'` sur toutes les
// variantes .bd-bulletlist[-N] et sur les listes de contenu courantes) :
// même point de code partout, donc un seul correctif visuel suffit pour
// toutes les listes à puces du site.
const BULLET_SELECTOR =
  '.bd-tagstyles:not(.shape-only) ul:not([class*="menu"]) li:before,' +
  '[class*="bd-bulletlist"] li:before';

function bulletRule(): string {
  return (
    `${BULLET_SELECTOR}{content:"" !important;display:inline-block !important;` +
    `width:0.7em !important;height:0.7em !important;${maskDeclarations("check")}` +
    `vertical-align:middle !important;margin-right:2px !important}`
  );
}

// Séparateur du fil d'Ariane (même point de code `\20d` que la puce de liste,
// réutilisé par le gabarit dans un rôle différent — voir templates/footer.html).
function breadcrumbSeparatorRule(): string {
  return (
    `.bd-breadcrumbs-3 .breadcrumb li+li:before{content:"" !important;display:inline-block !important;` +
    `width:0.6em !important;height:0.6em !important;${maskDeclarations("chevronRight")}` +
    `vertical-align:middle !important;margin:0 4px !important}`
  );
}

export const ICON_FIX_STYLE = `<style>${Object.entries(CLASS_TO_ICON)
  .map(([cls, icon]) => iconRule(cls, icon))
  .join("")}${bulletRule()}${breadcrumbSeparatorRule()}</style>`;
