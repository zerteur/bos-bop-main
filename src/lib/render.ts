import type { Page } from "@prisma/client";
import { prisma } from "./db";
import { getTemplates, getHeadTemplate } from "./templates";
import { getSetting } from "./settings";
import {
  TITLE_SUFFIX,
  INNER_BODY_CLASS,
  HOME_BODY_CLASS,
  DEFAULT_SITE_URL,
} from "./constants";
// Module JavaScript partagé avec le script d'extraction/vérification
import { renderShell, escapeHtml } from "./shell.mjs";
import { editorScriptHtml } from "./editor-script";
import { ICON_FIX_STYLE } from "./icon-fix";
import { MENU_FIX_STYLE } from "./menu-fix";
import { applyShareCanonical } from "./share";
import { applyWidgetCustomization } from "./widgets";
import { applyContactRecaptcha, getRecaptchaSiteKey } from "./recaptcha";

export const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
} as const;

export type MenuEntry = {
  label: string;
  titleAttr: string;
  cssTag: string;
  url: string;
};

export async function getMenuEntries(): Promise<MenuEntry[]> {
  const items = await prisma.menuItem.findMany({
    orderBy: { position: "asc" },
    include: { page: true },
  });
  return items.map((item) => ({
    label: item.label,
    titleAttr: item.titleAttr,
    cssTag: item.cssTag || `item-${200 + item.id}`,
    url: item.page ? (item.page.slug === "" ? "/" : `/${item.page.slug}`) : item.url,
  }));
}

type ShellPage = {
  slug: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  bodyClass: string;
  headHtml: string;
  contentHtml: string;
  extraTail: string;
  breadcrumbLabel: string;
  sharePath: string;
};

// Correctifs ajoutés à chaque page, en plus du contenu propre à la page :
//  - gestionnaire de défilement du menu mobile (voir le fichier lui-même) ;
//    servi hors de /assets/ (non hashé) pour ne pas être mis en cache de
//    façon immuable ;
//  - remplacement de la police d'icônes manquante (voir icon-fix.ts) ;
//  - envoi en AJAX du formulaire de contact, validation native et anti-spam
//    (voir contact-form.js) : le mécanisme de soumission d'origine (iframe
//    cachée + réponse d'un backend Joomla absent de ce site) ne fonctionne
//    plus, d'où l'interception.
// Injectés en fin de document : n'affectent jamais le HTML vérifié à l'octet
// par extract-legacy.mjs (qui n'utilise jamais extraTail).
const SAFETY_SCRIPTS =
  '<script src="/js/scroll-manager.js" defer="defer"></script>' +
  '<script src="/js/contact-form.js" defer="defer"></script>' +
  ICON_FIX_STYLE +
  MENU_FIX_STYLE;

const HERO_TITLE_RE =
  /(<h1 class="bd-textblock-20 bd-content-element">)[\s\S]*?(<\/h1>)/;
const HERO_SLIDE_RE =
  /<div class="bd-slide-3 bd-textureoverlay bd-textureoverlay-2 bd-slide item active">/;

/**
 * Personnalise la bannière (hero) de la page d'accueil avec les réglages de
 * l'administration. Sans réglage renseigné, le HTML reste rigoureusement
 * identique à celui du site d'origine (voir /admin/accueil).
 */
export function applyHeroCustomization(
  contentHtml: string,
  hero: { title: string; imageUrl: string },
): string {
  let html = contentHtml;
  if (hero.title.trim()) {
    const titleHtml = hero.title
      .split(/\r?\n/)
      .map((line) => escapeHtml(line.trim()))
      .filter(Boolean)
      .join("<br/>");
    html = html.replace(HERO_TITLE_RE, `$1${titleHtml}$2`);
  }
  if (hero.imageUrl.trim()) {
    const style =
      `background-image:url('${hero.imageUrl.replaceAll("'", "%27")}');` +
      "background-repeat:no-repeat;background-position:center top;background-size:cover;";
    html = html.replace(HERO_SLIDE_RE, (match) => match.replace('active">', `active" style="${style}">`));
  }
  return html;
}

/** Assemble le document HTML complet d'une page (gabarit + contenu + menu). */
export async function renderDocument(page: ShellPage): Promise<string> {
  const menu = await getMenuEntries();
  const [
    siteUrl,
    phone,
    facebookUrl,
    linkedinUrl,
    shareBarEnabled,
    shareFacebookUrl,
    shareTwitterUrl,
    shareLinkedinUrl,
    recaptchaSiteKey,
    shopEnabled,
  ] = await Promise.all([
    getSetting("siteUrl", DEFAULT_SITE_URL),
    getSetting("widgetPhone", ""),
    getSetting("widgetFacebookUrl", ""),
    getSetting("widgetLinkedinUrl", ""),
    getSetting("widgetShareBarEnabled", "1"),
    getSetting("widgetShareFacebookUrl", ""),
    getSetting("widgetShareTwitterUrl", ""),
    getSetting("widgetShareLinkedinUrl", ""),
    getRecaptchaSiteKey(),
    getSetting("shopEnabled", "0"),
  ]);
  // Pastille « Mon panier » de l'en-tête (avec compteur d'articles) :
  // uniquement quand la boutique est activée — sinon rien n'est chargé et
  // l'apparence reste strictement celle du site d'origine.
  const cartWidget =
    shopEnabled === "1"
      ? '<script src="/js/cart-widget.js" defer="defer"></script>'
      : "";
  const html = renderShell(
    getTemplates(),
    { ...page, extraTail: page.extraTail + SAFETY_SCRIPTS + cartWidget },
    menu,
    { siteUrl },
  );
  // Fiabilise le partage social (URL canonique sans .html + balises Open
  // Graph). AVANT applyWidgetCustomization : les boutons Facebook/Twitter/
  // LinkedIn de l'en-tête reprennent l'URL de partage réécrite ici.
  const withShare = applyShareCanonical(html, {
    siteUrl,
    path: page.slug === "" ? "/" : `/${page.slug}`,
    title: page.title,
    description: page.metaDescription,
  });
  const withWidgets = applyWidgetCustomization(withShare, {
    phone,
    facebookUrl,
    linkedinUrl,
    shareBarEnabled: shareBarEnabled !== "0",
    shareFacebookUrl,
    shareTwitterUrl,
    shareLinkedinUrl,
  });
  // Remplace le reCAPTCHA invisible cassé d'origine (page de contact) par une
  // case reCAPTCHA v2 si des clés sont configurées ; sinon retire simplement le
  // widget cassé. No-op sur toutes les autres pages.
  return applyContactRecaptcha(withWidgets, recaptchaSiteKey);
}

/** Rendu d'une page stockée en base. */
export async function renderPage(
  page: Page,
  options: { injectFormMessage?: string } = {},
): Promise<string> {
  let contentHtml = page.contentHtml;
  if (page.slug === "") {
    const [heroTitle, heroImageUrl] = await Promise.all([
      getSetting("heroTitle", ""),
      getSetting("heroImageUrl", ""),
    ]);
    contentHtml = applyHeroCustomization(contentHtml, {
      title: heroTitle,
      imageUrl: heroImageUrl,
    });
  }
  if (options.injectFormMessage) {
    contentHtml = contentHtml.replace(
      '<div class="message-uniform"> </div>',
      `<div class="message-uniform">${options.injectFormMessage}</div>`,
    );
  }
  let tailHtml = page.extraTail || "";
  if (page.id !== 0) {
    tailHtml += `
<script>
  (function(){
    var start = Date.now();
    var isHuman = false;
    var trackHuman = function() { isHuman = true; };
    window.addEventListener('mousemove', trackHuman, {once:true});
    window.addEventListener('keydown', trackHuman, {once:true});
    window.addEventListener('scroll', trackHuman, {once:true});
    window.addEventListener('click', trackHuman, {once:true});
    window.addEventListener('touchstart', trackHuman, {once:true});
    
    window.addEventListener('beforeunload', function() {
      var duration = Math.round((Date.now() - start) / 1000);
      navigator.sendBeacon("/api/track", JSON.stringify({
        id: ${page.id},
        type: "page",
        duration: duration,
        isHuman: isHuman,
        path: window.location.pathname
      }));
    });
  })();
</script>`;
  }
  return renderDocument({
    slug: page.slug,
    title: page.title,
    metaDescription: page.metaDescription,
    metaKeywords: page.metaKeywords,
    bodyClass: page.bodyClass,
    headHtml: page.headHtml || getHeadTemplate(),
    contentHtml,
    extraTail: tailHtml,
    breadcrumbLabel: page.breadcrumbLabel,
    sharePath: page.sharePath || (page.slug === "" ? "/" : `/${page.slug}.html`),
  });
}

/**
 * Rendu d'une page "virtuelle" (boutique, 404…) : même habillage que le reste
 * du site, contenu généré par le code.
 */
export async function renderVirtualPage(options: {
  path: string; // ex. "livres" ou "panier"
  shortTitle: string;
  contentHtml: string;
  metaDescription?: string;
}): Promise<string> {
  return renderDocument({
    slug: options.path,
    title: options.shortTitle + TITLE_SUFFIX,
    metaDescription: options.metaDescription ?? "",
    metaKeywords: "",
    bodyClass: INNER_BODY_CLASS,
    headHtml: getHeadTemplate(),
    contentHtml: options.contentHtml,
    extraTail: "",
    breadcrumbLabel: options.shortTitle,
    sharePath: `/${options.path}`,
  });
}

/**
 * Rendu d'aperçu pour l'administration : contenu fourni (déjà compilé) rendu
 * dans l'habillage complet du site. Utilisé par l'aperçu en direct du
 * constructeur de pages — c'est exactement le même pipeline que la
 * publication, donc l'aperçu est fidèle (WYSIWYG).
 */
export async function renderPreview(options: {
  contentHtml: string;
  isHome: boolean;
  hero?: { title: string; imageUrl: string };
  /** Injecte le script d'édition sur canvas (studio). */
  editor?: boolean;
}): Promise<string> {
  let contentHtml = options.contentHtml;
  if (options.isHome && options.hero) {
    contentHtml = applyHeroCustomization(contentHtml, options.hero);
  }
  if (options.editor && !contentHtml.trim()) {
    contentHtml =
      '<div class="bd-ed-empty">Page vide — cliquez sur « Ajouter un bloc » pour commencer.</div>';
  }
  const extraTail = options.editor ? editorScriptHtml() : "";
  return renderDocument({
    slug: options.isHome ? "" : "apercu",
    title: "Aperçu" + TITLE_SUFFIX,
    metaDescription: "",
    metaKeywords: "",
    bodyClass: options.isHome ? HOME_BODY_CLASS : INNER_BODY_CLASS,
    headHtml: getHeadTemplate(),
    contentHtml,
    extraTail,
    breadcrumbLabel: "Aperçu",
    sharePath: "/apercu",
  });
}

/** Page 404 habillée comme le site. */
export async function renderNotFound(): Promise<Response> {
  const contentHtml = `
<section class="bd-section-17 bd-tagstyles" data-section-title="Section" id="section17">
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-joomlaposition-22 clearfix">
<div class="bd-block-79 bd-own-margins">
<div class="bd-blockcontent bd-tagstyles">
<div class="custom">
<h2>Page non trouvée</h2>
<p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
<p><a href="/" title="Retour à l'accueil"> <button>Retour à l'accueil</button> </a></p>
</div>
</div>
</div>
</div>
</div>
</section>
`;
  const html = await renderVirtualPage({
    path: "page-non-trouvee",
    shortTitle: "Page non trouvée",
    contentHtml,
  });
  return new Response(html, { status: 404, headers: HTML_HEADERS });
}

export { escapeHtml };
