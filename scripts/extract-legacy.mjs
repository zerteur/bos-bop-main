/**
 * Extraction du dump Joomla (dossier legacy/) vers :
 *  - templates/  : gabarits communs (header, footer, etc.) avec placeholders
 *  - content/    : contenu par page (HTML + métadonnées) utilisé par le seed
 *
 * Le script vérifie ensuite, octet par octet, que le ré-assemblage via
 * src/lib/shell.mjs reproduit exactement les pages d'origine (après
 * réécriture des liens et neutralisation des artefacts générés par
 * JavaScript au moment de la capture : widgets Facebook/reCAPTCHA/select2).
 *
 * Usage : npm run extract:legacy
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderShell } from "../src/lib/shell.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Lecture d'un fichier du dump, fins de ligne normalisées en LF
const legacy = (f) => readFileSync(join(root, "legacy", f), "utf-8").replaceAll("\r\n", "\n");
const out = (rel, content) => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log("  écrit :", rel);
};

const SITE_URL = "https://www.bos-bop.fr";

// Correspondance fichiers du dump -> URL propres du nouveau site
const PAGES = [
  { file: "index.html", slug: "" },
  { file: "bilan-orientation-scolaire-professionnel-toulouse_html.html", slug: "bilan-orientation-scolaire-professionnel-toulouse" },
  { file: "prestations-orientation-scolaire-professionnel-toulouse_html.html", slug: "prestations-orientation-scolaire-professionnel-toulouse" },
  { file: "recrutement_html.html", slug: "recrutement" },
  { file: "contact-orientation-scolaire-professionnel-toulouse_html.html", slug: "contact-orientation-scolaire-professionnel-toulouse" },
  { file: "contact-2_html.html", slug: "mentions-legales" },
];

const FILE_TO_PATH = {
  "index.html": "/",
  "page.html": "/",
};
for (const p of PAGES.slice(1)) FILE_TO_PATH[p.file] = `/${p.slug}`;

// ---------------------------------------------------------------------------
// Réécriture des liens (fichiers du dump -> URLs du nouveau site)
// ---------------------------------------------------------------------------

function rewriteLinks(doc) {
  // Formulaire de contact Joomla "Uniform" -> API interne
  doc = doc.replaceAll(
    'action="https://www.bos-bop.fr/index.php?option=com_uniform&amp;view=form&amp;task=form.save&amp;form_id=1"',
    'action="/api/contact"',
  );
  for (const [file, path] of Object.entries(FILE_TO_PATH)) {
    doc = doc.replaceAll(`href="${file}#`, `href="${path === "/" ? "/" : path}#`);
    doc = doc.replaceAll(`href="${file}"`, `href="${path}"`);
  }
  doc = doc.replaceAll('src="assets/', 'src="/assets/');
  doc = doc.replaceAll('href="assets/', 'href="/assets/');
  doc = doc.replaceAll('url("assets/', 'url("/assets/');
  doc = doc.replaceAll("url(assets/", "url(/assets/");
  return doc;
}

const decodeEntities = (s) =>
  s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

// ---------------------------------------------------------------------------
// Neutralisation des artefacts runtime capturés dans le dump
// (le dump a été pris après exécution du JavaScript : certains widgets ont
// injecté du DOM qui serait dupliqué si on le servait tel quel)
// ---------------------------------------------------------------------------

/** Renvoie [début, fin) d'un élément <div> équilibré commençant à startIdx. */
function balancedDiv(html, startIdx) {
  let depth = 0;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = startIdx;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return [startIdx, m.index + "</div>".length];
  }
  throw new Error("div non équilibrée");
}

/** Retire le conteneur select2 injecté par JS et restaure le <select> d'origine. */
function stripSelect2Runtime(html) {
  const i = html.indexOf('<div class="select2-container ');
  if (i === -1) return html;
  const [a, b] = balancedDiv(html, i);
  html = html.slice(0, a) + html.slice(b);
  return html.replace(
    '<select class="dropdown jsn-input-xlarge-fluid select2-offscreen" id="4-jsn-uf-form-field" name="4" style="position: absolute;" tabindex="-1">',
    '<select class="dropdown jsn-input-xlarge-fluid" id="4-jsn-uf-form-field" name="4">',
  );
}

/** Vide le conteneur reCAPTCHA (le badge sera régénéré par api.js). */
function stripRecaptchaRuntime(html) {
  const i = html.indexOf('<div class="g-invisible-recaptcha g-recaptcha"');
  if (i === -1) return html;
  const tagEnd = html.indexOf(">", i) + 1;
  const [a, b] = balancedDiv(html, i);
  const openTag = html.slice(i, tagEnd).replace(' recaptcha-widget-id="0"', "");
  return html.slice(0, a) + openTag + "</div>" + html.slice(b);
}

/** Retire la boîte de dialogue reCAPTCHA injectée en fin de <body>. */
function stripRecaptchaTail(html) {
  const i = html.indexOf('<div style="visibility: hidden; position: absolute; width: 100%; top: -10000px;');
  if (i === -1) return html;
  const [a, b] = balancedDiv(html, i);
  return html.slice(0, a) + html.slice(b);
}

const sanitizeContent = (html) => stripRecaptchaRuntime(stripSelect2Runtime(html));

// ---------------------------------------------------------------------------
// Découpage d'une page en segments
// ---------------------------------------------------------------------------

function splitPage(doc) {
  const seg = {};
  const headStart = doc.indexOf("<head>") + "<head>".length;
  seg.docStart = doc.slice(0, headStart);
  seg.head = doc.slice(headStart, doc.indexOf("</head>"));
  const bodyMatch = doc.match(/<body class="([^"]*)">/);
  seg.bodyClass = bodyMatch[1];
  const preStart = doc.indexOf(bodyMatch[0]) + bodyMatch[0].length;
  const headerStart = doc.indexOf("<header");
  seg.preBody = doc.slice(preStart, headerStart);
  const headerEnd = doc.indexOf("</header>") + "</header>".length;
  seg.header = doc.slice(headerStart, headerEnd);
  const footerStart = doc.indexOf('<div class="bd-stretchtobottom-1');
  seg.content = doc.slice(headerEnd, footerStart);
  const footerEnd = doc.indexOf("</footer></div>") + "</footer></div>".length;
  seg.footer = doc.slice(footerStart, footerEnd);
  const bodyEnd = doc.indexOf("</body></html>");
  if (bodyEnd === -1) throw new Error("fin de document introuvable");
  seg.tail = doc.slice(footerEnd, bodyEnd);
  return seg;
}

// ---------------------------------------------------------------------------
// Extraction des métadonnées d'une page
// ---------------------------------------------------------------------------

function extractMeta(seg) {
  const title = decodeEntities(seg.head.match(/<title>([\s\S]*?)<\/title>/)[1]);
  // [^"]* : la valeur d'un attribut ne peut pas contenir de guillemet,
  // ce qui empêche la regex de déborder sur les <meta> voisines.
  const desc = seg.head.match(/<meta content="([^"]*)" name="description"\/>/);
  const keys = seg.head.match(/<meta content="([^"]*)" name="keywords"\/>/);
  const bcActive = seg.footer.match(
    /<li class="active">\n<span class="bd-breadcrumbstext-3">\n<span>([\s\S]*?)<\/span>/,
  );
  const share = seg.header.match(
    /https:\/\/www\.addtoany\.com\/share#url=([^&"]*)&amp;title=/,
  );
  const sharePath = decodeURIComponent(share[1]).replace(SITE_URL, "") || "/";
  return {
    title,
    metaDescription: desc ? decodeEntities(desc[1]) : "",
    metaKeywords: keys ? decodeEntities(keys[1]) : "",
    breadcrumbLabel: bcActive ? decodeEntities(bcActive[1]) : "",
    sharePath,
  };
}

/** Remplace titre/métas par des placeholders dans le <head>. */
function templateizeHead(head) {
  head = head.replace(/<title>[\s\S]*?<\/title>/, "<title>{{TITLE}}</title>");
  head = head.replace(
    /<meta content="[^"]*" name="description"\/>/,
    '<meta content="{{META_DESCRIPTION}}" name="description"/>',
  );
  head = head.replace(
    /<meta content="[^"]*" name="keywords"\/>/,
    '<meta content="{{META_KEYWORDS}}" name="keywords"/>',
  );
  return head;
}

// ---------------------------------------------------------------------------
// Gabarits communs (extraits de la page "bilan", identiques partout)
// ---------------------------------------------------------------------------

function extractMenu(header) {
  const ul = header.match(/<ul class="bd-menu-13[^"]*">\n([\s\S]*?) <\/ul>/)[1];
  const re =
    /<li class="bd-menuitem-50 bd-toplevel-item (item-\d+)( current)?">\n<a( class="active")? href="([^"]*)"(?: title="([^"]*)")?><span>([\s\S]*?)<\/span><\/a><\/li>/g;
  const items = [];
  let m;
  while ((m = re.exec(ul))) {
    items.push({
      cssTag: m[1],
      url: m[4],
      titleAttr: m[5] ? decodeEntities(m[5]) : "",
      label: decodeEntities(m[6]),
    });
  }
  return items;
}

function templateizeHeader(header, pagePath) {
  // Menu -> placeholder
  header = header.replace(
    /(<ul class="bd-menu-13[^"]*">)\n[\s\S]*? <\/ul>/,
    "$1\n{{MENU_ITEMS}} </ul>",
  );
  // Lien de partage AddToAny -> placeholder
  header = header.replace(
    /href="https:\/\/www\.addtoany\.com\/share#url=[^"]*"/,
    'href="{{SHARE_HREF}}"',
  );
  // Liens vers la page courante (bouton menu mobile + icône de fermeture)
  header = header.replaceAll(`href="${pagePath}"`, 'href="{{PAGE_PATH}}"');
  return header;
}

function templateizeFooter(footer) {
  return footer.replace(/<ol class="breadcrumb">[\s\S]*?<\/ol>/, "{{BREADCRUMB}}");
}

function templateizeTail(tail, pagePath) {
  tail = tail.replaceAll(`href="${pagePath}#addtoany"`, 'href="{{PAGE_PATH}}#addtoany"');
  tail = tail.replaceAll(`href="${pagePath}"`, 'href="{{PAGE_PATH}}"');
  return tail + "{{EXTRA_TAIL}}";
}

function extractBreadcrumb(footer, label) {
  const ol = footer.match(/<ol class="breadcrumb">[\s\S]*?<\/ol>/)[0];
  // seul le libellé du dernier élément (li.active) devient un placeholder
  const escaped = label.replaceAll("&", "&amp;");
  const idx = ol.lastIndexOf(`<span>${escaped}</span>`);
  return ol.slice(0, idx) + "<span>{{LABEL}}</span>" + ol.slice(idx + `<span>${escaped}</span>`.length);
}

// ---------------------------------------------------------------------------
// Normalisation pour la vérification (artefacts runtime non déterministes)
// ---------------------------------------------------------------------------

// Le dump contient plusieurs copies d'un même fichier sous des noms hashés
// différents (une par page capturée). Deux références sont équivalentes si le
// contenu des fichiers est identique : on remplace le préfixe hashé par
// l'empreinte MD5 du contenu pour la comparaison.
const contentHashByFile = {};
for (const dir of ["css", "js", "images"]) {
  for (const f of readdirSync(join(root, "legacy", dir))) {
    if (f === "readme.md") continue;
    const md5 = createHash("md5").update(readFileSync(join(root, "legacy", dir, f))).digest("hex");
    contentHashByFile[`${dir}/${f}`] = md5.slice(0, 12);
  }
}

function normalizeAssetAliases(doc) {
  return doc.replace(
    /\/assets\/(css|js|images)\/([0-9a-f]{12}_[^"')\s]*)/g,
    (whole, dir, file) => {
      const md5 = contentHashByFile[`${dir}/${file}`];
      if (!md5) return whole; // fichier absent du dump (stubs) : inchangé
      return `/assets/${dir}/${md5}_${file.split("_").slice(1).join("_")}`;
    },
  );
}

function normalizeRuntime(doc) {
  return normalizeAssetAliases(stripHtmlStyle(doc))
    .replace(/<iframe allow="encrypted-media"[\s\S]*?<\/iframe>/g, "<FBIFRAME/>")
    .replace(/ fb-iframe-plugin-query="[^"]*"/g, "")
    .replace(/ name="f[0-9a-f]+"/g, "")
    .replace(/ style="min-height: \d+px;"/g, "");
}

// ---------------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------------

console.log("Extraction des gabarits et contenus depuis legacy/ ...");

const parsed = {};
for (const page of PAGES) {
  const doc = rewriteLinks(legacy(page.file));
  const seg = splitPage(doc);
  seg.content = sanitizeContent(seg.content);
  seg.tail = stripRecaptchaTail(seg.tail);
  parsed[page.slug] = { ...page, seg, meta: extractMeta(seg) };
}

// Cohérence des segments communs entre toutes les pages.
// L'attribut style de <html> est posé par JavaScript au chargement
// (ex : "height: auto;" sur l'accueil) : on le neutralise.
const stripHtmlStyle = (s) => s.replace(/(<html [^>]*style=")[^"]*(")/, "$1$2");
const ref = parsed["bilan-orientation-scolaire-professionnel-toulouse"];
for (const p of Object.values(parsed)) {
  if (stripHtmlStyle(p.seg.docStart) !== stripHtmlStyle(ref.seg.docStart))
    throw new Error(`docStart divergent: ${p.file}`);
  if (p.seg.preBody !== ref.seg.preBody) throw new Error(`preBody divergent: ${p.file}`);
}

// Gabarits communs
const refPath = "/bilan-orientation-scolaire-professionnel-toulouse";
out("templates/docstart.html", ref.seg.docStart);
out("templates/pre-body.html", ref.seg.preBody);
out("templates/header.html", templateizeHeader(ref.seg.header, refPath));
out("templates/footer.html", templateizeFooter(ref.seg.footer));
out("templates/tail.html", templateizeTail(ref.seg.tail, refPath));
out("templates/breadcrumb-home.html", extractBreadcrumb(parsed[""].seg.footer, parsed[""].meta.breadcrumbLabel));
out("templates/breadcrumb-inner.html", extractBreadcrumb(ref.seg.footer, ref.meta.breadcrumbLabel));
// Gabarit de <head> pour les futures pages créées dans l'admin
out("templates/head-new.html", templateizeHead(ref.seg.head));

// Menu principal (depuis la page d'accueil)
const menu = extractMenu(parsed[""].seg.header).map((item, i) => ({
  ...item,
  position: i + 1,
}));
out("content/menu.json", JSON.stringify(menu, null, 2) + "\n");

// Pages : head + contenu + métadonnées
const pagesMeta = [];
for (const p of Object.values(parsed)) {
  const name = p.slug === "" ? "accueil" : p.slug;
  out(`content/heads/${name}.html`, templateizeHead(p.seg.head));
  out(`content/pages/${name}.html`, p.seg.content);
  pagesMeta.push({
    slug: p.slug,
    name,
    ...p.meta,
    bodyClass: p.seg.bodyClass,
  });
}
out("content/pages.json", JSON.stringify(pagesMeta, null, 2) + "\n");

// ---------------------------------------------------------------------------
// Vérification : ré-assemblage et comparaison octet par octet
// ---------------------------------------------------------------------------

console.log("\nVérification du ré-assemblage ...");
const templates = {
  docStart: ref.seg.docStart,
  preBody: ref.seg.preBody,
  header: templateizeHeader(ref.seg.header, refPath),
  footer: templateizeFooter(ref.seg.footer),
  tail: templateizeTail(ref.seg.tail, refPath),
  breadcrumbHome: extractBreadcrumb(parsed[""].seg.footer, parsed[""].meta.breadcrumbLabel),
  breadcrumbInner: extractBreadcrumb(ref.seg.footer, ref.meta.breadcrumbLabel),
};

let failures = 0;
for (const p of Object.values(parsed)) {
  const rendered = renderShell(
    templates,
    {
      slug: p.slug,
      title: p.meta.title,
      metaDescription: p.meta.metaDescription,
      metaKeywords: p.meta.metaKeywords,
      bodyClass: p.seg.bodyClass,
      headHtml: templateizeHead(p.seg.head, p.meta),
      contentHtml: p.seg.content,
      extraTail: "",
      breadcrumbLabel: p.meta.breadcrumbLabel,
      sharePath: p.meta.sharePath,
    },
    menu,
    { siteUrl: SITE_URL },
  );
  // Référence : le document d'origine (liens réécrits, artefacts JS neutralisés)
  const seg = p.seg;
  const expected =
    seg.docStart + seg.head + `</head><body class="${seg.bodyClass}">` +
    seg.preBody + seg.header + seg.content + seg.footer + seg.tail +
    "</body></html>";
  const a = normalizeRuntime(rendered);
  const b = normalizeRuntime(expected);
  if (a === b) {
    console.log(`  ✔ ${p.file} : identique (${a.length} octets)`);
  } else {
    failures++;
    let i = 0;
    while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log(`  ✘ ${p.file} : divergence à l'octet ${i}`);
    console.log("    attendu :", JSON.stringify(b.slice(Math.max(0, i - 80), i + 120)));
    console.log("    obtenu  :", JSON.stringify(a.slice(Math.max(0, i - 80), i + 120)));
  }
}

if (failures) {
  console.error(`\n${failures} page(s) divergente(s)`);
  process.exit(1);
}
console.log("\nExtraction et vérification terminées avec succès.");
