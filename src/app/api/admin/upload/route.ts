import { NextRequest } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"]);
// Les bannières et photos grand format en sortie d'appareil photo ou de
// banque d'images dépassent facilement quelques Mo : 8 Mo était trop juste.
const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo

// Téléversement de fichiers (images des livres et des pages).
// Les fichiers sont stockés dans public/uploads/ et servis tels quels.
export async function POST(request: NextRequest) {
  try {
    if (!(await getSession())) {
      return Response.json({ error: "Non autorisé — reconnectez-vous puis réessayez." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo, 25 Mo max)` },
        { status: 400 },
      );
    }

    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return Response.json(
        { error: `Type de fichier « ${ext || "inconnu"} » non autorisé (formats acceptés : jpg, png, gif, webp, svg, pdf)` },
        { status: 400 },
      );
    }

    const base = file.name
      .slice(0, -ext.length)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "fichier";
    const name = `${Date.now().toString(36)}-${base}${ext}`;

    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

    return Response.json({ url: `/uploads/${name}` });
  } catch (error) {
    console.error("Échec du téléversement :", error);
    return Response.json({ error: "Échec de l'envoi côté serveur (voir les journaux)." }, { status: 500 });
  }
}
