"use client";

/**
 * Téléverse un fichier vers /api/admin/upload et renvoie son URL publique.
 * Propage le vrai message d'erreur du serveur (taille, type de fichier,
 * session expirée…) au lieu d'un message générique impossible à diagnostiquer.
 */
export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", body });
  if (!response.ok) {
    let message = "Échec de l'envoi du fichier.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // réponse non-JSON (ex. erreur serveur ou proxy) : on garde le message générique
    }
    throw new Error(message);
  }
  const data = (await response.json()) as { url: string };
  return data.url;
}
