// Constantes partagées du site (une seule source de vérité).

/** Suffixe commun des <title>, repris du site d'origine. */
export const TITLE_SUFFIX =
  " - BOS & BOP - Orientation scolaire et professionnelle à Toulouse";

/** Classes <body> des deux variantes de gabarit du site d'origine. */
export const INNER_BODY_CLASS =
  "bootstrap bd-body-7 bd-pagebackground-104 bd-margins";
export const HOME_BODY_CLASS =
  "bootstrap bd-body-1 bd-homepage bd-pagebackground-49 bd-margins";

/** URL publique par défaut (modifiable dans Réglages). */
export const DEFAULT_SITE_URL = "https://www.bos-bop.fr";

/** Chemins réservés : routes techniques, boutique, aperçu. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "assets",
  "uploads",
  "livres",
  "panier",
  "commande",
  "page-non-trouvee",
  "index.php",
  "apercu",
]);
