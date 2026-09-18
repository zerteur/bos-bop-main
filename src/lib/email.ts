import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSetting } from "./settings";
import { DEFAULT_SITE_URL } from "./constants";

let transporter: Transporter | null = null;
let lastSmtpConfig = "";

const RASTER_FALLBACK = "/assets/images/logocarre.jpg";
const NAVY = "#1f2430";
const GOLD = "#ddc076";
const GOLD_SOFT = "#fbf7ea";
const MUTED = "#6b7280";
const TEXT = "#262b38";
const BG = "#f4f5f8";

export type EmailKind = "transactional" | "reply" | "newsletter";

export async function getEmailOrigin(): Promise<string> {
  const raw = (await getSetting("siteUrl", DEFAULT_SITE_URL)).trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAbsoluteUrl(path: string, origin: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("data:")) return trimmed;
  const prefix = origin.replace(/\/$/, "");
  return prefix + (trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
}

/** Images distantes en JPEG/PNG/GIF uniquement : Outlook et Gmail ignorent souvent le SVG. */
export function emailSafeImageUrl(path: string, origin: string, fallback = RASTER_FALLBACK): string {
  const candidate = path.trim() || fallback;
  const abs = toAbsoluteUrl(candidate, origin);
  if (/\.svg(\?|#|$)/i.test(abs) || abs.startsWith("data:image/svg")) {
    return toAbsoluteUrl(fallback, origin);
  }
  return abs;
}

export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
}

function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1).toLowerCase() : "";
}

function hostOfOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

const CONSUMER_MAILBOXES = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.fr",
  "yahoo.com",
  "hotmail.fr",
  "hotmail.com",
  "outlook.fr",
  "outlook.com",
  "live.fr",
  "live.com",
  "icloud.com",
  "me.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "protonmail.com",
  "pm.me",
]);

/** Boîtes grand public : From et domaine du site désalignés → spam quasi certain. */
export function isConsumerMailbox(email: string): boolean {
  return CONSUMER_MAILBOXES.has(domainOf(email));
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getTransporter() {
  const host = await getSetting("smtpHost", "");
  const user = await getSetting("smtpUser", "");
  if (!host || !user) return null;

  const port = await getSetting("smtpPort", "587");
  const secure = (await getSetting("smtpSecure", "0")) === "1";
  const pass = await getSetting("smtpPass", "");
  const configStr = `${host}:${port}:${secure}:${user}:${pass}`;
  if (transporter && lastSmtpConfig === configStr) return transporter;

  if (transporter) {
    try {
      transporter.close();
    } catch {
      /* ignore */
    }
  }

  const heloDomain = domainOf(user) || "bos-bop.fr";
  transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure,
    auth: { user, pass },
    name: heloDomain,
    pool: true,
    maxConnections: 1,
    maxMessages: 25,
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: { minVersion: "TLSv1.2" },
  });
  lastSmtpConfig = configStr;
  return transporter;
}

export async function getMailIdentity(): Promise<{
  from: string;
  smtpUser: string;
  senderName: string;
  origin: string;
  logoUrl: string;
  avatarUrl: string;
  postalAddress: string;
  fromDomain: string;
}> {
  const origin = await getEmailOrigin();
  const smtpUser = await getSetting("smtpUser", "");
  const senderName = (await getSetting("emailSenderName", "L'équipe BOS & BOP")).trim() || "L'équipe BOS & BOP";
  const customLogo = await getSetting("emailLogoUrl", RASTER_FALLBACK);
  const customAvatar = await getSetting("emailAvatarUrl", RASTER_FALLBACK);
  const postalAddress = (await getSetting("emailPostalAddress", "BOS & BOP — Orientation scolaire et professionnelle, Toulouse, France")).trim();
  const safeName = senderName.replace(/"/g, "").slice(0, 70);
  return {
    from: `"${safeName}" <${smtpUser}>`,
    smtpUser,
    senderName: safeName,
    origin,
    logoUrl: emailSafeImageUrl(customLogo, origin, RASTER_FALLBACK),
    avatarUrl: emailSafeImageUrl(customAvatar, origin, RASTER_FALLBACK),
    postalAddress,
    fromDomain: domainOf(smtpUser),
  };
}

export async function buildEmailHtml(opts: {
  heading: string;
  bodyHtml: string;
  preheader?: string;
  trackingSubject: string;
  trackingUser?: string;
  kind?: EmailKind;
  unsubscribeEmail?: string;
}): Promise<string> {
  const kind = opts.kind ?? "transactional";
  const { origin, senderName, logoUrl, avatarUrl, postalAddress } = await getMailIdentity();
  const heading = escapeHtml(opts.heading);
  const preheader = escapeHtml((opts.preheader || opts.heading).replace(/\s+/g, " ").slice(0, 140));
  const pixel = `${origin}/api/track/email?s=${encodeURIComponent(opts.trackingSubject)}${
    opts.trackingUser ? `&u=${encodeURIComponent(opts.trackingUser)}` : ""
  }`;
  const unsubUrl =
    kind === "newsletter" && opts.unsubscribeEmail
      ? `${origin}/api/unsubscribe?email=${encodeURIComponent(opts.unsubscribeEmail)}`
      : "";
  const mentionsUrl = `${origin}/mentions-legales`;

  let extraFooter = "";
  if (kind === "newsletter" && unsubUrl) {
    extraFooter = `Vous recevez cet e-mail car vous êtes inscrit à la newsletter BOS &amp; BOP.
      <a href="${escapeHtml(unsubUrl)}" style="color:${NAVY};text-decoration:underline;">Se désinscrire</a>`;
  } else if (kind === "transactional") {
    extraFooter = "Message automatique lié à votre commande ou à votre compte.";
  }

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
  <span style="color:${BG};font-size:1px;line-height:1px;">${preheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;">
          <tr>
            <td align="center" style="background-color:${NAVY};padding:24px;border-bottom:4px solid ${GOLD};">
              <img src="${escapeHtml(logoUrl)}" alt="BOS &amp; BOP" width="56" height="56" style="display:block;width:56px;height:56px;border:0;background:#ffffff;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:${TEXT};font-size:16px;line-height:1.55;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:${NAVY};font-weight:700;">${heading}</h1>
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${GOLD_SOFT};padding:20px 28px;border-top:1px solid #e3e6ee;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="54" valign="middle">
                    <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(senderName)}" width="48" height="48" style="display:block;width:48px;height:48px;border:0;border-radius:24px;background:#fff;" />
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font-weight:700;color:${NAVY};font-size:15px;">${escapeHtml(senderName)}</div>
                    <div style="color:${MUTED};font-size:13px;">BOS &amp; BOP</div>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #ead9a8;color:${MUTED};font-size:12px;line-height:1.5;">
                ${escapeHtml(postalAddress)}<br/>
                <a href="${escapeHtml(origin)}" style="color:${NAVY};">${escapeHtml(origin.replace(/^https?:\/\//, ""))}</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(mentionsUrl)}" style="color:${NAVY};">Mentions légales</a>
                ${extraFooter ? `<br/>${extraFooter}` : ""}
              </p>
            </td>
          </tr>
        </table>
        <img src="${escapeHtml(pixel)}" width="1" height="1" alt="" />
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Ancien point d'entrée : conserve le comportement pour les appels restants. */
export async function emailWrapper(title: string, content: string, preheader = "", trackingId = "") {
  return buildEmailHtml({
    heading: title,
    bodyHtml: content,
    preheader,
    trackingSubject: title,
    trackingUser: trackingId || undefined,
    kind: "transactional",
  });
}

export async function sendSiteEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  bodyHtml: string;
  preheader?: string;
  trackingUser?: string;
  trackingSubject?: string;
  kind?: EmailKind;
  replyTo?: string;
}): Promise<void> {
  const mailer = await getTransporter();
  if (!mailer) return;
  const identity = await getMailIdentity();
  if (!identity.smtpUser) return;

  const kind = opts.kind ?? "transactional";
  const trackingSubject = opts.trackingSubject || opts.subject;
  const body = sanitizeEmailHtml(opts.bodyHtml);
  const unsubUrl = `${identity.origin}/api/unsubscribe?email=${encodeURIComponent(opts.to)}`;

  const html = await buildEmailHtml({
    heading: opts.heading,
    bodyHtml: body,
    preheader: opts.preheader,
    trackingSubject,
    trackingUser: opts.trackingUser,
    kind,
    unsubscribeEmail: kind === "newsletter" ? opts.to : undefined,
  });

  const textParts = [
    opts.heading,
    "",
    htmlToPlainText(body),
    "",
    "--",
    identity.senderName,
    "BOS & BOP",
    identity.postalAddress,
    identity.origin,
  ];
  if (kind === "newsletter") {
    textParts.push("", `Se désinscrire : ${unsubUrl}`);
  }
  const text = textParts.join("\n");

  const msgDomain = identity.fromDomain || hostOfOrigin(identity.origin) || "bos-bop.fr";
  const headers: Record<string, string> = {
    "Message-ID": `<${Date.now()}.${Math.random().toString(36).slice(2)}@${msgDomain}>`,
  };
  if (kind === "newsletter") {
    headers["List-Unsubscribe"] = `<${unsubUrl}>, <mailto:${identity.smtpUser}?subject=unsubscribe>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    headers["List-Id"] = `"BOS & BOP newsletter" <newsletter.${msgDomain}>`;
    headers["Precedence"] = "bulk";
    headers["X-Auto-Response-Suppress"] = "OOF, AutoReply";
  } else if (kind === "transactional") {
    headers["Auto-Submitted"] = "auto-generated";
    headers["X-Auto-Response-Suppress"] = "OOF, AutoReply";
  }

  await mailer.sendMail({
    from: identity.from,
    to: opts.to,
    replyTo: opts.replyTo || identity.smtpUser,
    envelope: { from: identity.smtpUser, to: opts.to },
    subject: opts.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 140),
    text,
    html,
    headers,
    date: new Date(),
    encoding: "utf-8",
  });
}

function priceLabel(totalCents: number): string {
  return (totalCents / 100).toFixed(2).replace(".", ",") + " €";
}

export async function sendOrderConfirmationEmail(email: string, reference: string, totalCents: number) {
  await sendSiteEmail({
    to: email,
    subject: `Confirmation de votre commande ${reference}`,
    heading: "Commande bien reçue",
    trackingSubject: "Commande reçue",
    trackingUser: email,
    preheader: `Votre commande ${reference} a bien été enregistrée.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">Nous vous confirmons la bonne réception de votre commande <strong>${escapeHtml(reference)}</strong> d'un montant de <strong>${priceLabel(totalCents)}</strong>.</p>
      <p style="margin:0 0 12px;">Si vous avez choisi le paiement en ligne, vous recevrez un e-mail séparé dès la validation de votre transaction. Sinon, nous attendons votre règlement pour traiter votre commande.</p>
      <p style="margin:24px 0 0;">Merci de votre confiance.</p>
    `,
  });
}

export async function sendPaymentAndEbooksEmail(email: string, reference: string, links: { title: string; url: string }[]) {
  let ebookSection = "";
  if (links.length > 0) {
    const items = links
      .map(
        (l) => `
      <tr>
        <td style="padding:0 0 14px;">
          <div style="font-weight:600;color:${NAVY};margin-bottom:8px;">${escapeHtml(l.title)}</div>
          <a href="${escapeHtml(l.url)}" style="display:inline-block;background-color:${GOLD};color:${NAVY};text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">Lire le livre</a>
        </td>
      </tr>`,
      )
      .join("");
    ebookSection = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background-color:${GOLD_SOFT};border:1px solid ${GOLD};border-radius:8px;">
        <tr><td style="padding:22px;">
          <p style="margin:0 0 8px;color:#c4a95c;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">Vos livres numériques</p>
          <p style="margin:0 0 16px;font-size:14px;">Cliquez sur les boutons ci-dessous pour accéder à vos lectures :</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
          <p style="margin:8px 0 0;font-size:12px;color:${MUTED};"><em>L'accès est personnel. Vos e-books se lisent directement dans le navigateur.</em></p>
        </td></tr>
      </table>`;
  } else {
    ebookSection = `<p style="margin:24px 0 0;">Nous préparons actuellement l'expédition de vos articles physiques. Vous serez notifié(e) lors de l'envoi.</p>`;
  }

  await sendSiteEmail({
    to: email,
    subject: `Paiement validé — Commande ${reference}`,
    heading: "Paiement confirmé",
    trackingSubject: "Paiement confirmé",
    trackingUser: email,
    preheader: `Le paiement de la commande ${reference} a été validé.`,
    bodyHtml: `<p style="margin:0 0 12px;">Le paiement de votre commande <strong>${escapeHtml(reference)}</strong> a bien été validé.</p>${ebookSection}`,
  });
}

export async function sendShippingEmail(email: string, reference: string) {
  await sendSiteEmail({
    to: email,
    subject: `Votre commande ${reference} est en route`,
    heading: "Votre colis est en route",
    trackingSubject: "Commande expédiée",
    trackingUser: email,
    preheader: `Les articles de la commande ${reference} viennent d'être expédiés.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">Les articles de votre commande <strong>${escapeHtml(reference)}</strong> viennent d'être expédiés.</p>
      <p style="margin:0;">Vous devriez les recevoir très prochainement. Nous vous souhaitons une très bonne réception.</p>
    `,
  });
}

export async function sendTestEmail(email: string) {
  const mailer = await getTransporter();
  if (!mailer) throw new Error("SMTP non configuré ou incomplet.");
  await sendSiteEmail({
    to: email,
    subject: "Test de configuration SMTP BOS & BOP",
    heading: "Test de configuration",
    trackingSubject: "Test SMTP",
    trackingUser: email,
    preheader: "La configuration d'envoi d'e-mails fonctionne.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">Si vous lisez ce message, la configuration de votre serveur d'envoi (SMTP) fonctionne.</p>
      <p style="margin:0;">Logo, avatar, signature et pixel de suivi utilisent le même gabarit que tous les autres courriels du site.</p>
    `,
  });
}

export async function sendMagicCodeEmail(email: string, title: string, code: string) {
  await sendSiteEmail({
    to: email,
    subject: `Votre code d'accès : ${code}`,
    heading: "Code d'accès e-book",
    trackingSubject: "Code d'accès e-book",
    trackingUser: email,
    preheader: `Code de déverrouillage pour ${title}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Un nouvel appareil tente d'accéder à votre e-book <strong>${escapeHtml(title)}</strong>.</p>
      <p style="margin:0 0 8px;">Voici votre code de déverrouillage :</p>
      <p style="margin:16px 0;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#c4a95c;padding:18px;background:${GOLD_SOFT};border:1px solid ${GOLD};border-radius:8px;">${escapeHtml(code)}</p>
      <p style="margin:0;color:${MUTED};font-size:14px;">Ce code est valable pendant 15 minutes.</p>
    `,
  });
}
