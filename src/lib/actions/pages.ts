"use server";

// Actions sur les pages du site : création (avec modèle), mise à jour,
// bascule de mode d'édition, publication, suppression.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";
import { getHeadTemplate } from "../templates";
import { TITLE_SUFFIX, INNER_BODY_CLASS, RESERVED_SLUGS } from "../constants";
import { slugify } from "../slugs";
import { formString as str } from "../forms";
import { compileBlocks, parseBlocksJson, PAGE_TEMPLATE_BY_ID } from "../blocks";

export async function createPageAction(formData: FormData) {
  await requireSession();
  const name = str(formData, "name", 150);
  if (!name) redirect("/admin/pages/new?erreur=nom");

  const slug = slugify(str(formData, "slug", 100) || name);
  if (!slug || RESERVED_SLUGS.has(slug)) redirect("/admin/pages/new?erreur=slug");
  if (await prisma.page.findUnique({ where: { slug } })) {
    redirect("/admin/pages/new?erreur=slug-existe");
  }

  // Blocs initiaux issus du modèle choisi ("création ludique et rapide")
  const template = PAGE_TEMPLATE_BY_ID[str(formData, "template", 40)] ?? PAGE_TEMPLATE_BY_ID["vierge"];
  const initialBlocks = template.blocks();
  // Le premier bloc « titre + texte » d'un modèle reprend le nom de la page
  const firstRichtext = initialBlocks.find((b) => b.type === "richtext");
  if (firstRichtext && firstRichtext.type === "richtext" && template.id === "vierge") {
    firstRichtext.heading = name;
  }

  const page = await prisma.page.create({
    data: {
      slug,
      title: name + TITLE_SUFFIX,
      breadcrumbLabel: name,
      metaDescription: str(formData, "metaDescription", 300),
      bodyClass: INNER_BODY_CLASS,
      headHtml: getHeadTemplate(),
      sharePath: `/${slug}.html`,
      editorMode: "blocks",
      blocksJson: JSON.stringify(initialBlocks),
      contentHtml: compileBlocks(initialBlocks),
      published: false,
      isLegacy: false,
    },
  });

  if (formData.get("addToMenu") === "1") {
    const last = await prisma.menuItem.findFirst({ orderBy: { position: "desc" } });
    await prisma.menuItem.create({
      data: {
        label: name,
        titleAttr: name,
        position: (last?.position ?? 0) + 1,
        pageId: page.id,
      },
    });
  }

  revalidatePath("/admin/pages");
  // Ouvre directement le studio d'édition immersif
  redirect(`/admin/studio/${page.id}`);
}

export async function updatePageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) redirect("/admin/pages");

  const name = str(formData, "name", 150) || page.breadcrumbLabel;
  const data: Record<string, unknown> = {
    breadcrumbLabel: name,
    title: str(formData, "title", 300) || name + TITLE_SUFFIX,
    metaDescription: str(formData, "metaDescription", 500),
    metaKeywords: str(formData, "metaKeywords", 300),
    published: formData.get("published") === "1",
  };

  // Le slug des pages historiques ne change pas (référencement conservé)
  if (!page.isLegacy) {
    const slug = slugify(str(formData, "slug", 100) || page.slug);
    if (slug && slug !== page.slug) {
      if (RESERVED_SLUGS.has(slug) || (await prisma.page.findUnique({ where: { slug } }))) {
        redirect(`/admin/pages/${id}?erreur=slug`);
      }
      data.slug = slug;
      data.sharePath = `/${slug}.html`;
    }
  }

  if (page.editorMode === "blocks") {
    const blocks = parseBlocksJson(str(formData, "blocksJson", 500_000));
    data.blocksJson = JSON.stringify(blocks);
    data.contentHtml = compileBlocks(blocks);
  } else {
    const contentHtml = formData.get("contentHtml");
    if (typeof contentHtml === "string") data.contentHtml = contentHtml;
  }

  await prisma.page.update({ where: { id }, data });
  revalidatePath("/admin/pages");
  // Rafraîchit la page publique correspondante
  const publicPath = (data.slug ?? page.slug) === "" ? "/" : `/${data.slug ?? page.slug}`;
  revalidatePath(publicPath);
  redirect(`/admin/pages/${id}?ok=1`);
}

/**
 * Ouvre une page en mode "constructeur visuel". Le contenu existant est
 * préservé tel quel dans un unique bloc HTML : le rendu publié reste
 * strictement identique tant que l'utilisateur ne modifie rien. Il peut
 * ensuite ajouter des blocs visuels autour, avec aperçu en direct.
 */
export async function convertPageToBuilderAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) redirect("/admin/pages");
  if (page.editorMode !== "blocks") {
    const blocks = [{ type: "html", html: page.contentHtml }];
    await prisma.page.update({
      where: { id },
      data: { editorMode: "blocks", blocksJson: JSON.stringify(blocks) },
    });
  }
  // Ouvre le studio d'édition immersif
  redirect(`/admin/studio/${id}`);
}

/** Repasse une page en mode HTML brut (édition avancée). */
export async function convertPageToHtmlAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) redirect("/admin/pages");
  await prisma.page.update({
    where: { id },
    data: { editorMode: "html" },
  });
  redirect(`/admin/pages/${id}`);
}

export async function togglePagePublishedAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  if (page && page.slug !== "") {
    await prisma.page.update({
      where: { id },
      data: { published: !page.published },
    });
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}

export async function deletePageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const page = await prisma.page.findUnique({ where: { id } });
  // Les pages issues de la migration Joomla ne sont pas supprimables
  if (page && !page.isLegacy) {
    await prisma.page.delete({ where: { id } });
  }
  revalidatePath("/admin/pages");
  redirect("/admin/pages");
}
