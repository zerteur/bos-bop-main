import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  updatePageAction,
  convertPageToBuilderAction,
} from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

// Cet écran gère les pages encore en HTML brut (réglages + édition du code,
// avec possibilité de basculer vers le studio visuel). Les pages en mode
// « blocs » sont éditées directement dans le studio immersif.
export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id: Number(id) } });
  if (!page) notFound();

  if (page.editorMode === "blocks") redirect(`/admin/studio/${page.id}`);

  const path = page.slug === "" ? "/" : `/${page.slug}`;

  return (
    <>
      <div className="entete-page">
        <h1>Modifier : {page.breadcrumbLabel}</h1>
        <a href={path} target="_blank" rel="noreferrer" className="btn secondaire">
          Voir la page ↗
        </a>
      </div>

      <div className="notice info">
        Cette page est éditée en <strong>HTML brut</strong>. Pour la modifier facilement, avec
        aperçu en direct et édition directe dans la page, ouvrez-la dans le studio visuel : votre
        contenu actuel sera préservé.
      </div>

      <form action={convertPageToBuilderAction} style={{ marginBottom: 22 }}>
        <input type="hidden" name="id" value={page.id} />
        <button type="submit" className="btn principal">
          ✨ Ouvrir dans le studio visuel
        </button>
      </form>

      <form action={updatePageAction}>
        <input type="hidden" name="id" value={page.id} />

        <div className="panel">
          <h2>Informations générales</h2>
          <div className="grille-2">
            <label className="champ">
              Nom de la page
              <input type="text" name="name" defaultValue={page.breadcrumbLabel} required maxLength={150} />
            </label>
            <label className="champ">
              Adresse
              {page.isLegacy ? (
                <input type="text" value={path} disabled title="Adresse conservée pour le référencement" />
              ) : (
                <input type="text" name="slug" defaultValue={page.slug} maxLength={100} />
              )}
            </label>
          </div>
          <label className="champ">
            Titre de l&apos;onglet du navigateur <span className="aide">(balise &lt;title&gt;)</span>
            <input type="text" name="title" defaultValue={page.title} maxLength={300} />
          </label>
          <div className="grille-2">
            <label className="champ">
              Description pour les moteurs de recherche
              <textarea name="metaDescription" rows={3} defaultValue={page.metaDescription} maxLength={500} />
            </label>
            <label className="champ">
              Mots-clés <span className="aide">(séparés par des virgules)</span>
              <textarea name="metaKeywords" rows={3} defaultValue={page.metaKeywords} maxLength={300} />
            </label>
          </div>
          <label className="champ-inline">
            <input type="checkbox" name="published" value="1" defaultChecked={page.published} disabled={page.slug === ""} />
            Page publiée {page.slug === "" && <span className="aide">(la page d&apos;accueil est toujours publiée)</span>}
          </label>
          {page.slug === "" && <input type="hidden" name="published" value="1" />}
        </div>

        <div className="panel">
          <h2>Contenu HTML</h2>
          <label className="champ">
            HTML de la page{" "}
            <span className="aide">
              — contenu compris entre le bandeau et le pied de page. Modifiez avec prudence :
              ce balisage provient du site d&apos;origine.
            </span>
            <textarea name="contentHtml" rows={26} className="code" defaultValue={page.contentHtml} />
          </label>
        </div>

        <button type="submit" className="btn principal">
          Enregistrer
        </button>
      </form>
    </>
  );
}
