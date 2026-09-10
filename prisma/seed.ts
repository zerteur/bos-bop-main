/**
 * Alimentation de la base :
 *  - pages et menu issus du site Joomla d'origine (dossier content/)
 *  - compte administrateur (variables ADMIN_EMAIL / ADMIN_PASSWORD)
 *  - réglages par défaut et exemple de livre pour la boutique
 *
 * Idempotent et SANS RISQUE pour un site déjà en production : par défaut,
 * seules les pages/entrées de menu qui n'existent pas encore sont créées.
 * Le contenu d'une page existante (potentiellement modifiée depuis
 * l'administration) n'est jamais écrasé, sauf demande explicite via
 * RESEED_LEGACY_CONTENT=1 (utile après une mise à jour du découpage en blocs
 * des pages migrées — voir scripts/decompose-legacy.mjs).
 *
 * -> `npm run db:seed` peut donc être inclus sans crainte dans un script de
 *    déploiement : sur une base neuve il l'amorce, sur une base existante il
 *    ne fait rien de destructeur.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { compileBlocks, parseBlocksJson } from "../src/lib/blocks";

const prisma = new PrismaClient();
const root = process.cwd();
const readContent = (rel: string) => readFileSync(join(root, "content", rel), "utf-8");
const contentExists = (rel: string) => existsSync(join(root, "content", rel));

// Ne réécrase le contenu des pages déjà existantes que si explicitement demandé.
const RESEED_LEGACY_CONTENT = process.env.RESEED_LEGACY_CONTENT === "1";

type PageMeta = {
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  breadcrumbLabel: string;
  sharePath: string;
  bodyClass: string;
};

type MenuEntry = {
  cssTag: string;
  url: string;
  titleAttr: string;
  label: string;
  position: number;
};

async function main() {
  // --- Pages ---------------------------------------------------------------
  const pages: PageMeta[] = JSON.parse(readContent("pages.json"));
  for (const meta of pages) {
    const headHtml = readContent(`heads/${meta.name}.html`);
    const originalHtml = readContent(`pages/${meta.name}.html`);

    // Pages migrées converties en « blocs » (découpage par bande, fidèle à
    // l'octet — voir scripts/decompose-legacy.mjs). Repli en HTML brut si le
    // découpage n'est pas disponible.
    let editorMode = "html";
    let blocksJson = "[]";
    let contentHtml = originalHtml;
    if (contentExists(`blocks/${meta.name}.json`)) {
      const blocks = parseBlocksJson(readContent(`blocks/${meta.name}.json`));
      const recompiled = compileBlocks(blocks);
      if (recompiled === originalHtml) {
        editorMode = "blocks";
        blocksJson = JSON.stringify(blocks);
        contentHtml = recompiled; // strictement identique à l'original
      } else {
        console.warn(`  ⚠ blocs/${meta.name} non fidèles : maintien en HTML brut`);
      }
    }

    const data = {
      title: meta.title,
      breadcrumbLabel: meta.breadcrumbLabel,
      metaDescription: meta.metaDescription,
      metaKeywords: meta.metaKeywords,
      bodyClass: meta.bodyClass,
      headHtml,
      sharePath: meta.sharePath,
      contentHtml,
      blocksJson,
      editorMode,
      published: true,
      isLegacy: true,
    };
    const existing = await prisma.page.findUnique({ where: { slug: meta.slug } });
    if (!existing) {
      await prisma.page.create({ data: { slug: meta.slug, ...data } });
      console.log(`page créée : /${meta.slug}`);
    } else if (RESEED_LEGACY_CONTENT) {
      await prisma.page.update({ where: { slug: meta.slug }, data });
      console.log(`page resynchronisée (RESEED_LEGACY_CONTENT=1) : /${meta.slug}`);
    } else {
      console.log(`page déjà présente, conservée telle quelle : /${meta.slug}`);
    }
  }

  // --- Menu principal ----------------------------------------------------
  // Uniquement amorcé si le menu est actuellement vide (installation neuve) :
  // ne détruit jamais des entrées ajoutées ou réordonnées depuis l'admin.
  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    const menu: MenuEntry[] = JSON.parse(readContent("menu.json"));
    for (const entry of menu) {
      const slug = entry.url === "/" ? "" : entry.url.replace(/^\//, "");
      const page = await prisma.page.findUnique({ where: { slug } });
      await prisma.menuItem.create({
        data: {
          label: entry.label,
          titleAttr: entry.titleAttr,
          cssTag: entry.cssTag,
          position: entry.position,
          pageId: page?.id ?? null,
          url: page ? "" : entry.url,
        },
      });
      console.log(`menu : ${entry.label}`);
    }
  } else {
    console.log(`menu déjà initialisé (${menuCount} entrée(s)), conservé tel quel`);
  }

  // --- Compte administrateur -------------------------------------------------
  const email = process.env.ADMIN_EMAIL || "admin@bos-bop.fr";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Administrateur", passwordHash },
    update: {},
  });
  console.log(`admin : ${email}`);

  // --- Réglages ----------------------------------------------------------------
  const defaults: Record<string, string> = {
    siteUrl: process.env.SITE_URL || "https://www.bos-bop.fr",
    shopEnabled: "0",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // --- Exemple de livre (boutique désactivée par défaut) ----------------------
  await prisma.product.upsert({
    where: { slug: "exemple-livre-orientation" },
    create: {
      slug: "exemple-livre-orientation",
      title: "Exemple — Guide de l'orientation",
      author: "BOS & BOP",
      description:
        "<p>Fiche produit d'exemple créée par l'installation. Modifiez-la ou supprimez-la depuis l'administration (rubrique Livres).</p>",
      priceCents: 1990,
      stock: 10,
      published: true,
    },
    update: {},
  });

  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
