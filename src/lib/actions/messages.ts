"use server";

// Actions sur les messages du formulaire de contact.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { requireSession } from "../auth";

export async function toggleMessageReadAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (message) {
    await prisma.contactMessage.update({
      where: { id },
      data: { isRead: !message.isRead },
    });
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function deleteMessageAction(formData: FormData) {
  await requireSession();
  await prisma.contactMessage.delete({ where: { id: Number(formData.get("id")) } });
  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}


export async function replyToMessageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const content = formData.get("content")?.toString() || "";
  const subject = formData.get("subject")?.toString() || "";

  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message || !message.email) throw new Error("Message introuvable ou sans email.");

  const { getTransporter, emailWrapper } = await import("../email");
  const mailer = await getTransporter();
  if (!mailer) throw new Error("Erreur: SMTP non configuré.");
  
  const { getSetting } = await import("../settings");
  const user = await getSetting("smtpUser", "");
  
  await mailer.sendMail({
    from: `"Boutique BOS & BOP" <${user}>`,
    to: message.email,
    subject: subject || `Re: ${message.subject}`,
    html: await emailWrapper(subject || "Réponse à votre message", content)
  });

  return { success: true };
}
