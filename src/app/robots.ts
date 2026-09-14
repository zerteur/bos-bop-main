import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"], // Protéger l'administration et les API des moteurs de recherche
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
