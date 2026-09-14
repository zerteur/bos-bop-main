"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { getTransporter } from "@/lib/email";
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
    update: { name, phone, optIn }
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
  const content = String(formData.get("content") || "").trim();

  if (!subject || !content) throw new Error("Sujet et contenu requis");

  const customers = await prisma.customer.findMany({
    where: { optIn: true }
  });

  if (customers.length === 0) throw new Error("Aucun client inscrit à la newsletter.");

  const transporter = await getTransporter();
  if (!transporter) throw new Error("Erreur: SMTP non configuré.");

  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";
  const logoUrl = `data:image/svg+xml;base64,` + Buffer.from(require('fs').readFileSync('public/assets/images/145e34ff4dd5_logotype-bops-bop.svg')).toString('base64');

  // We could use the emailWrapper from @/lib/email, but here we can just do a simple one or import it.
  const { emailWrapper } = await import("@/lib/email");

  // It's better to send emails in chunks or Bcc them. Bcc is simpler for small numbers.
  // Actually, sending individual emails is better for anti-spam.

  const from = `"BOS & BOP" <${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}>`;
  const replyTo = `no-reply@bos-bop.fr`;
  const listUnsubscribe = `<mailto:${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}?subject=Désinscription>`;

  // Send individually to bypass Gmail image caching and provide unique tracking pixels
  // Promise.all with chunking or sequentially
  const BATCH_SIZE = 50;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (customer) => {
      const htmlContent = await emailWrapper(subject, `
    <h2 style="color: #1f2430; font-size: 20px; margin-top: 0;">${subject}</h2>
    <div style="color: #262b38; line-height: 1.6; white-space: pre-wrap;">${content}</div>
    <div style="margin-top: 30px; font-size: 12px; color: #9ba3b5; text-align: center; border-top: 1px solid #e3e6ee; padding-top: 15px;">
      Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
      <a href="${process.env.SITE_URL || 'https://www.bos-bop.fr'}/api/unsubscribe?email=${encodeURIComponent(customer.email)}" style="color: #ddc076; text-decoration: underline;">Se désinscrire en un clic</a>
    </div>
  `, "", customer.email);

      await transporter.sendMail({
        from,
        replyTo,
        to: customer.email,
        subject: subject,
        html: htmlContent,
        headers: {
          'List-Unsubscribe': listUnsubscribe,
          'Precedence': 'bulk',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
        }
      }).catch(err => console.error("Erreur d'envoi newsletter à", customer.email, err));
    }));
  }

  // Sauvegarder l'historique
  try {
    const historyStr = await getSetting("newsletterHistory", "[]");
    let history = JSON.parse(historyStr);
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      subject,
      recipientsCount: customers.length
    });
    // Garder les 50 dernières
    history = history.slice(0, 50);
    await setSetting("newsletterHistory", JSON.stringify(history));
  } catch (e) {
    console.error("Impossible de sauvegarder l'historique", e);
  }
}

