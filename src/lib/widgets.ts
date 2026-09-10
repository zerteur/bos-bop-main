import { escapeHtml } from "./shell.mjs";

/**
 * Personnalisation des « widgets » du gabarit (téléphone, Facebook,
 * LinkedIn) avec les réglages de l'administration — voir /admin/widgets.
 *
 * Sans réglage renseigné, le HTML reste rigoureusement identique à celui du
 * site d'origine (même logique que applyHeroCustomization dans render.ts).
 * Appliqué en post-traitement sur le document assemblé (gabarit + page),
 * après renderShell() : n'affecte donc jamais le HTML vérifié à l'octet par
 * extract-legacy.mjs (qui appelle renderShell directement, sans passer par
 * cette fonction).
 */

export type WidgetSettings = {
  phone: string; // ex. "06.48.69.20.36"
  facebookUrl: string;
  linkedinUrl: string;
  shareBarEnabled: boolean;
  // Destinations personnalisées des icônes de la barre de partage. Vide =
  // comportement par défaut (partage de la page affichée).
  shareFacebookUrl: string;
  shareTwitterUrl: string;
  shareLinkedinUrl: string;
};

// Valeurs d'origine du site, telles qu'elles apparaissent dans templates/ —
// un réglage vide restaure exactement le comportement d'origine.
const ORIGINAL_PHONE_DISPLAY = "06.48.69.20.36";
const ORIGINAL_TEL_HREF = "tel:+336648692036";
const ORIGINAL_LINKEDIN_URL =
  "https://www.linkedin.com/in/val%C3%A9rie-calvet-846483a/?originalSubdomain=fr";

/** "06 48 69 20 36" / "0648692036" -> "tel:+33648692036". Repli sur la valeur
 * d'origine si le numéro saisi ne ressemble pas à un numéro français valide. */
function toTelHref(phoneDisplay: string): string {
  const digits = phoneDisplay.replace(/[^\d+]/g, "");
  if (/^0\d{9}$/.test(digits)) return `tel:+33${digits.slice(1)}`;
  if (/^\+\d{6,15}$/.test(digits)) return `tel:${digits}`;
  return ORIGINAL_TEL_HREF;
}

const PHONE_RE = new RegExp(
  `href="${ORIGINAL_TEL_HREF.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">${ORIGINAL_PHONE_DISPLAY.replace(/\./g, "\\.")}<`,
  "g",
);

// Le widget Facebook d'origine (plugin JS officiel) dépend du chargement du
// SDK Facebook au moment de la requête, avec des paramètres figés dans le
// dump (app_id, canal d'arbitrage) aujourd'hui périmés : en pratique en
// échec, affichant une icône « image cassée » à la place de la carte de
// page. Remplacé par la même carte via l'iframe officielle de Facebook
// (voir facebookEmbedHtml), sans SDK ni app_id. Ne capture que le widget
// lui-même (deux </div> : le sien puis celui du wrapper .custom qui, lui,
// reste en place).
const FACEBOOK_WIDGET_RE = /<div class="fb-page fb_iframe_widget"[\s\S]*?<\/iframe><\/span><\/div>/;

const LINKEDIN_URL_RE = new RegExp(ORIGINAL_LINKEDIN_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

// Barre « Partager » (en-tête, icônes Facebook/Twitter/LinkedIn/+) : script
// tiers AddToAny jamais chargé sur ce site (même logique que le SDK
// Facebook/reCAPTCHA — pas de dépendance externe non fiable). Sans lui, les
// trois premiers boutons pointent vers des ancres mortes (`href="/#facebook"`
// etc., jamais réécrites). On les remplace par de vrais liens de partage
// (ouverts dans un nouvel onglet, sans aucun script tiers), en réutilisant
// l'URL de la page déjà calculée pour le bouton « + » (seul fonctionnel
// à l'origine, via {{SHARE_HREF}} dans shell.mjs). Corrigé
// inconditionnellement (ne change rien à l'octet vérifié par
// extract-legacy.mjs, qui n'appelle jamais cette fonction — voir plus haut).
const SHARE_PAGE_URL_RE = /addtoany\.com\/share#url=([^&]+)&amp;title=/;
const SHARE_FACEBOOK_HREF_RE = /(class="a2a_button_facebook" href=")\/#facebook(")/;
const SHARE_TWITTER_HREF_RE = /(class="a2a_button_twitter" href=")\/#twitter(")/;
const SHARE_LINKEDIN_HREF_RE = /(class="a2a_button_linkedin" href=")\/#linkedin(")/;

// Bloc complet de la barre de partage (voir templates/header.html) : du
// conteneur bd-joomlaposition-37 jusqu'à ses 3 </div> de fermeture, juste
// après le </span> du kit d'icônes AddToAny.
const SHARE_BAR_RE =
  /<div class="bd-joomlaposition-37[\s\S]*?<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/;

function facebookEmbedHtml(url: string): string {
  // Véritable carte de la page Facebook (photo, nom, nombre d'abonnés,
  // boutons « Suivre la Page » / « Partager »), comme sur le site d'origine —
  // mais via le point d'entrée iframe OFFICIEL de Facebook
  // (plugins/page.php), qui ne dépend ni du SDK JavaScript, ni d'un app_id,
  // ni d'un script d'initialisation : c'étaient précisément ces dépendances
  // (figées dans le dump avec des paramètres périmés) qui cassaient le widget
  // d'origine. Mêmes options d'affichage que l'original (facepile, sans
  // couverture), largeur 340 pour tenir dans la colonne du pied de page.
  const src =
    "https://www.facebook.com/plugins/page.php?href=" +
    encodeURIComponent(url) +
    "&tabs=&width=340&height=130&small_header=false&adapt_container_width=true" +
    "&hide_cover=false&show_facepile=true&locale=fr_FR";
  // Div (bloc) > span (en ligne) > iframe : exactement la structure du widget
  // d'origine (voir FACEBOOK_WIDGET_RE ci-dessus). Un span est un élément EN
  // LIGNE, qui répond donc à la règle `text-align:center` déjà posée sur
  // l'ancêtre .bd-blockcontent par le gabarit d'origine — c'est ce mécanisme,
  // pas un centrage ajouté ici, qui centrait déjà le widget d'origine (visible
  // sur la toute première capture, image cassée mais bien centrée). Un simple
  // conteneur flex (essayé précédemment) est un élément de BLOC : il ignore ce
  // text-align hérité et ne se centre pas de la même façon.
  return (
    `<div style="text-align:center;">` +
    `<span style="display:inline-block;max-width:100%;">` +
    `<iframe src="${escapeHtml(src)}" width="340" height="130" ` +
    `style="border:none;overflow:hidden;max-width:100%;vertical-align:top;" scrolling="no" frameborder="0" ` +
    `allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ` +
    `title="Page Facebook de BOS &amp; BOP"></iframe>` +
    `</span>` +
    `</div>`
  );
}

export function applyWidgetCustomization(html: string, widgets: WidgetSettings): string {
  let out = html;

  if (widgets.phone.trim()) {
    const display = escapeHtml(widgets.phone.trim());
    const href = toTelHref(widgets.phone.trim());
    out = out.replace(PHONE_RE, `href="${href}">${display}<`);
  }

  if (widgets.facebookUrl.trim()) {
    out = out.replace(FACEBOOK_WIDGET_RE, facebookEmbedHtml(widgets.facebookUrl.trim()));
  }

  if (widgets.linkedinUrl.trim()) {
    out = out.replace(LINKEDIN_URL_RE, escapeHtml(widgets.linkedinUrl.trim()));
  }

  if (widgets.shareBarEnabled) {
    const pageUrlMatch = out.match(SHARE_PAGE_URL_RE);
    const pageUrl = pageUrlMatch ? decodeURIComponent(pageUrlMatch[1]) : "";

    // Pour chaque icône : lien personnalisé s'il est renseigné (ex. la page
    // Facebook de BOS & BOP), sinon partage de la page affichée (par défaut).
    const facebookHref =
      widgets.shareFacebookUrl.trim() ||
      (pageUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}` : "");
    const twitterHref =
      widgets.shareTwitterUrl.trim() ||
      (pageUrl ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}` : "");
    const linkedinHref =
      widgets.shareLinkedinUrl.trim() ||
      (pageUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}` : "");

    // Remplacement par fonction : évite toute interprétation des `$` qu'une URL
    // saisie pourrait contenir.
    if (facebookHref) {
      out = out.replace(SHARE_FACEBOOK_HREF_RE, (_m, p1, p2) => p1 + escapeHtml(facebookHref) + p2);
    }
    if (twitterHref) {
      out = out.replace(SHARE_TWITTER_HREF_RE, (_m, p1, p2) => p1 + escapeHtml(twitterHref) + p2);
    }
    if (linkedinHref) {
      out = out.replace(SHARE_LINKEDIN_HREF_RE, (_m, p1, p2) => p1 + escapeHtml(linkedinHref) + p2);
    }
  } else {
    out = out.replace(SHARE_BAR_RE, "");
  }

  return out;
}
