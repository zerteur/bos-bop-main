// Aides d'affichage pour l'administration

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  SHIPPED: "Expédiée",
  CANCELLED: "Annulée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Paiement manuel",
  PENDING: "En attente de paiement",
  PAID: "Payée (Stripe)",
  FAILED: "Paiement échoué",
};
