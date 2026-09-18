import Link from "next/link";
import { prisma } from "@/lib/db";
import { togglePagePublishedAction, deletePageAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({ orderBy: [{ isLegacy: "desc" }, { createdAt: "asc" }] });

  return (
    <>
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>📄 Pages du Site</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>Gérez le contenu de votre site vitrine.</p>
        </div>
        <Link href="/admin/pages/new" className="btn principal" style={{ borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold' }}>
          + Créer une page
        </Link>
      </div>

      <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Titre de la Page</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Adresse (URL)</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Mode</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Statut</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const path = page.slug === "" ? "/" : `/${page.slug}`;
              const editHref = page.editorMode === "blocks" ? `/admin/studio/${page.id}` : `/admin/pages/${page.id}`;
              
              return (
                <tr key={page.id} style={{ borderBottom: '1px solid #f9f9f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={editHref} style={{ color: '#1f2430', fontWeight: 600, textDecoration: 'none' }}>{page.breadcrumbLabel}</Link>
                    {page.isLegacy && <span className="badge bleu" style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase' }}>Site d&apos;origine</span>}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <code className="slug" style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>{path}</code>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>{page.editorMode === "blocks" ? "Blocs" : "HTML"}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {page.published ? (
                      <span className="badge vert" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>Publiée</span>
                    ) : (
                      <span className="badge gris" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>Brouillon</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link href={editHref} className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>Modifier</Link>
                      <a href={path} target="_blank" rel="noreferrer" className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>Voir</a>
                      {page.slug !== "" && (
                        <form action={togglePagePublishedAction} style={{ margin: 0 }}>
                          <input type="hidden" name="id" value={page.id} />
                          <button type="submit" className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>
                            {page.published ? "Masquer" : "Publier"}
                          </button>
                        </form>
                      )}
                      {!page.isLegacy && (
                        <form action={deletePageAction} style={{ margin: 0 }}>
                          <input type="hidden" name="id" value={page.id} />
                          <ConfirmButton message={`Supprimer définitivement la page « ${page.breadcrumbLabel} » ?`}>
                            <span style={{ color: '#ef4444' }}>×</span>
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
      </div>
      <p className="subtitle" style={{ marginTop: '16px', fontSize: '13px', color: '#94a3b8' }}>
        💡 Les pages « site d&apos;origine » proviennent de la migration Joomla : leur adresse est
        conservée pour le référencement et elles ne peuvent pas être supprimées.
      </p>
    </>
  );
}
