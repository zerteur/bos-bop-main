import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatPrice } from "@/lib/shop";
import { formatDate, ORDER_STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [pages, unreadMessages, products, newOrders, shopEnabled, lastMessages, lastOrders] =
    await Promise.all([
      prisma.page.count(),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.product.count(),
      prisma.order.count({ where: { status: "NEW" } }),
      getSetting("shopEnabled", "0"),
      prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return (
    <>
      <h1>Tableau de bord</h1>
      <p className="subtitle">Bienvenue dans l&apos;administration du site bos-bop.fr</p>

      <div className="cards">
        <div className="card">
          <div className="kpi">{pages}</div>
          <div className="kpi-label">Pages du site — <Link href="/admin/pages">gérer</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{unreadMessages}</div>
          <div className="kpi-label">Messages non lus — <Link href="/admin/messages">consulter</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{products}</div>
          <div className="kpi-label">Livres au catalogue — <Link href="/admin/produits">gérer</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{newOrders}</div>
          <div className="kpi-label">Commandes à traiter — <Link href="/admin/commandes">voir</Link></div>
        </div>
      </div>

      {shopEnabled !== "1" && (
        <div className="notice info">
          La boutique en ligne est désactivée : le site est strictement identique au site
          d&apos;origine. Activez-la dans les <Link href="/admin/parametres">réglages</Link> quand
          vous souhaiterez vendre les livres.
        </div>
      )}

      <div className="grille-2">
        <div className="panel">
          <h2>Derniers messages</h2>
          {lastMessages.length === 0 ? (
            <p className="vide">Aucun message pour le moment.</p>
          ) : (
            <table className="liste">
              <tbody>
                {lastMessages.map((m) => (
                  <tr key={m.id} className={m.isRead ? undefined : "non-lu"}>
                    <td>{formatDate(m.createdAt)}</td>
                    <td>
                      <Link href={`/admin/messages/${m.id}`}>
                        {m.firstName} {m.lastName}
                      </Link>
                    </td>
                    <td>{m.subject || "(sans sujet)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <h2>Dernières commandes</h2>
          {lastOrders.length === 0 ? (
            <p className="vide">Aucune commande pour le moment.</p>
          ) : (
            <table className="liste">
              <tbody>
                {lastOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      <Link href={`/admin/commandes/${o.id}`}>{o.reference}</Link>
                    </td>
                    <td>{formatPrice(o.totalCents)}</td>
                    <td>
                      <span className="badge or">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
