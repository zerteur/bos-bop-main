"use server";

// Actions sur le catalogue de livres.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";
import { slugify } from "../slugs";
import { formString as str } from "../forms";

/** "19,90" ou "19.90" -> centimes (0 si invalide). */
function parsePriceCents(input: string): number {
  const value = Number(input.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

export async function saveProductAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id")) || null;
  const title = str(formData, "title", 200);
  if (!title) redirect(id ? `/admin/produits/${id}?erreur=titre` : "/admin/produits/new?erreur=titre");

  const data = {
    title,
    author: str(formData, "author", 200),
    description: str(formData, "description", 20_000),
    priceCents: parsePriceCents(str(formData, "price", 20)),
    imageUrl: str(formData, "imageUrl", 500),
    stock: Math.max(0, Math.floor(Number(formData.get("stock")) || 0)),
    published: formData.get("published") === "1",
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
    revalidatePath("/admin/produits");
    redirect(`/admin/produits/${id}?ok=1`);
  }

  let slug = slugify(str(formData, "slug", 100) || title);
  if (!slug) slug = `livre-${Date.now()}`;
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const product = await prisma.product.create({ data: { ...data, slug } });
  revalidatePath("/admin/produits");
  redirect(`/admin/produits/${product.id}?ok=1`);
}

export async function deleteProductAction(formData: FormData) {
  await requireSession();
  await prisma.product.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/produits");
  redirect("/admin/produits");
}
