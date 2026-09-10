import { prisma } from "@/lib/db";
import { renderPage, renderNotFound, HTML_HEADERS } from "@/lib/render";

export const dynamic = "force-dynamic";

// Page d'accueil
export async function GET() {
  const page = await prisma.page.findUnique({ where: { slug: "" } });
  if (!page || !page.published) return renderNotFound();
  return new Response(await renderPage(page), { headers: HTML_HEADERS });
}
