"use client";

import { useState } from "react";
import type { Product } from "@prisma/client";
import { saveProductAction } from "@/lib/admin-actions";
import { uploadFile } from "@/lib/upload-client";

export function ProductForm({ product }: { product: Product | null }) {
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [pdfPath, setPdfPath] = useState(product?.pdfPath ?? "");
  const [epubPath, setEpubPath] = useState(product?.epubPath ?? "");
  
  const [previewImages, setPreviewImages] = useState<string[]>(() => {
    try {
      // Si previewImages est bien défini, on le parse
      return product?.previewImages ? JSON.parse(product.previewImages) : [];
    } catch {
      return [];
    }
  });
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImg = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      setImageUrl((await uploadFile(file)).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setUploading(false);
    }
  };

  const uploadPreviewImg = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile(file);
      setPreviewImages((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image de prévisualisation.");
    } finally {
      setUploading(false);
    }
  };

  const uploadPdf = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadFile(file);
      if (res.internalPath) setPdfPath(res.internalPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du PDF.");
    } finally {
      setUploading(false);
    }
  };

  const uploadEpub = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await uploadFile(file);
      if (res.internalPath) setEpubPath(res.internalPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'EPUB.");
    } finally {
      setUploading(false);
    }
  };

  const removePreviewImg = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={saveProductAction}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="pdfPath" value={pdfPath} />
      <input type="hidden" name="epubPath" value={epubPath} />
      <input type="hidden" name="previewImages" value={JSON.stringify(previewImages)} />

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
          {/* Stock retiré ici */}
        </div>

        <label className="champ">
          Description <span className="aide">(HTML accepté)</span>
          <textarea name="description" rows={8} defaultValue={product?.description ?? ""} />
        </label>

        <label className="champ">
          Image de couverture (Principale)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImg(file);
            }}
          />
        </label>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Couverture" className="apercu-image" style={{ marginBottom: 20 }} />
        )}

        <label className="champ">
          Extraits / Pages de prévisualisation
          <input
            type="file"
            accept="image/*"
            multiple // On autorise l'ajout multiple côté OS, même si géré un par un par l'event
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                await uploadPreviewImg(file);
              }
            }}
          />
        </label>
        {previewImages.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
            {previewImages.map((src, idx) => (
              <div key={idx} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Extrait" style={{ height: "100px", borderRadius: "4px" }} />
                <button
                  type="button"
                  onClick={() => removePreviewImg(idx)}
                  style={{
                    position: "absolute", top: -5, right: -5, background: "red", color: "white",
                    border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="champ">
          Livre numérique (PDF)
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPdf(file);
            }}
          />
        </label>
        {pdfPath && <div className="notice ok">Fichier PDF lié : {pdfPath}</div>}

        <label className="champ">
          Livre numérique (EPUB)
          <input
            type="file"
            accept="application/epub+zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadEpub(file);
            }}
          />
        </label>
        {epubPath && <div className="notice ok">Fichier EPUB lié : {epubPath}</div>}

        {uploading && <p>Envoi en cours…</p>}
        {error && <div className="notice erreur">{error}</div>}

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
