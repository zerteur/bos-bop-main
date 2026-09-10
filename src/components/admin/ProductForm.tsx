"use client";

import { useState } from "react";
import type { Product } from "@prisma/client";
import { saveProductAction } from "@/lib/admin-actions";
import { uploadFile } from "@/lib/upload-client";

export function ProductForm({ product }: { product: Product | null }) {
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
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
    <form action={saveProductAction}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <div className="panel">
        <div className="grille-2">
          <label className="champ">
            Titre du livre
            <input type="text" name="title" defaultValue={product?.title ?? ""} required maxLength={200} />
          </label>
          <label className="champ">
            Auteur
            <input type="text" name="author" defaultValue={product?.author ?? ""} maxLength={200} />
          </label>
          {!product && (
            <label className="champ">
              Adresse <span className="aide">(laisser vide pour la générer)</span>
              <input type="text" name="slug" maxLength={100} placeholder="ex : mon-livre" />
            </label>
          )}
          <label className="champ">
            Prix (en euros)
            <input type="text" name="price" inputMode="decimal" defaultValue={product ? (product.priceCents / 100).toFixed(2).replace(".", ",") : ""} required />
          </label>
          <label className="champ">
            Stock disponible
            <input type="number" name="stock" min={0} defaultValue={product?.stock ?? 0} />
          </label>
        </div>

        <label className="champ">
          Description <span className="aide">(HTML accepté)</span>
          <textarea name="description" rows={8} defaultValue={product?.description ?? ""} />
        </label>

        <label className="champ">
          Image de couverture
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="apercu-image" />
        )}

        <label className="champ-inline">
          <input type="checkbox" name="published" value="1" defaultChecked={product?.published ?? false} />
          Visible dans la boutique
        </label>
      </div>

      <button type="submit" className="btn principal">
        Enregistrer
      </button>
    </form>
  );
}
