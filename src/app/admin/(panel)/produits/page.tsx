import Link from "next/link";
import { prisma } from "@/lib/db";
import { isShopEnabled } from "@/lib/settings";
import { formatPrice } from "@/lib/shop";
import { deleteProductAction } from "@/lib/admin-actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, shopOn] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    isShopEnabled(),
  ]);

  return (
    <>
      <div className="entete-page">
        <h1>Livres</h1>
        <Link href="/admin/produits/new" className="btn principal">
          + Ajouter un livre
        </Link>
      </div>

      {!shopOn && (
        <div className="notice info">
          La boutique est actuellement désactivée : le catalogue n&apos;est pas visible sur le
          site. Activez-la dans les <Link href="/admin/parametres">réglages</Link>.
        </div>
      )}

      {products.length === 0 ? (
        <div className="panel">
          <p className="vide">Aucun livre au catalogue.</p>
        </div>
      ) : (
        <table className="liste">
          <thead>
            <tr>
              <th></th>
              <th>Titre</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="mini" />
                  ) : (
                    <span className="badge gris">—</span>
                  )}
                </td>
                <td>
                  <Link href={`/admin/produits/${p.id}`}>{p.title}</Link>
                  {p.author && <div style={{ color: "var(--texte-2)", fontSize: 13 }}>{p.author}</div>}
                </td>
                <td>{formatPrice(p.priceCents)}</td>
                <td>{p.stock}</td>
                <td>
                  {p.published ? (
                    <span className="badge vert">En vente</span>
                  ) : (
                    <span className="badge gris">Masqué</span>
                  )}
                </td>
                <td>
                  <div className="actions-ligne">
                    <Link href={`/admin/produits/${p.id}`} className="btn secondaire petit">
                      Modifier
                    </Link>
                    <a href={`/livres/${p.slug}`} target="_blank" rel="noreferrer" className="btn secondaire petit">
                      Voir
                    </a>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton message={`Supprimer « ${p.title} » du catalogue ?`}>
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
