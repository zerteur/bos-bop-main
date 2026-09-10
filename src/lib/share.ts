import { escapeHtml } from "./shell.mjs";

/**
 * Partage sur les réseaux sociaux : fiabilisation de l'aperçu (Facebook en
 * particulier).
 *
 * Deux problèmes traités, en post-traitement du document assemblé (comme
 * applyWidgetCustomization) — donc SANS toucher au HTML vérifié à l'octet par
 * extract-legacy.mjs, qui appelle renderShell() directement :
 *
 *  1. URL de partage en `.html`. Le gabarit d'origine partageait l'adresse
 *     historique Joomla (`/ma-page.html`). Sur le nouveau site ces adresses
 *     ne sont plus qu'une redirection 301 vers l'URL propre (`/ma-page`). Or
 *     le robot d'aperçu de Facebook suit mal ces redirections : il affiche
 *     alors l'URL sans titre ni image (« le nom de la page n'est pas
 *     récupéré »), surtout pour une page récemment créée que Facebook
 *     découvre pour la première fois. On réécrit donc le lien de partage
 *     AddToAny vers l'URL canonique servie en 200 ; les boutons
 *     Facebook / Twitter / LinkedIn en héritent (voir applyWidgetCustomization,
 *     qui lit cette même URL).
 *
 *  2. Absence de balises Open Graph. Le <head> d'origine n'en contient
 *     aucune : Facebook doit deviner le titre à partir de <title> et ne
 *     dispose d'aucune URL canonique. On injecte `og:title`, `og:description`,
 *     `og:url`, `og:type`, `og:site_name`, `og:locale` et un `<link
 *     rel="canonical">` juste avant `</head>` : l'aperçu devient déterministe.
 */

const ADDTOANY_HREF_RE =
  /(<a class="a2a_dd" href="https:\/\/www\.addtoany\.com\/share#url=)[^"&]*(&amp;title=[^"]*")/;

export type ShareMeta = {
  siteUrl: string;
  /** Chemin canonique de la page : "/" ou "/mon-slug". */
  path: string;
  /** <title> complet de la page. */
  title: string;
  /** meta description (peut être vide). */
  description: string;
};

/** URL absolue canonique de la page (celle servie en 200 par le site). */
function canonicalUrl({ siteUrl, path }: ShareMeta): string {
  const base = siteUrl.replace(/\/+$/, "");
  return path === "/" ? `${base}/` : base + path;
}

function openGraphTags(meta: ShareMeta): string {
  const url = canonicalUrl(meta);
  const tags = [
    ['<link rel="canonical" href="', escapeHtml(url), '"/>'],
    ['<meta property="og:type" content="website"/>'],
    ['<meta property="og:site_name" content="BOS &amp; BOP"/>'],
    ['<meta property="og:locale" content="fr_FR"/>'],
    ['<meta property="og:title" content="', escapeHtml(meta.title), '"/>'],
    ['<meta property="og:url" content="', escapeHtml(url), '"/>'],
  ];
  if (meta.description.trim()) {
    tags.push([
      '<meta property="og:description" content="',
      escapeHtml(meta.description.trim()),
      '"/>',
    ]);
  }
  return tags.map((parts) => parts.join("")).join("");
}

export function applyShareCanonical(html: string, meta: ShareMeta): string {
  let out = html;

  // 1. Lien de partage AddToAny -> URL canonique (sans .html).
  const url = canonicalUrl(meta);
  out = out.replace(
    ADDTOANY_HREF_RE,
    (_m, prefix: string, suffix: string) => prefix + encodeURIComponent(url) + suffix,
  );

  // 2. Balises Open Graph + canonical, juste avant </head>.
  out = out.replace("</head>", openGraphTags(meta) + "</head>");

  return out;
}
