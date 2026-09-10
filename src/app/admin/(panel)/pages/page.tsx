import Link from "next/link";
import { prisma } from "@/lib/db";
import { togglePagePublishedAction, deletePageAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({ orderBy: [{ isLegacy: "desc" }, { createdAt: "asc" }] });

  return (
    <>
      <div className="entete-page">
        <h1>Pages</h1>
        <Link href="/admin/pages/new" className="btn principal">
          + Créer une page
        </Link>
      </div>

      <table className="liste">
        <thead>
          <tr>
            <th>Page</th>
            <th>Adresse</th>
            <th>Édition</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => {
            const path = page.slug === "" ? "/" : `/${page.slug}`;
            // Pages en blocs -> studio visuel ; pages en HTML brut -> réglages
            const editHref =
              page.editorMode === "blocks"
                ? `/admin/studio/${page.id}`
                : `/admin/pages/${page.id}`;
            return (
              <tr key={page.id}>
                <td>
                  <Link href={editHref}>{page.breadcrumbLabel}</Link>{" "}
                  {page.isLegacy && <span className="badge bleu">site d&apos;origine</span>}
                </td>
                <td>
                  <code className="slug">{path}</code>
                </td>
                <td>{page.editorMode === "blocks" ? "Blocs" : "HTML"}</td>
                <td>
                  {page.published ? (
                    <span className="badge vert">Publiée</span>
                  ) : (
                    <span className="badge gris">Brouillon</span>
                  )}
                </td>
                <td>
                  <div className="actions-ligne">
                    <Link href={editHref} className="btn secondaire petit">
                      Modifier
                    </Link>
                    <a href={path} target="_blank" rel="noreferrer" className="btn secondaire petit">
                      Voir
                    </a>
                    {page.slug !== "" && (
                      <form action={togglePagePublishedAction}>
                        <input type="hidden" name="id" value={page.id} />
                        <button type="submit" className="btn secondaire petit">
                          {page.published ? "Dépublier" : "Publier"}
                        </button>
                      </form>
                    )}
                    {!page.isLegacy && (
                      <form action={deletePageAction}>
                        <input type="hidden" name="id" value={page.id} />
                        <ConfirmButton message={`Supprimer définitivement la page « ${page.breadcrumbLabel} » ?`}>
                          Supprimer
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="subtitle" style={{ marginTop: 14 }}>
        Les pages « site d&apos;origine » proviennent de la migration Joomla : leur adresse est
        conservée pour le référencement et elles ne peuvent pas être supprimées.
      </p>
    </>
  );
}
