import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { compileBlocks, compileBlocksEditable, parseBlocksJson } from "@/lib/blocks";
import { renderPreview, HTML_HEADERS } from "@/lib/render";

export const dynamic = "force-dynamic";

// Aperçu en direct du constructeur de pages.
// Reçoit soit une liste de blocs, soit du HTML brut, et renvoie le document
// complet habillé du site (mêmes en-tête/menu/pied que la publication).
export async function POST(request: NextRequest) {
  if (!(await getSession())) {
    return new Response("Non autorisé", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response("Requête invalide", { status: 400 });
  }

  const isHome = body.isHome === true;
  const editor = body.editor === true;
  let contentHtml = "";
  if (body.mode === "html" && typeof body.contentHtml === "string") {
    contentHtml = body.contentHtml;
  } else if (Array.isArray(body.blocks)) {
    const blocks = parseBlocksJson(JSON.stringify(body.blocks));
    contentHtml = editor ? compileBlocksEditable(blocks) : compileBlocks(blocks);
  }

  const html = await renderPreview({
    contentHtml,
    isHome,
    editor,
    hero:
      typeof body.heroTitle === "string" || typeof body.heroImageUrl === "string"
        ? { title: body.heroTitle ?? "", imageUrl: body.heroImageUrl ?? "" }
        : undefined,
  });

  return new Response(html, { headers: HTML_HEADERS });
}
