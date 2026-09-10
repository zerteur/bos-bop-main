/**
 * Assemblage des pages publiques.
 *
 * Le HTML est reconstruit à l'octet près à partir des gabarits extraits du
 * site Joomla d'origine (voir scripts/extract-legacy.mjs). Ce module est
 * volontairement en JavaScript pur : il est partagé entre l'application
 * Next.js et le script d'extraction/vérification.
 */

/** Échappe une valeur texte pour insertion dans du HTML (même encodage que Joomla). */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Construit la liste <li> du menu principal, à l'identique du balisage Joomla.
 * @param {Array<{label:string,titleAttr:string,url:string,cssTag:string}>} items
 * @param {string} currentPath chemin de la page courante (ex. "/recrutement")
 */
export function buildMenuItems(items, currentPath) {
  return items
    .map((item) => {
      const isCurrent = item.url === currentPath;
      const liClass = `bd-menuitem-50 bd-toplevel-item ${item.cssTag}${isCurrent ? " current" : ""}`;
      const aClass = isCurrent ? ' class="active"' : "";
      const title = item.titleAttr ? ` title="${escapeHtml(item.titleAttr)}"` : "";
      return `<li class="${liClass}">\n<a${aClass} href="${item.url}"${title}><span>${escapeHtml(item.label)}</span></a></li>`;
    })
    .join("\n");
}

/**
 * Construit le fil d'Ariane (breadcrumb) du pied de page.
 */
export function buildBreadcrumb(templates, page) {
  const tpl = page.slug === "" ? templates.breadcrumbHome : templates.breadcrumbInner;
  return tpl.replaceAll("{{LABEL}}", escapeHtml(page.breadcrumbLabel));
}

/**
 * Assemble le document HTML complet d'une page.
 *
 * @param {object} templates gabarits chargés depuis templates/ :
 *   { docStart, preBody, header, footer, tail, breadcrumbHome, breadcrumbInner }
 * @param {object} page données de la page :
 *   { slug, title, metaDescription, metaKeywords, bodyClass, headHtml,
 *     contentHtml, extraTail, breadcrumbLabel, sharePath }
 * @param {Array} menuItems éléments du menu principal
 * @param {object} options { siteUrl }
 */
export function renderShell(templates, page, menuItems, options) {
  const path = page.slug === "" ? "/" : `/${page.slug}`;
  const shareUrl = (options.siteUrl || "") + (page.sharePath || path);
  const shareHref = `https://www.addtoany.com/share#url=${encodeURIComponent(shareUrl)}&amp;title=${encodeURIComponent(page.title)}`;

  const head = page.headHtml
    .replaceAll("{{TITLE}}", escapeHtml(page.title))
    .replaceAll("{{META_DESCRIPTION}}", escapeHtml(page.metaDescription))
    .replaceAll("{{META_KEYWORDS}}", escapeHtml(page.metaKeywords));

  const header = templates.header
    .replaceAll("{{PAGE_PATH}}", path)
    .replaceAll("{{SHARE_HREF}}", shareHref)
    .replaceAll("{{MENU_ITEMS}}", buildMenuItems(menuItems, path));

  const footer = templates.footer.replaceAll(
    "{{BREADCRUMB}}",
    buildBreadcrumb(templates, page),
  );

  const tail = templates.tail
    .replaceAll("{{PAGE_PATH}}", path)
    .replaceAll("{{EXTRA_TAIL}}", page.extraTail || "");

  return (
    templates.docStart +
    head +
    `</head><body class="${page.bodyClass}">` +
    templates.preBody +
    header +
    page.contentHtml +
    footer +
    tail +
    "</body></html>"
  );
}
