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
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>📚 Catalogue Livres</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>Gérez vos ouvrages en vente.</p>
        </div>
        <Link href="/admin/produits/new" className="btn principal" style={{ borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold' }}>
          + Ajouter un livre
        </Link>
      </div>

      {!shopOn && (
        <div className="notice info" style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '16px', borderRadius: '8px', color: '#1e3a8a', marginBottom: '24px' }}>
          La boutique est actuellement désactivée : le catalogue n&apos;est pas visible sur le
          site. Activez-la dans les <Link href="/admin/parametres" style={{ textDecoration: 'underline' }}>réglages</Link>.
        </div>
      )}

      {products.length === 0 ? (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <p className="vide" style={{ color: '#888', fontStyle: 'italic' }}>Aucun livre au catalogue.</p>
        </div>
      ) : (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '10px 8px', width: '50px' }}></th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Livre</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Prix</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <span className="badge gris" style={{ padding: '4px', borderRadius: '6px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={`/admin/produits/${p.id}`} style={{ color: '#1f2430', fontWeight: 600, textDecoration: 'none' }}>{p.title}</Link>
                    {p.author && <div style={{ color: "#888", fontSize: '12px' }}>{p.author}</div>}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{formatPrice(p.priceCents)}</td>

                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    {p.published ? (
                      <span className="badge vert" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>En vente</span>
                    ) : (
                      <span className="badge gris" style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase' }}>Masqué</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link href={`/admin/produits/${p.id}`} className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>
                        Modifier
                      </Link>
                      <a href={`/livres/${p.slug}`} target="_blank" rel="noreferrer" className="btn secondaire petit" style={{ padding: '4px 10px', borderRadius: '6px' }}>
                        Voir
                      </a>
                      <form action={deleteProductAction} style={{ margin: 0 }}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton message={`Supprimer « ${p.title} » du catalogue ?`}>
                          <span style={{ color: '#ef4444' }}>×</span>
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
