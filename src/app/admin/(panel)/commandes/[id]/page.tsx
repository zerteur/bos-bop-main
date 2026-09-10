import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/shop";
import { formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { updateOrderStatusAction, checkOrderPaymentAction } from "@/lib/admin-actions";
import { reconcileOrderPayment } from "@/lib/orders";

export const dynamic = "force-dynamic";

const BADGE_BY_PAYMENT_STATUS: Record<string, string> = {
  UNPAID: "gris",
  PENDING: "or",
  PAID: "vert",
  FAILED: "rouge",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  // Commande en attente d'un paiement Stripe : on revérifie auprès de Stripe
  // au moment de l'affichage. Si le paiement est bien passé, le statut est mis
  // à jour ici même — sans dépendre du webhook (voir src/lib/orders.ts).
  if (order.paymentStatus === "PENDING") {
    const reconciled = await reconcileOrderPayment(order.reference);
    if (reconciled) {
      order.paymentStatus = reconciled.paymentStatus;
      order.status = reconciled.status;
    }
  }

  return (
    <>
      <div className="entete-page">
        <h1>Commande {order.reference}</h1>
        <Link href="/admin/commandes" className="btn secondaire">
          ← Toutes les commandes
        </Link>
      </div>

      <div className="grille-2">
        <div className="panel">
          <h2>Client</h2>
          <table className="liste">
            <tbody>
              <tr><th>Nom</th><td>{order.customerName}</td></tr>
              <tr><th>Email</th><td><a href={`mailto:${order.email}`}>{order.email}</a></td></tr>
              <tr><th>Téléphone</th><td>{order.phone || "—"}</td></tr>
              <tr><th>Adresse</th><td style={{ whiteSpace: "pre-wrap" }}>{order.address}</td></tr>
              {order.note && <tr><th>Remarque</th><td style={{ whiteSpace: "pre-wrap" }}>{order.note}</td></tr>}
              <tr><th>Passée le</th><td>{formatDate(order.createdAt)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Statut</h2>
          <p>
            Statut actuel :{" "}
            <span className="badge or">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </p>
          <p>
            Paiement :{" "}
            <span className={`badge ${BADGE_BY_PAYMENT_STATUS[order.paymentStatus] ?? "gris"}`}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </span>
          </p>
          <form action={updateOrderStatusAction} className="actions-ligne">
            <input type="hidden" name="id" value={order.id} />
            <select name="status" defaultValue={order.status}>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn principal petit">
              Mettre à jour
            </button>
          </form>
          <p className="subtitle" style={{ marginTop: 14 }}>
            {order.paymentStatus === "PAID"
              ? "Paiement reçu automatiquement via Stripe."
              : order.paymentStatus === "PENDING"
                ? "Le client a été redirigé vers Stripe pour payer ; en attente de confirmation. Le statut est revérifié auprès de Stripe à chaque ouverture de cette page."
                : order.paymentStatus === "FAILED"
                  ? "Le paiement Stripe a échoué ou a expiré : contactez le client si besoin."
                  : "Paiement en ligne non utilisé pour cette commande : contactez le client pour convenir du règlement, puis passez la commande en « Confirmée »."}
          </p>
          {order.paymentStatus === "PENDING" && (
            <form action={checkOrderPaymentAction} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={order.id} />
              <button type="submit" className="btn secondaire petit">
                Vérifier le paiement maintenant
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Articles</h2>
        <table className="liste">
          <thead>
            <tr>
              <th>Ouvrage</th>
              <th>Prix unitaire</th>
              <th>Quantité</th>
              <th>Sous-total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.product ? (
                    <Link href={`/admin/produits/${item.product.id}`}>{item.titleSnapshot}</Link>
                  ) : (
                    item.titleSnapshot
                  )}
                </td>
                <td>{formatPrice(item.unitCents)}</td>
                <td>{item.quantity}</td>
                <td>{formatPrice(item.unitCents * item.quantity)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3}><strong>Total</strong></td>
              <td><strong>{formatPrice(order.totalCents)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
