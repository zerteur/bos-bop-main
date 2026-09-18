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
      <div className="entete-page" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1f2430' }}>🛒 Commandes</h1>
          <p className="subtitle" style={{ margin: '4px 0 0 0', color: '#888', fontSize: '14px' }}>Toutes les commandes passées sur la boutique.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <p className="vide" style={{ color: '#888', fontStyle: 'italic' }}>Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="panel" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <table className="liste" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Référence</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#666', fontWeight: 600 }}>Client</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Articles</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Total</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontWeight: 600 }}>Paiement</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #f9f9f9', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={`/admin/commandes/${order.id}`} style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>{order.reference}</Link>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#888' }}>{formatDate(order.createdAt)}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 500, color: '#1f2430' }}>{order.customerName}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                      {order.items.reduce((n, item) => n + item.quantity, 0)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{formatPrice(order.totalCents)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <span className={`badge ${BADGE_BY_STATUS[order.status] ?? "gris"}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <span className={`badge ${BADGE_BY_PAYMENT_STATUS[order.paymentStatus] ?? "gris"}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </span>
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
