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
