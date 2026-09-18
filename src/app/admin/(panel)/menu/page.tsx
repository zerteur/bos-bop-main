import { prisma } from "@/lib/db";
import {
  addMenuItemAction,
  updateMenuItemAction,
  moveMenuItemAction,
  deleteMenuItemAction,
} from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  libelle: "Merci d'indiquer un libellé.",
  cible: "Choisissez une page ou saisissez une adresse.",
  introuvable: "Entrée de menu introuvable : rechargez la page et réessayez.",
};

const NOTICES: Record<string, string> = {
  renomme: "Entrée de menu renommée.",
  ajoute: "Entrée ajoutée au menu.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; ok?: string }>;
}) {
  const { erreur, ok } = await searchParams;
  const [items, pages] = await Promise.all([
    prisma.menuItem.findMany({ orderBy: { position: "asc" }, include: { page: true } }),
    prisma.page.findMany({ orderBy: { breadcrumbLabel: "asc" } }),
  ]);

  return (
    <>
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>🔗 Menu du Site</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>
            L'ordre ci-dessous est celui du menu principal affiché sur toutes les pages.
          </p>
        </div>
      </div>
      
      {erreur && <div className="notice erreur" style={{ padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>{ERRORS[erreur] ?? "Erreur inconnue."}</div>}
      {ok && !erreur && <div className="notice ok" style={{ padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>{NOTICES[ok] ?? "Modification enregistrée."}</div>}

      <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto', marginBottom: '24px' }}>
        <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '10px 8px', width: 90, textAlign: 'center', color: '#666', fontWeight: 600 }}>Ordre</th>
              <th colSpan={2} style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Libellé & Infobulle</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Cible</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const target = item.page
                ? item.page.slug === ""
                  ? "/"
                  : `/${item.page.slug}`
                : item.url;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <form action={moveMenuItemAction} style={{ margin: 0 }}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" className="btn secondaire petit" disabled={index === 0} style={{ padding: '4px 8px', borderRadius: '6px' }}>↑</button>
                      </form>
                      <form action={moveMenuItemAction} style={{ margin: 0 }}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" className="btn secondaire petit" disabled={index === items.length - 1} style={{ padding: '4px 8px', borderRadius: '6px' }}>↓</button>
                      </form>
                    </div>
                  </td>
                  <td colSpan={2} style={{ padding: '10px 8px' }}>
                    <form action={updateMenuItemAction} style={{ margin: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="text" name="label" defaultValue={item.label} maxLength={100} style={{ width: 140, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                      <input type="text" name="titleAttr" defaultValue={item.titleAttr} maxLength={150} style={{ width: 160, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }} placeholder="Infobulle..." />
                      <button type="submit" className="btn secondaire petit" style={{ padding: '6px 12px', borderRadius: '6px' }}>Renommer</button>
                    </form>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <code className="slug" style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>{target}</code>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <form action={deleteMenuItemAction} style={{ margin: 0 }}>
                      <input type="hidden" name="id" value={item.id} />
                      <ConfirmButton message={`Retirer « ${item.label} » du menu ?`}>
                        <span style={{ color: '#ef4444', padding: '4px 10px', display: 'inline-block' }}>×</span>
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '18px', color: '#1f2430', marginBottom: '20px' }}>➕ Ajouter une entrée au menu</h2>
        <form action={addMenuItemAction}>
          <div className="grille-2" style={{ gap: '20px', marginBottom: '20px' }}>
            <label className="champ">
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2430', display: 'block', marginBottom: '6px' }}>Libellé</span>
              <input type="text" name="label" required maxLength={100} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }} />
            </label>
            <label className="champ">
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2430', display: 'block', marginBottom: '6px' }}>Infobulle <span style={{ color: '#888', fontWeight: 'normal' }}>(facultatif)</span></span>
              <input type="text" name="titleAttr" maxLength={150} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }} />
            </label>
            <label className="champ">
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2430', display: 'block', marginBottom: '6px' }}>Page du site</span>
              <select name="pageId" defaultValue="" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}>
                <option value="">— Choisir une page —</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.breadcrumbLabel} ({page.slug === "" ? "/" : `/${page.slug}`})
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2430', display: 'block', marginBottom: '6px' }}>…ou adresse libre <span style={{ color: '#888', fontWeight: 'normal' }}>(ex : /livres)</span></span>
              <input type="text" name="url" maxLength={300} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }} />
            </label>
          </div>
          <button type="submit" className="btn principal" style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold' }}>
            Ajouter au menu
          </button>
        </form>
      </div>
    </>
  );
}
