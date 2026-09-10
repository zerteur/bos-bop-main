// Constructeur de pages « à la Wix ».
//
// Chaque bloc est compilé vers une « bande » (section) HTML autonome, en
// réutilisant les classes CSS du template d'origine (typographie, grille
// Bootstrap, cartes .bloc-x/.titre-bloc, boutons, bannière .bd-textblock-20).
// Les blocs s'empilent verticalement, comme des sections Wix.
//
// Le bloc « HTML brut » émet son contenu tel quel (sans habillage) : c'est ce
// qui permet d'ouvrir une page du site d'origine dans le constructeur sans en
// modifier le rendu (le contenu historique devient un unique bloc HTML).

import { escapeHtml } from "./shell.mjs";

export type TextAlign = "left" | "center" | "right";

export type Block =
  | { type: "hero"; title: string; subtitle: string; imageUrl: string; buttonLabel: string; buttonUrl: string }
  | { type: "richtext"; heading: string; headingLevel: "h2" | "h3"; body: string; align: TextAlign }
  | { type: "columns"; count: number; columns: { heading: string; body: string }[] }
  | { type: "cards"; heading: string; intro: string; cards: { title: string; body: string }[] }
  | { type: "imageText"; imageUrl: string; imagePosition: "left" | "right"; heading: string; body: string; buttonLabel: string; buttonUrl: string }
  | { type: "image"; url: string; alt: string; width: string; align: TextAlign }
  | { type: "cta"; heading: string; body: string; buttonLabel: string; buttonUrl: string }
  | { type: "button"; label: string; url: string; newTab: boolean; align: TextAlign }
  | { type: "spacer"; size: "petit" | "moyen" | "grand" }
  | { type: "separator" }
  | { type: "html"; html: string };

export type BlockType = Block["type"];

// ---------------------------------------------------------------------------
// Métadonnées des blocs (utilisées par l'interface d'administration)
// ---------------------------------------------------------------------------

export type BlockDefinition = {
  type: BlockType;
  label: string;
  icon: string; // emoji
  group: "Texte" | "Média" | "Mise en page" | "Avancé";
  description: string;
  create: () => Block;
};

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "hero",
    label: "Bannière",
    icon: "🖼️",
    group: "Texte",
    description: "Grand bandeau avec titre et image de fond",
    create: () => ({ type: "hero", title: "Votre titre accrocheur", subtitle: "", imageUrl: "", buttonLabel: "", buttonUrl: "" }),
  },
  {
    type: "richtext",
    label: "Titre + texte",
    icon: "✍️",
    group: "Texte",
    description: "Un titre et des paragraphes",
    create: () => ({ type: "richtext", heading: "Un titre", headingLevel: "h2", body: "Votre texte ici.", align: "left" }),
  },
  {
    type: "cta",
    label: "Appel à l'action",
    icon: "📣",
    group: "Texte",
    description: "Bande colorée avec un bouton",
    create: () => ({ type: "cta", heading: "Prêt à commencer ?", body: "Contactez-nous dès aujourd'hui.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" }),
  },
  {
    type: "button",
    label: "Bouton",
    icon: "🔘",
    group: "Texte",
    description: "Un bouton cliquable",
    create: () => ({ type: "button", label: "En savoir plus", url: "", newTab: false, align: "left" }),
  },
  {
    type: "image",
    label: "Image",
    icon: "🖼️",
    group: "Média",
    description: "Une image seule",
    create: () => ({ type: "image", url: "", alt: "", width: "100", align: "center" }),
  },
  {
    type: "imageText",
    label: "Image + texte",
    icon: "🧩",
    group: "Média",
    description: "Une image à côté d'un texte",
    create: () => ({ type: "imageText", imageUrl: "", imagePosition: "left", heading: "Un titre", body: "Votre texte ici.", buttonLabel: "", buttonUrl: "" }),
  },
  {
    type: "columns",
    label: "Colonnes",
    icon: "🗂️",
    group: "Mise en page",
    description: "2, 3 ou 4 colonnes de texte",
    create: () => ({
      type: "columns",
      count: 2,
      columns: [
        { heading: "", body: "Première colonne." },
        { heading: "", body: "Deuxième colonne." },
      ],
    }),
  },
  {
    type: "cards",
    label: "Cartes",
    icon: "🎴",
    group: "Mise en page",
    description: "Rangée de cartes colorées (style « méthode 360° »)",
    create: () => ({
      type: "cards",
      heading: "Nos atouts",
      intro: "",
      cards: [
        { title: "Atout 1", body: "Description du premier atout." },
        { title: "Atout 2", body: "Description du deuxième atout." },
        { title: "Atout 3", body: "Description du troisième atout." },
      ],
    }),
  },
  {
    type: "spacer",
    label: "Espacement",
    icon: "↕️",
    group: "Mise en page",
    description: "Un espace vertical",
    create: () => ({ type: "spacer", size: "moyen" }),
  },
  {
    type: "separator",
    label: "Séparateur",
    icon: "➖",
    group: "Mise en page",
    description: "Une ligne horizontale",
    create: () => ({ type: "separator" }),
  },
  {
    type: "html",
    label: "HTML avancé",
    icon: "🧾",
    group: "Avancé",
    description: "Code HTML libre (utilisateurs avancés)",
    create: () => ({ type: "html", html: "<p>Votre HTML ici.</p>" }),
  },
];

export const BLOCK_DEFINITION_BY_TYPE: Record<BlockType, BlockDefinition> =
  Object.fromEntries(BLOCK_DEFINITIONS.map((d) => [d.type, d])) as Record<BlockType, BlockDefinition>;

export function createBlock(type: BlockType): Block {
  return BLOCK_DEFINITION_BY_TYPE[type].create();
}

// ---------------------------------------------------------------------------
// Conversion texte -> HTML (saisie conviviale)
// ---------------------------------------------------------------------------

/**
 * Texte saisi par l'utilisateur -> HTML.
 * Si la saisie contient déjà des balises, elle est utilisée telle quelle ;
 * sinon chaque ligne non vide devient un paragraphe (listes : lignes "- ").
 */
export function textToHtml(input: string): string {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") return "";
  if (trimmed.includes("<")) return trimmed;

  const out: string[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      out.push(`<ul>\n${listItems.map((li) => `<li>${li}</li>`).join("\n")}\n</ul>`);
      listItems = [];
    }
  };
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      listItems.push(escapeHtml(line.slice(2)));
    } else {
      flushList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  flushList();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Compilation des blocs -> HTML (mêmes classes que le site d'origine)
// ---------------------------------------------------------------------------

const SPACER_SIZES: Record<string, string> = { petit: "20px", moyen: "48px", grand: "96px" };

// Options de compilation. En mode "editable" (éditeur sur canvas), chaque bloc
// reçoit un attribut data-bd-block et chaque champ texte devient éditable
// (contenteditable + data-bd-field="<chemin>"). En publication, aucune de ces
// annotations n'est émise : le HXTML publié reste identique.
export type CompileOptions = { editable?: boolean; blockIndex?: number };

/** Attributs d'édition d'un champ texte (contenteditable + chemin). */
function fieldAttr(opts: CompileOptions, path: string): string {
  return opts.editable ? ` contenteditable="true" data-bd-field="${path}"` : "";
}

/** Attribut de repérage d'un bloc dans l'éditeur. */
function blockAttr(opts: CompileOptions): string {
  return opts.editable ? ` data-bd-block="${opts.blockIndex}"` : "";
}

function button(
  label: string,
  url: string,
  newTab = false,
  opts: CompileOptions = {},
  path?: string,
): string {
  if (!label.trim()) return "";
  const target = newTab ? ' target="_blank"' : "";
  const href = url.trim() || "#";
  const ed = path ? fieldAttr(opts, path) : "";
  return `<a href="${escapeHtml(href)}"${target} title="${escapeHtml(label)}"> <button${ed}>${escapeHtml(label)}</button> </a>`;
}

/**
 * Bande de contenu générique du site (structure des pages intérieures du
 * template d'origine). Partagée entre le compilateur de blocs et les vues
 * boutique pour n'avoir qu'une seule définition de ce balisage.
 */
export function sectionShell(
  inner: string,
  opts: { id: string; sectionClass?: string; sectionStyle?: string; extraAttrs?: string } = { id: "section17" },
): string {
  const cls = opts.sectionClass ? ` ${opts.sectionClass}` : "";
  const style = opts.sectionStyle ? ` style="${opts.sectionStyle}"` : "";
  return `<section class="bd-section-17 bd-tagstyles${cls}" data-section-title="Section" id="${opts.id}"${style}${opts.extraAttrs ?? ""}>
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-joomlaposition-22 clearfix">
<div class="bd-block-79 bd-own-margins">
<div class="bd-blockcontent bd-tagstyles bd-custom-bulletlist">
<div class="custom">
${inner}
</div>
</div>
</div>
</div>
</div>
</section>`;
}

/** Bande de contenu d'un bloc du constructeur. */
function contentSection(
  inner: string,
  opts: CompileOptions,
  extra: { sectionStyle?: string; sectionClass?: string } = {},
): string {
  return sectionShell(inner, {
    id: `bd-block-${opts.blockIndex ?? 0}`,
    sectionClass: extra.sectionClass,
    sectionStyle: extra.sectionStyle,
    extraAttrs: blockAttr(opts),
  });
}

function compileHero(block: Extract<Block, { type: "hero" }>, opts: CompileOptions): string {
  const index = opts.blockIndex ?? 0;
  // background-attachment:scroll (et non "fixed", hérité de .bd-slide-3) :
  // le fond couvre alors toute la hauteur du bloc, sans artefact d'affichage.
  const bg = block.imageUrl.trim()
    ? `background-image:url('${block.imageUrl.replaceAll("'", "%27")}');background-repeat:no-repeat;background-position:center;background-size:cover;background-attachment:scroll;`
    : "background-image:linear-gradient(135deg,#223352,#33486d);background-attachment:scroll;";
  const titleHtml = (block.title || "")
    .split(/\r?\n/)
    .map((l) => escapeHtml(l.trim()))
    .filter(Boolean)
    .join("<br/>");
  // En édition, le titre est éditable ligne par ligne : on édite un conteneur
  // et le parent reconstruit le texte (les <br/> deviennent des retours ligne).
  const titleInner = opts.editable
    ? escapeHtml(block.title || "").replaceAll("\n", "<br/>")
    : titleHtml;
  const subtitle =
    block.subtitle.trim() || opts.editable
      ? `<p class="bd-content-element" style="color:#fff;font-size:20px;margin-top:16px;"${fieldAttr(opts, "subtitle")}>${escapeHtml(block.subtitle)}</p>`
      : "";
  const btn = button(block.buttonLabel, block.buttonUrl, false, opts, "buttonLabel");
  const btnHtml = btn ? `<p style="margin-top:20px;">${btn}</p>` : "";
  return `<section class="bd-section-18 bd-page-width bd-tagstyles" data-section-title="Section" id="bd-hero-${index}"${blockAttr(opts)}>
<div class="bd-container-inner bd-margins clearfix">
<div class="bd-slider-7 bd-page-width bd-slider bd-no-margins carousel slide bd-carousel-fade" id="bd-hero-carousel-${index}">
<div class="bd-container-inner">
<div class="bd-slides carousel-inner">
<div class="bd-slide-3 bd-textureoverlay bd-textureoverlay-2 bd-slide item active" style="${bg}">
<div class="bd-container-inner">
<div class="bd-container-inner-wrapper">
<div class="bd-layoutbox-6 bd-no-margins clearfix">
<div class="bd-container-inner">
<div class="bd-layoutbox-7 bd-no-margins clearfix">
<div class="bd-container-inner">
<h1 class="bd-textblock-20 bd-content-element"${fieldAttr(opts, "title")}>${titleInner}</h1>
${subtitle}
${btnHtml}
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>`;
}

function compileBlock(block: Block, opts: CompileOptions): string {
  // En édition, on affiche un texte de remplacement pour un champ vide, afin
  // que la zone reste cliquable/éditable dans le canvas.
  const ph = (value: string, placeholder: string) =>
    opts.editable && !value.trim() ? placeholder : value;

  switch (block.type) {
    case "hero":
      return compileHero(block, opts);

    case "richtext": {
      const tag = block.headingLevel === "h3" ? "h3" : "h2";
      const headingText = ph(block.heading, "Titre");
      const heading =
        headingText.trim() || opts.editable
          ? `<${tag}${fieldAttr(opts, "heading")}>${escapeHtml(headingText)}</${tag}>`
          : "";
      const align = block.align !== "left" ? ` style="text-align:${block.align};"` : "";
      const body = `<div${fieldAttr(opts, "body")}>\n${textToHtml(ph(block.body, "Votre texte…"))}\n</div>`;
      return contentSection(`<div${align}>\n${heading}\n${body}\n</div>`, opts);
    }

    case "columns": {
      const count = Math.min(Math.max(block.count || 2, 2), 4);
      const span = { 2: 6, 3: 4, 4: 3 }[count] ?? 6;
      const cols = block.columns
        .slice(0, count)
        .map((col, i) => {
          const headingText = ph(col.heading, "Titre");
          const heading =
            headingText.trim() || opts.editable
              ? `<h3${fieldAttr(opts, `columns.${i}.heading`)}>${escapeHtml(headingText)}</h3>`
              : "";
          return `<div class="col-sm-${span}">\n${heading}\n<div${fieldAttr(opts, `columns.${i}.body`)}>\n${textToHtml(ph(col.body, "Votre texte…"))}\n</div>\n</div>`;
        })
        .join("\n");
      return contentSection(`<div class="row">\n${cols}\n</div>`, opts);
    }

    case "cards": {
      const headingText = ph(block.heading, "Titre de la section");
      const heading =
        headingText.trim() || opts.editable
          ? `<h2${fieldAttr(opts, "heading")}>${escapeHtml(headingText)}</h2>`
          : "";
      const intro =
        block.intro.trim() || opts.editable
          ? `<div${fieldAttr(opts, "intro")}>${textToHtml(block.intro)}</div>`
          : "";
      const count = block.cards.length || 1;
      const span = count >= 4 ? 3 : count === 3 ? 4 : count === 2 ? 6 : 12;
      const cards = block.cards
        .map((card, i) => {
          const cls = `bloc-${(i % 4) + 1}`;
          const title = `<p class="titre-bloc"${fieldAttr(opts, `cards.${i}.title`)}>${escapeHtml(ph(card.title, "Titre"))}</p>`;
          return `<div class="col-sm-${span}">
<div class="${cls}" style="height:auto;">
${title}
<div${fieldAttr(opts, `cards.${i}.body`)}>${textToHtml(ph(card.body, "Texte…"))}</div>
</div>
</div>`;
        })
        .join("\n");
      return contentSection(`${heading}\n${intro}\n<div class="row">\n${cards}\n</div>`, opts);
    }

    case "imageText": {
      const img = block.imageUrl.trim()
        ? `<img alt="${escapeHtml(block.heading)}" src="${escapeHtml(block.imageUrl)}" style="max-width:100%;height:auto;"/>`
        : '<div style="background:#eef0f5;border-radius:6px;height:220px;"></div>';
      const heading = `<h2${fieldAttr(opts, "heading")}>${escapeHtml(ph(block.heading, "Titre"))}</h2>`;
      const btn = button(block.buttonLabel, block.buttonUrl, false, opts, "buttonLabel");
      const textCol = `<div class="col-sm-6">\n${heading}\n<div${fieldAttr(opts, "body")}>\n${textToHtml(ph(block.body, "Votre texte…"))}\n</div>\n${btn ? `<p>${btn}</p>` : ""}\n</div>`;
      const imgCol = `<div class="col-sm-6">\n<p>${img}</p>\n</div>`;
      const inner = block.imagePosition === "right" ? textCol + "\n" + imgCol : imgCol + "\n" + textCol;
      return contentSection(`<div class="row bd-row-flex bd-row-align-middle">\n${inner}\n</div>`, opts);
    }

    case "image": {
      if (!block.url.trim()) {
        // Sur le site publié, un bloc image vide n'affiche rien.
        if (!opts.editable) return "";
        return contentSection(
          '<p style="text-align:center;color:#9aa1b5;"><em>Cliquez pour choisir une image (panneau de droite).</em></p>',
          opts,
        );
      }
      const width = /^\d{1,3}$/.test(block.width) ? `${block.width}%` : "100%";
      return contentSection(
        `<p style="text-align:${block.align};"><img alt="${escapeHtml(block.alt)}" src="${escapeHtml(block.url)}" style="max-width:${width};height:auto;"/></p>`,
        opts,
      );
    }

    case "cta": {
      const heading = `<h2 style="color:#dec076;"${fieldAttr(opts, "heading")}>${escapeHtml(ph(block.heading, "Titre"))}</h2>`;
      const body = `<p style="color:#fff;"${fieldAttr(opts, "body")}>${escapeHtml(ph(block.body, "Votre texte…"))}</p>`;
      const btn = button(block.buttonLabel, block.buttonUrl, false, opts, "buttonLabel");
      const inner = `<div style="text-align:center;padding:20px 0;">\n${heading}\n${body}\n${btn ? `<p style="margin-top:16px;">${btn}</p>` : ""}\n</div>`;
      return contentSection(inner, opts, { sectionStyle: "background-color:#223352;" });
    }

    case "button": {
      const btn = button(ph(block.label, "Bouton"), block.url, block.newTab, opts, "label");
      return contentSection(`<p style="text-align:${block.align};">${btn}</p>`, opts);
    }

    case "spacer":
      return `<div style="height:${SPACER_SIZES[block.size] ?? "48px"};"${blockAttr(opts)} aria-hidden="true"></div>`;

    case "separator":
      return contentSection('<hr style="border:none;border-top:1px solid #d9dce3;"/>', opts);

    case "html":
      // Publication : émis verbatim (préserve à l'identique les pages d'origine).
      // Édition : enveloppé pour être sélectionnable dans le canvas.
      if (opts.editable) {
        return `<div${blockAttr(opts)} class="bd-html-block">${block.html ?? ""}</div>`;
      }
      return block.html ?? "";

    default:
      return "";
  }
}

/** Compile la liste de blocs vers le contenu principal d'une page (publication). */
export function compileBlocks(blocks: Block[]): string {
  return blocks
    .map((block, index) => compileBlock(block, { blockIndex: index + 1 }))
    .filter((html) => html.trim() !== "")
    .join("\n");
}

/** Compile la liste de blocs pour l'éditeur (avec annotations d'édition). */
export function compileBlocksEditable(blocks: Block[]): string {
  return blocks
    .map((block, index) => compileBlock(block, { editable: true, blockIndex: index }))
    .join("\n");
}

export function parseBlocksJson(json: string): Block[] {
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (b): b is Block => b && typeof b === "object" && typeof b.type === "string",
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Modèles de pages prêts à l'emploi (« création ludique et rapide »)
// ---------------------------------------------------------------------------

export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string;
  blocks: () => Block[];
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "vierge",
    label: "Page vierge",
    description: "Un simple titre et du texte, à compléter librement.",
    icon: "📄",
    blocks: () => [
      { type: "richtext", heading: "Titre de la page", headingLevel: "h2", body: "Votre contenu ici.", align: "left" },
    ],
  },
  {
    id: "presentation",
    label: "Présentation",
    description: "Bannière, texte de présentation, atouts et appel à l'action.",
    icon: "🏳️",
    blocks: () => [
      { type: "hero", title: "Bienvenue chez BOS & BOP", subtitle: "", imageUrl: "", buttonLabel: "", buttonUrl: "" },
      { type: "richtext", heading: "Qui sommes-nous ?", headingLevel: "h2", body: "Présentez votre activité en quelques lignes.", align: "left" },
      {
        type: "cards",
        heading: "Nos atouts",
        intro: "",
        cards: [
          { title: "Écoute", body: "Un accompagnement personnalisé." },
          { title: "Expertise", body: "Des méthodes éprouvées." },
          { title: "Résultats", body: "Des objectifs concrets." },
        ],
      },
      { type: "cta", heading: "Envie d'en savoir plus ?", body: "Contactez-nous dès aujourd'hui.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
  {
    id: "service",
    label: "Prestation / service",
    description: "Présentation d'une prestation avec image, détails et contact.",
    icon: "🧭",
    blocks: () => [
      { type: "richtext", heading: "Notre prestation", headingLevel: "h2", body: "Décrivez la prestation en quelques phrases.", align: "left" },
      { type: "imageText", imageUrl: "", imagePosition: "left", heading: "Comment ça se passe", body: "Expliquez le déroulé étape par étape.", buttonLabel: "", buttonUrl: "" },
      {
        type: "columns",
        count: 3,
        columns: [
          { heading: "Étape 1", body: "Première étape." },
          { heading: "Étape 2", body: "Deuxième étape." },
          { heading: "Étape 3", body: "Troisième étape." },
        ],
      },
      { type: "cta", heading: "Intéressé(e) ?", body: "Prenons rendez-vous.", buttonLabel: "Prendre rendez-vous", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
  {
    id: "landing",
    label: "Page d'atterrissage",
    description: "Une page marketing complète, prête à convertir.",
    icon: "🚀",
    blocks: () => [
      { type: "hero", title: "Une accroche qui donne envie", subtitle: "Un sous-titre pour préciser votre promesse.", imageUrl: "", buttonLabel: "Je me lance", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
      { type: "richtext", heading: "Le problème que nous résolvons", headingLevel: "h2", body: "Décrivez le besoin auquel vous répondez.", align: "center" },
      {
        type: "cards",
        heading: "Ce que vous obtenez",
        intro: "",
        cards: [
          { title: "Bénéfice 1", body: "Description." },
          { title: "Bénéfice 2", body: "Description." },
          { title: "Bénéfice 3", body: "Description." },
        ],
      },
      { type: "imageText", imageUrl: "", imagePosition: "right", heading: "Ils nous font confiance", body: "Ajoutez un témoignage ou une preuve sociale.", buttonLabel: "", buttonUrl: "" },
      { type: "cta", heading: "Prêt(e) à démarrer ?", body: "Ne perdez plus de temps.", buttonLabel: "Nous contacter", buttonUrl: "/contact-orientation-scolaire-professionnel-toulouse" },
    ],
  },
];

export const PAGE_TEMPLATE_BY_ID: Record<string, PageTemplate> = Object.fromEntries(
  PAGE_TEMPLATES.map((t) => [t.id, t]),
);
