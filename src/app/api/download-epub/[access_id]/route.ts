import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { join } from "node:path";
import AdmZip from "adm-zip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ access_id: string }> }
) {
  const { access_id } = await params;

  try {
    const access = await prisma.purchaseAccess.findUnique({
      where: { id: access_id },
      include: { product: true, order: true },
    });

    if (!access || !access.product.epubPath) {
      return new Response("Accès invalide ou e-book introuvable", { status: 404 });
    }

    // Vérification de sécurité (Appareil autorisé)
    const deviceCookie = request.cookies.get(`ebook_token_${access_id}`)?.value;
    if (!deviceCookie) {
      return new Response("Accès non autorisé : Appareil non vérifié.", { status: 401 });
    }

    const device = await prisma.accessDevice.findUnique({
      where: { deviceCookie },
    });

    if (!device || device.purchaseAccessId !== access_id) {
      return new Response("Accès non autorisé ou révoqué.", { status: 401 });
    }

    // Mettre à jour lastUsedAt en arrière-plan
    prisma.accessDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {});

    const filePath = join(process.cwd(), "content", "ebooks", access.product.epubPath);
    
    // Charger l'EPUB (qui est un simple fichier ZIP)
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    const watermarkText = `Licence personnelle : ${access.order.customerName} (${access.order.email})`;
    const watermarkHtml = `<div style="text-align: center; font-size: 0.8em; color: #666; margin-top: 2em; padding-top: 1em; border-top: 1px solid #ccc;">${watermarkText}</div>`;

    // Parcourir toutes les entrées pour trouver les fichiers HTML/XHTML
    for (const entry of zipEntries) {
      if (entry.entryName.match(/\.(html|xhtml)$/i)) {
        let content = entry.getData().toString("utf8");
        // Injecter le filigrane juste avant la fermeture du body
        if (content.includes("</body>")) {
          content = content.replace("</body>", `${watermarkHtml}\n</body>`);
          zip.updateFile(entry.entryName, Buffer.from(content, "utf8"));
        }
      }
    }

    const modifiedEpub = zip.toBuffer();

    return new Response(modifiedEpub as any, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(access.product.title)}.epub"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Erreur de traitement de l'EPUB:", error);
    return new Response("Erreur interne", { status: 500 });
  }
}
