"use server";

// Actions sur le menu principal du site.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";
import { formString as str } from "../forms";

export async function addMenuItemAction(formData: FormData) {
  await requireSession();
  const label = str(formData, "label", 100);
  if (!label) redirect("/admin/menu?erreur=libelle");
  const pageId = Number(formData.get("pageId")) || null;
  const url = str(formData, "url", 300);
  if (!pageId && !url) redirect("/admin/menu?erreur=cible");
  const last = await prisma.menuItem.findFirst({ orderBy: { position: "desc" } });
  await prisma.menuItem.create({
    data: {
      label,
      titleAttr: str(formData, "titleAttr", 150),
      position: (last?.position ?? 0) + 1,
      pageId: pageId || undefined,
      url: pageId ? "" : url,
    },
  });
  revalidatePath("/admin/menu");
  redirect("/admin/menu?ok=ajoute");
}

export async function updateMenuItemAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const label = str(formData, "label", 100);
  // Libellé vide : on le signale (au lieu d'ignorer silencieusement le clic,
  // ce qui donnait l'impression que le bouton « Renommer » ne faisait rien).
  if (!Number.isInteger(id) || id <= 0) redirect("/admin/menu?erreur=introuvable");
  if (!label) redirect("/admin/menu?erreur=libelle");
  await prisma.menuItem.update({
    where: { id },
    data: { label, titleAttr: str(formData, "titleAttr", 150) },
  });
  revalidatePath("/admin/menu");
  redirect("/admin/menu?ok=renomme");
}

export async function moveMenuItemAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const items = await prisma.menuItem.findMany({ orderBy: { position: "asc" } });
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index !== -1 && target >= 0 && target < items.length) {
    // Échange des positions, puis renumérotation propre
    [items[index], items[target]] = [items[target], items[index]];
    for (let i = 0; i < items.length; i++) {
      await prisma.menuItem.update({ where: { id: items[i].id }, data: { position: i + 1 } });
    }
  }
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireSession();
  await prisma.menuItem.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}
