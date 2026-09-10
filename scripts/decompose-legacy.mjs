/**
 * Découpe le contenu HTML des pages migrées (content/pages/*.html) en une
 * suite de blocs « HTML avancé », un par bande de premier niveau (section,
 * div…). Chaque page devient ainsi une page « en blocs » — manipulable dans
 * le studio (déplacer, dupliquer, insérer, supprimer, réordonner) — tout en
 * restant STRICTEMENT identique : le ré-assemblage est vérifié octet par
 * octet (compileBlocks(blocs) === contenu d'origine).
 *
 * Résultat écrit dans content/blocks/<nom>.json (utilisé par le seed).
 *
 * Usage : node scripts/decompose-legacy.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = join(root, "content", "pages");
const outDir = join(root, "content", "blocks");

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Positions (index de caractère) où débute un élément de premier niveau. */
function topLevelStarts(html) {
  const starts = [];
  let depth = 0;
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] !== "<") { i++; continue; }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const m = /^<\/?([a-zA-Z0-9]+)/.exec(html.slice(i, i + 40));
    if (!m) { i++; continue; }
    const isClose = html[i + 1] === "/";
    const tag = m[1].toLowerCase();
    const gt = html.indexOf(">", i);
    if (gt === -1) break;
    const tagText = html.slice(i, gt + 1);
    const selfClosing = tagText.endsWith("/>");

    if (isClose) {
      depth = Math.max(0, depth - 1);
      i = gt + 1;
      continue;
    }
    if (depth === 0) starts.push(i);
    if (tag === "script" || tag === "style") {
      // ignorer le contenu (peut contenir des « < » qui ne sont pas des balises)
      const closeIdx = html.indexOf("</" + tag, gt + 1);
      if (closeIdx === -1) { i = n; break; }
      i = html.indexOf(">", closeIdx);
      i = i === -1 ? n : i + 1;
    } else if (selfClosing || VOID.has(tag)) {
      i = gt + 1;
    } else {
      depth++;
      i = gt + 1;
    }
  }
  return starts;
}

/** Découpe le contenu en blocs HTML (un par bande de premier niveau). */
function decompose(content) {
  const lines = content.split("\n");
  // index de caractère -> index de ligne
  const lineOfChar = [];
  let acc = 0;
  for (let l = 0; l < lines.length; l++) {
    for (let k = 0; k <= lines[l].length; k++) lineOfChar[acc + k] = l;
    acc += lines[l].length + 1; // +1 pour le "\n"
  }

  const starts = topLevelStarts(content);
  // lignes de début de bloc : la première ligne, puis la ligne de chaque
  // élément de premier niveau suivant (dédupliquées, ordonnées).
  const startLines = [0];
  for (const pos of starts) {
    const ln = lineOfChar[pos] ?? 0;
    if (ln > startLines[startLines.length - 1]) startLines.push(ln);
  }

  // Groupes de lignes contigus : groups.join("\n") === content (invariant).
  const groups = [];
  for (let s = 0; s < startLines.length; s++) {
    const from = startLines[s];
    const to = s + 1 < startLines.length ? startLines[s + 1] : lines.length;
    groups.push(lines.slice(from, to).join("\n"));
  }

  // Fusionner les groupes vides (uniquement des espaces) dans un voisin, avec
  // le séparateur "\n" exact — l'invariant de ré-assemblage est préservé.
  const merged = [];
  for (const g of groups) {
    if (g.trim() === "" && merged.length > 0) {
      merged[merged.length - 1] += "\n" + g;
    } else {
      merged.push(g);
    }
  }
  // Si le premier groupe est vide (blancs de tête), le préfixer au suivant.
  while (merged.length > 1 && merged[0].trim() === "") {
    merged[1] = merged[0] + "\n" + merged[1];
    merged.shift();
  }

  return merged.map((html) => ({ type: "html", html }));
}

// compileBlocks pour des blocs HTML (identique au comportement de src/lib/blocks.ts)
function compileHtmlBlocks(blocks) {
  return blocks
    .map((b) => b.html ?? "")
    .filter((h) => h.trim() !== "")
    .join("\n");
}

mkdirSync(outDir, { recursive: true });
let failures = 0;
for (const file of readdirSync(pagesDir)) {
  if (!file.endsWith(".html")) continue;
  const name = file.replace(/\.html$/, "");
  const content = readFileSync(join(pagesDir, file), "utf-8");
  let blocks = decompose(content);
  // Vérification : ré-assemblage strictement identique.
  if (compileHtmlBlocks(blocks) !== content) {
    // Repli sûr : un unique bloc HTML (toujours fidèle).
    blocks = [{ type: "html", html: content }];
  }
  const ok = compileHtmlBlocks(blocks) === content;
  if (!ok) failures++;
  writeFileSync(join(outDir, name + ".json"), JSON.stringify(blocks, null, 2) + "\n");
  console.log(`  ${ok ? "✔" : "✘"} ${name} : ${blocks.length} bloc(s)${ok ? "" : " — DIVERGENCE"}`);
}

if (failures) { console.error(`\n${failures} page(s) non fidèle(s)`); process.exit(1); }
console.log("\nDécoupage en blocs terminé (ré-assemblage fidèle vérifié).");
