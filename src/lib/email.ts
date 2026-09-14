import nodemailer from "nodemailer";
import { getSetting } from "./settings";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let lastSmtpConfig = "";

export async function getTransporter() {
  const host = await getSetting("smtpHost", "");
  const user = await getSetting("smtpUser", "");
  
  if (!host || !user) return null;

  const port = await getSetting("smtpPort", "587");
  const secure = await getSetting("smtpSecure", "0") === "1";
  const pass = await getSetting("smtpPass", "");

  const configStr = `${host}:${port}:${secure}:${user}:${pass}`;
  if (transporter && lastSmtpConfig === configStr) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure,
    auth: { user, pass },
    name: "bos-bop.fr",
  });
  
  const { htmlToText } = require('nodemailer-html-to-text');
  transporter.use('compile', htmlToText());
  
  lastSmtpConfig = configStr;
  
  return transporter;
}

// Composant de base (Wrapper HTML) pour tous les e-mails
export async function emailWrapper(title: string, content: string, preheader: string = "", trackingId: string = "") {
  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";
  const customLogo = await getSetting("emailLogoUrl", "/assets/images/4cd7c0f7b92c_logotype-bops-bop.svg");
  const logoUrl = customLogo.startsWith("http") ? customLogo : `${siteUrl}${customLogo}`;
  
  const customAvatar = await getSetting("emailAvatarUrl", "/assets/images/logocarre.jpg");
  const avatarUrl = customAvatar.startsWith("http") ? customAvatar : `${siteUrl}${customAvatar}`;
  
  const senderName = await getSetting("emailSenderName", "L'équipe BOS & BOP");
  
  return `
    
      <!-- Pré-header caché pour les messageries (ex: Gmail snippet) -->
      <div style="display: none; max-height: 0px; overflow: hidden; font-size: 0px; line-height: 0px; mso-hide: all;">
        ${preheader || title}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </div>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #262b38; background-color: #f4f5f8; padding: 40px 20px; line-height: 1.5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        
        <!-- En-tête -->
        <div style="background-color: #1f2430; padding: 30px; text-align: center; border-bottom: 4px solid #ddc076;">
          <img src="${logoUrl}" alt="BOS & BOP" style="height: 50px; width: auto; display: block; margin: 0 auto; background-color: #ffffff; padding: 10px 20px; border-radius: 8px;" />
        </div>

        <!-- Contenu Principal -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2430; margin-top: 0; font-size: 20px;">${title}</h2>
          ${content}
        </div>

        <!-- Pied de page -->
        <div style="background-color: #fbf7ea; padding: 20px; text-align: left; border-top: 1px solid #e3e6ee; color: #6b7280; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <img src="${avatarUrl}" alt="${senderName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #ddc076; background-color: #fff;" />
            <div>
              <p style="margin: 0; font-weight: bold; color: #1f2430; font-size: 16px;">${senderName}</p>
              <p style="margin: 0; color: #6e778c; font-size: 14px;">BOS & BOP</p>
            </div>
          </div>
          <p style="margin: 15px 0 0 0; text-align: center; border-top: 1px solid rgba(221,192,118,0.3); padding-top: 15px;">Ce courriel a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </div>
    <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "Organization",
      "name": "${senderName}",
      "url": "${siteUrl}",
      "logo": "${avatarUrl}",
      "image": "${avatarUrl}"
    }
    </script>
    <img src="${siteUrl}/api/track/email?s=${encodeURIComponent(title)}${trackingId ? `&u=${encodeURIComponent(trackingId)}` : ''}" width="1" height="1" alt="" style="display:none; visibility:hidden; width:0; height:0;" />
  `;
}

export async function sendOrderConfirmationEmail(email: string, reference: string, totalCents: number) {
  const mailer = await getTransporter();
  if (!mailer) return;
  const user = await getSetting("smtpUser", "");
  
  await mailer.sendMail({
    from: `"Boutique BOS & BOP" <${user}>`,
    to: email,
    subject: `Confirmation de votre commande ${reference}`,
    html: await emailWrapper(
      "Commande bien reçue !",
      `
      <p>Bonjour,</p>
      <p>Nous vous confirmons la bonne réception de votre commande <strong>${reference}</strong> d'un montant de <strong>${(totalCents / 100).toFixed(2).replace('.', ',')} €</strong>.</p>
      <p>Si vous avez choisi le paiement en ligne, vous recevrez un e-mail séparé dès la validation de votre transaction. Sinon, nous attendons votre règlement pour traiter votre commande.</p>
      <p style="margin-top: 25px;">Merci de votre confiance !</p>
      `
    ),
  });
}

export async function sendPaymentAndEbooksEmail(email: string, reference: string, links: { title: string, url: string }[]) {
  const mailer = await getTransporter();
  if (!mailer) return;
  const user = await getSetting("smtpUser", "");
  
  let ebookSection = "";
  if (links.length > 0) {
    const linksHtml = links.map(l => `
      <li style="margin-bottom: 15px;">
        <div style="font-weight: 600; color: #1f2430; margin-bottom: 5px;">${l.title}</div>
        <a href="${l.url}" style="display: inline-block; background-color: #ddc076; color: #1f2430; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Lire le livre</a>
      </li>
    `).join("");

    ebookSection = `
      <div style="margin-top: 35px; padding: 25px; background-color: #fbf7ea; border-radius: 8px; border: 1px solid #ddc076;">
        <h3 style="color: #c4a95c; margin-top: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Vos livres numériques (E-books)</h3>
        <p style="font-size: 14px; margin-bottom: 20px;">Cliquez sur les boutons ci-dessous pour accéder à vos lectures :</p>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${linksHtml}
        </ul>
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px; margin-bottom: 0;"><em>Note : L'accès est strictement personnel et sécurisé. Vos e-books se lisent directement dans le navigateur.</em></p>
      </div>
    `;
  } else {
    ebookSection = `<p style="margin-top: 25px;">Nous préparons actuellement l'expédition de vos articles physiques. Vous serez notifié(e) lors de l'envoi.</p>`;
  }
  
  await mailer.sendMail({
    from: `"Boutique BOS & BOP" <${user}>`,
    to: email,
    subject: `Paiement validé - Commande ${reference}`,
    html: await emailWrapper(
      "Paiement confirmé",
      `
      <p>Excellente nouvelle ! Le paiement de votre commande <strong>${reference}</strong> a bien été validé.</p>
      ${ebookSection}
      `
    ),
  });
}

export async function sendShippingEmail(email: string, reference: string) {
  const mailer = await getTransporter();
  if (!mailer) return;
  const user = await getSetting("smtpUser", "");
  
  await mailer.sendMail({
    from: `"Boutique BOS & BOP" <${user}>`,
    to: email,
    subject: `Votre commande ${reference} est en route !`,
    html: await emailWrapper(
      "Votre colis est en route !",
      `
      <p>Bonjour,</p>
      <p>Nous avons le plaisir de vous annoncer que les articles de votre commande <strong>${reference}</strong> viennent d'être expédiés.</p>
      <p>Vous devriez les recevoir très prochainement.</p>
      <p style="margin-top: 25px;">Nous vous souhaitons une très bonne réception !</p>
      `
    ),
  });
}

export async function sendTestEmail(email: string) {
  const mailer = await getTransporter();
  if (!mailer) throw new Error("SMTP non configuré ou incomplet.");
  const user = await getSetting("smtpUser", "");
  
  await mailer.sendMail({
    from: `"BOS & BOP (Test)" <${user}>`,
    to: email,
    subject: "Test de configuration SMTP BOS & BOP",
    html: await emailWrapper(
      "Test de configuration",
      `
      <p>Bonjour !</p>
      <p>Si vous lisez ce message, c'est que la configuration de votre serveur d'envoi d'e-mails (SMTP) fonctionne parfaitement.</p>
      <p>Le design des e-mails a également été mis à jour pour respecter la charte graphique de BOS & BOP.</p>
      `
    ),
  });
}
