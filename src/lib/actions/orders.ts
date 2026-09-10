"use server";

// Actions sur les commandes de la boutique.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";
import { formString as str } from "../forms";
import { reconcileOrderPayment } from "../orders";

const ORDER_STATUSES = new Set(["NEW", "CONFIRMED", "SHIPPED", "CANCELLED"]);

export async function updateOrderStatusAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const status = str(formData, "status", 20);
  if (ORDER_STATUSES.has(status)) {
    await prisma.order.update({ where: { id }, data: { status } });
  }
  revalidatePath("/admin/commandes");
  redirect(`/admin/commandes/${id}`);
}

// Interroge Stripe pour une commande « en attente » et met à jour son statut
// si le paiement est passé — permet de débloquer manuellement depuis le
// tableau de bord une commande dont le webhook n'a pas abouti.
export async function checkOrderPaymentAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const order = await prisma.order.findUnique({ where: { id }, select: { reference: true } });
  if (order) await reconcileOrderPayment(order.reference);
  revalidatePath(`/admin/commandes/${id}`);
  redirect(`/admin/commandes/${id}`);
}
