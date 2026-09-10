"use client";

import { useState } from "react";
import { saveHeroAction } from "@/lib/admin-actions";
import { uploadFile } from "@/lib/upload-client";

const ORIGINAL_TITLE_EXAMPLE =
  "BOS & BOP, facilitateur d’orientation pour\nles lycéens, les étudiants, et les actifs.";

export function HeroForm({
  initialTitle,
  initialImageUrl,
}: {
  initialTitle: string;
  initialImageUrl: string;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={saveHeroAction}>
      <input type="hidden" name="heroImageUrl" value={imageUrl} />

      <div className="panel">
        <h2>Titre de la bannière</h2>
        <label className="champ">
          Texte affiché en grand sur l&apos;accueil{" "}
          <span className="aide">— une ligne = un retour à la ligne, comme sur le site actuel</span>
          <textarea
            name="heroTitle"
            rows={3}
            defaultValue={initialTitle}
            placeholder={ORIGINAL_TITLE_EXAMPLE}
            maxLength={500}
          />
        </label>
        <p className="subtitle">
          Laisser le champ vide restaure exactement le texte d&apos;origine du site.
        </p>
      </div>

      <div className="panel">
        <h2>Image de fond</h2>
        {!initialImageUrl && (
          <div className="notice info">
            Aucune image de fond n&apos;est actuellement configurée pour la bannière (l&apos;image
            d&apos;origine du site n&apos;était pas incluse dans l&apos;export fourni). Téléversez-en
            une ci-dessous pour l&apos;activer.
          </div>
        )}
        <label className="champ">
          Fichier image <span className="aide">(grand format recommandé, ex : 1920×800)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
        {uploading && <p>Envoi en cours…</p>}
        {error && <div className="notice erreur">{error}</div>}
        {imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="apercu-image" style={{ maxWidth: "100%" }} />
            <p>
              <button type="button" className="btn secondaire petit" onClick={() => setImageUrl("")}>
                Retirer l&apos;image (revenir au fond d&apos;origine)
              </button>
            </p>
          </>
        )}
      </div>

      <button type="submit" className="btn principal">
        Enregistrer
      </button>
    </form>
  );
}
