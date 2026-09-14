import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";

  // Pages statiques
  const staticPages = ["", "/livres", "/panier"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Pages dynamiques : Les livres depuis la DB
  const books = await prisma.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true }
  });

  const bookPages = books.map((book) => ({
    url: `${siteUrl}/livres/${book.slug}`,
    lastModified: book.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Pages issues de l'ancien contenu HTML (Legacy Pages)
  const legacyPages = await prisma.page.findMany({
    select: { slug: true, updatedAt: true }
  });

  const customPages = legacyPages.map((page) => ({
    url: `${siteUrl}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...bookPages, ...customPages];
}
