"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { getTransporter, sendSiteEmail, sanitizeEmailHtml } from "@/lib/email";
import { getSetting, setSetting } from "@/lib/settings";

export async function addCustomerAction(formData: FormData) {
  await requireSession();
  const email = String(formData.get("email")).toLowerCase().trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const optIn = formData.get("optIn") === "1";

  if (!email) throw new Error("Email requis");

  await prisma.customer.upsert({
    where: { email },
    create: { email, name, phone, optIn },
    update: { name, phone, optIn },
  });

  revalidatePath("/admin/crm");
}

export async function deleteCustomerAction(id: number) {
  await requireSession();
  await prisma.customer.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/crm");
}

export async function sendNewsletterAction(formData: FormData) {
  await requireSession();
  const subject = String(formData.get("subject") || "").trim();
  const content = sanitizeEmailHtml(String(formData.get("content") || "").trim());

  if (!subject || !content) throw new Error("Sujet et contenu requis");

  const customers = await prisma.customer.findMany({
    where: { optIn: true },
  });

  if (customers.length === 0) throw new Error("Aucun client inscrit à la newsletter.");
  if (!(await getTransporter())) throw new Error("Erreur: SMTP non configuré.");

  for (const customer of customers) {
    try {
      await sendSiteEmail({
        to: customer.email,
        subject,
        heading: subject,
        bodyHtml: `<div style="color:#262b38;line-height:1.6;">${content}</div>`,
        preheader: subject,
        trackingUser: customer.email,
        trackingSubject: subject,
        kind: "newsletter",
      });
    } catch (err) {
      console.error("Erreur d'envoi newsletter à", customer.email, err);
    }
    await new Promise((r) => setTimeout(r, 180));
  }

  try {
    const historyStr = await getSetting("newsletterHistory", "[]");
    let history = JSON.parse(historyStr);
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      subject,
      recipientsCount: customers.length,
    });
    history = history.slice(0, 50);
    await setSetting("newsletterHistory", JSON.stringify(history));
  } catch (e) {
    console.error("Impossible de sauvegarder l'historique", e);
  }

  revalidatePath("/admin/crm");
}
