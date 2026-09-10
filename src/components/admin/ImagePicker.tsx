"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/upload-client";

/** Champ de sélection d'image : téléversement + saisie d'URL + aperçu. */
export function ImagePicker({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-picker">
      <label className="champ">
        {label}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {uploading && <p className="aide">Envoi en cours…</p>}
      {error && <div className="notice erreur">{error}</div>}
      {value && (
        <div className="image-picker-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" />
          <button type="button" className="btn secondaire petit" onClick={() => onChange("")}>
            Retirer
          </button>
        </div>
      )}
    </div>
  );
}
