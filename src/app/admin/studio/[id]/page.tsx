import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseBlocksJson } from "@/lib/blocks";
import { StudioEditor } from "@/components/admin/StudioEditor";

export const dynamic = "force-dynamic";

export default async function StudioPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/admin/login");
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) notFound();

  // Le studio édite des blocs : une page encore en HTML brut passe par l'écran
  // de réglages (qui propose la conversion vers le constructeur visuel).
  if (page.editorMode !== "blocks") redirect(`/admin/pages/${page.id}`);

  return (
    <StudioEditor
      page={{
        id: page.id,
        slug: page.slug,
        breadcrumbLabel: page.breadcrumbLabel,
        title: page.title,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        published: page.published,
        isHome: page.slug === "",
        isLegacy: page.isLegacy,
        blocks: parseBlocksJson(page.blocksJson),
      }}
    />
  );
}
