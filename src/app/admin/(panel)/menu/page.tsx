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
      <h1>Menu du site</h1>
      <p className="subtitle">
        L&apos;ordre ci-dessous est celui du menu principal affiché sur toutes les pages.
      </p>
      {erreur && <div className="notice erreur">{ERRORS[erreur] ?? "Erreur inconnue."}</div>}
      {ok && !erreur && <div className="notice ok">{NOTICES[ok] ?? "Modification enregistrée."}</div>}

      <table className="liste">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Ordre</th>
            <th>Libellé</th>
            <th>Infobulle</th>
            <th>Cible</th>
            <th>Actions</th>
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
              <tr key={item.id}>
                <td>
                  <div className="actions-ligne">
                    <form action={moveMenuItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className="btn secondaire petit" disabled={index === 0}>
                        ↑
                      </button>
                    </form>
                    <form action={moveMenuItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className="btn secondaire petit" disabled={index === items.length - 1}>
                        ↓
                      </button>
                    </form>
                  </div>
                </td>
                <td colSpan={2}>
                  <form action={updateMenuItemAction} className="actions-ligne">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="text" name="label" defaultValue={item.label} maxLength={100} style={{ width: 180 }} />
                    <input type="text" name="titleAttr" defaultValue={item.titleAttr} maxLength={150} style={{ width: 200 }} placeholder="Infobulle (facultatif)" />
                    <button type="submit" className="btn secondaire petit">
                      Renommer
                    </button>
                  </form>
                </td>
                <td>
                  <code className="slug">{target}</code>
                </td>
                <td>
                  <form action={deleteMenuItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <ConfirmButton message={`Retirer « ${item.label} » du menu ?`}>Retirer</ConfirmButton>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="panel" style={{ marginTop: 22 }}>
        <h2>Ajouter une entrée au menu</h2>
        <form action={addMenuItemAction}>
          <div className="grille-2">
            <label className="champ">
              Libellé
              <input type="text" name="label" required maxLength={100} />
            </label>
            <label className="champ">
              Infobulle <span className="aide">(facultatif)</span>
              <input type="text" name="titleAttr" maxLength={150} />
            </label>
            <label className="champ">
              Page du site
              <select name="pageId" defaultValue="">
                <option value="">— Choisir une page —</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.breadcrumbLabel} ({page.slug === "" ? "/" : `/${page.slug}`})
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              …ou adresse libre <span className="aide">(ex : /livres, https://…)</span>
              <input type="text" name="url" maxLength={300} />
            </label>
          </div>
          <button type="submit" className="btn principal">
            Ajouter au menu
          </button>
        </form>
      </div>
    </>
  );
}
