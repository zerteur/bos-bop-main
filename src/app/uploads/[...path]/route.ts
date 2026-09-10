import { NextRequest } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

export const dynamic = "force-dynamic";

/**
 * Sert les fichiers de public/uploads/ dynamiquement, à chaque requête.
 *
 * Pourquoi une route et pas simplement laisser Next.js servir public/uploads/
 * tel quel : en production (`next start`), Next.js ne « découvre » les
 * fichiers de public/ qu'au démarrage du serveur — un fichier téléversé
 * PENDANT que le serveur tourne (upload d'une bannière, d'une image de
 * produit…) renvoie donc 404 jusqu'au prochain redémarrage du process
 * (`pm2 restart`). Cette route lit le fichier sur disque à chaque requête :
 * un téléversement est donc visible immédiatement, sans redémarrage.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  // Empêche toute évasion du dossier uploads (ex. ../../.env).
  if (segments.some((s) => s === ".." || s === "." || s.includes("/") || s.includes("\\"))) {
    return new Response("Introuvable", { status: 404 });
  }

  const dir = join(process.cwd(), "public", "uploads");
  const filePath = normalize(join(dir, ...segments));
  if (!filePath.startsWith(dir)) {
    return new Response("Introuvable", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response("Introuvable", { status: 404 });

    const data = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": contentType,
        "content-length": String(info.size),
        // Noms de fichiers horodatés, jamais réécrits : cache navigateur agressif sans risque.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
