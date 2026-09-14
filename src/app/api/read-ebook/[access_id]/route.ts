import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, degrees } from "pdf-lib";

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

    if (!access || !access.product.pdfPath) {
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

    const filePath = join(process.cwd(), "content", "ebooks", access.product.pdfPath);
    const fileBuffer = await readFile(filePath);

    // Filigrane dynamique
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();
    const watermarkText = `Licence personnelle : ${access.order.customerName} (${access.order.email})`;

    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Filigrane discret dans la marge gauche (de bas en haut)
      page.drawText(watermarkText, {
        x: 15,
        y: 50,
        size: 10,
        color: rgb(0.6, 0.6, 0.6), // Gris clair
        rotate: degrees(90),
        opacity: 0.5,
      });

      // Filigrane discret dans la marge droite (de haut en bas)
      page.drawText(watermarkText, {
        x: width - 15,
        y: height - 50,
        size: 10,
        color: rgb(0.6, 0.6, 0.6),
        rotate: degrees(-90),
        opacity: 0.5,
      });
    }

    const watermarkedBytes = await pdfDoc.save();

    return new Response(watermarkedBytes as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(access.product.title)}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Erreur de lecture du PDF:", error);
    return new Response("Erreur interne", { status: 500 });
  }
}
