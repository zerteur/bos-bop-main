import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/shop";
import { formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

const BADGE_BY_STATUS: Record<string, string> = {
  NEW: "or",
  CONFIRMED: "bleu",
  SHIPPED: "vert",
  CANCELLED: "rouge",
};

const BADGE_BY_PAYMENT_STATUS: Record<string, string> = {
  UNPAID: "gris",
  PENDING: "or",
  PAID: "vert",
  FAILED: "rouge",
};

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <>
      <h1>Commandes</h1>
      <p className="subtitle">Les commandes passées sur la boutique du site.</p>

      {orders.length === 0 ? (
        <div className="panel">
          <p className="vide">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <table className="liste">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Client</th>
              <th>Articles</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Paiement</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/commandes/${order.id}`}>{order.reference}</Link>
                </td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.customerName}</td>
                <td>{order.items.reduce((n, item) => n + item.quantity, 0)}</td>
                <td>{formatPrice(order.totalCents)}</td>
                <td>
                  <span className={`badge ${BADGE_BY_STATUS[order.status] ?? "gris"}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td>
                  <span className={`badge ${BADGE_BY_PAYMENT_STATUS[order.paymentStatus] ?? "gris"}`}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
