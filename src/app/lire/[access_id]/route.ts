import { prisma } from "@/lib/db";
import { renderNotFound, HTML_HEADERS, renderPage } from "@/lib/render";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { sendTestEmail } from "@/lib/email"; // On réutilisera le transporter

// Pour envoyer le code magique :
async function sendMagicCodeEmail(email: string, title: string, code: string) {
  const { getSetting } = await import("@/lib/settings");
  const nodemailer = await import("nodemailer");
  
  const host = await getSetting("smtpHost", "");
  const user = await getSetting("smtpUser", "");
  if (!host || !user) return;
  const port = await getSetting("smtpPort", "587");
  const secure = await getSetting("smtpSecure", "0") === "1";
  const pass = await getSetting("smtpPass", "");

  const mailer = nodemailer.createTransport({ host, port: Number(port) || 587, secure, auth: { user, pass } });
  
  await mailer.sendMail({
    from: `"Boutique BOS & BOP" <${user}>`,
    to: email,
    subject: `Votre code d'accès : ${code}`,
    html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #262b38; background-color: #f4f5f8; padding: 40px 20px; line-height: 1.5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #1f2430; padding: 30px; text-align: center; border-bottom: 4px solid #ddc076;">
          <img src="https://www.bos-bop.fr/assets/images/4cd7c0f7b92c_logotype-bops-bop.svg" alt="BOS & BOP" style="height: 50px; width: auto; display: block; margin: 0 auto; background-color: #ffffff; padding: 10px 20px; border-radius: 8px;" />
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2430; margin-top: 0; font-size: 20px;">Code d'accès pour "${title}"</h2>
          <p>Un nouvel appareil tente d'accéder à votre e-book.</p>
          <p>Voici votre code de déverrouillage :</p>
          <div style="text-align:center;font-size:36px;font-weight:bold;letter-spacing:8px;color:#c4a95c;padding:20px;background:#fbf7ea;border-radius:8px;border:1px solid #ddc076;margin:25px 0;">
            ${code}
          </div>
          <p>Ce code est valable pendant 15 minutes.</p>
        </div>
        <div style="background-color: #fbf7ea; padding: 20px; text-align: center; border-top: 1px solid #e3e6ee; color: #6b7280; font-size: 13px;">
          <p style="margin: 0;">L'équipe BOS & BOP</p>
          <p style="margin: 5px 0 0 0;">Ce courriel a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </div>
    `,
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ access_id: string }> }) {
  const { access_id } = await params;
  
  const access = await prisma.purchaseAccess.findUnique({
    where: { id: access_id },
    include: { product: true, order: true, devices: true },
  });

  if (!access || !access.product.pdfPath) return renderNotFound();

  const deviceCookie = request.cookies.get(`ebook_token_${access_id}`)?.value;
  const isAuthorized = deviceCookie && access.devices.some(d => d.deviceCookie === deviceCookie);

  const searchParams = request.nextUrl.searchParams;
  const submittedCode = searchParams.get("code");
  const sendRequest = searchParams.get("send");

  // GESTION DE L'AUTORISATION
  if (!isAuthorized) {
    let message = "";
    
    // Si un code est soumis
    if (submittedCode) {
      if (access.magicCode === submittedCode && access.magicCodeExpiresAt && access.magicCodeExpiresAt > new Date()) {
        if (access.devices.length >= 5) {
          message = "<div class='notice erreur'>Vous avez atteint la limite de 5 appareils autorisés pour cet e-book.</div>";
        } else {
          // Création d'un nouvel appareil
          const newToken = crypto.randomBytes(32).toString("hex");
          await prisma.accessDevice.create({
            data: {
              purchaseAccessId: access_id,
              deviceCookie: newToken,
              userAgent: request.headers.get("user-agent") || "",
              ipAddress: request.headers.get("x-forwarded-for") || "",
            }
          });
          // Invalidation du code magique
          await prisma.purchaseAccess.update({
            where: { id: access_id },
            data: { magicCode: null, magicCodeExpiresAt: null }
          });
          
          // Redirection avec cookie
          const response = new Response(null, {
            status: 302,
            headers: {
              "Location": `/lire/${access_id}`,
              "Set-Cookie": `ebook_token_${access_id}=${newToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000` // 1 an
            }
          });
          return response;
        }
      } else {
        message = "<div class='notice erreur'>Le code est incorrect ou a expiré.</div>";
      }
    }
    
    // Si on demande un envoi de code
    if (sendRequest && !submittedCode) {
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
      await prisma.purchaseAccess.update({
        where: { id: access_id },
        data: {
          magicCode: code,
          magicCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
        }
      });
      await sendMagicCodeEmail(access.order.email, access.product.title, code);
      message = "<div class='notice ok'>Un code à 6 chiffres a été envoyé à votre adresse e-mail.</div>";
    }

    // Affichage de la page de demande de code
    const fakeAuthPage = {
      id: 0,
      slug: `lire/${access_id}`,
      title: `Accès restreint - ${access.product.title}`,
      breadcrumbLabel: access.product.title,
      metaDescription: "",
      metaKeywords: "",
      bodyClass: "bootstrap bd-body-7 bd-pagebackground-104 bd-margins",
      headHtml: "",
      sharePath: "",
      contentHtml: `
<div style="max-width: 480px; margin: 60px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <div style="background-color: var(--encre, #1f2430); padding: 30px 20px; text-align: center; border-bottom: 4px solid var(--or, #ddc076);">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Accès Sécurisé</h1>
    <p style="color: #9ba3b5; margin: 8px 0 0 0; font-size: 14px;">${access.product.title}</p>
  </div>
  
  <div style="padding: 30px;">
    <p style="color: #262b38; margin-top: 0; margin-bottom: 25px; line-height: 1.6; text-align: center;">
      Cet e-book est protégé. Pour y accéder depuis ce nouvel appareil, veuillez confirmer votre identité.
    </p>

    ${message}

    <div style="background: var(--fond, #f4f5f8); border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center;">
      <p style="margin-top: 0; margin-bottom: 15px; font-size: 14px; color: #6b7280;">Vous n'avez pas de code ?</p>
      <form method="GET" action="/lire/${access_id}">
        <input type="hidden" name="send" value="1" />
        <button type="submit" class="btn secondaire" style="width: 100%; display: inline-flex; justify-content: center; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          Recevoir un code par email
        </button>
      </form>
    </div>

    <form method="GET" action="/lire/${access_id}">
      <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #262b38; text-align: center;">J'ai mon code à 6 chiffres :</label>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <input type="text" name="code" placeholder="• • • • • •" required autocomplete="off" style="font-size: 28px; letter-spacing: 8px; text-align: center; width: 100%; padding: 15px; border-radius: 8px; border: 2px solid #e3e6ee; margin-bottom: 20px; font-weight: bold; color: #1f2430; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--or, #ddc076)'" onblur="this.style.borderColor='#e3e6ee'" />
        
        <button type="submit" class="btn principal" style="width: 100%; padding: 12px; font-size: 16px;">
          Déverrouiller l'accès
        </button>
      </div>
    </form>
  </div>
  
  <div style="background: #fbf7ea; padding: 15px; text-align: center; border-top: 1px solid #e3e6ee;">
    <p style="margin: 0; font-size: 13px; color: #6b7280; font-weight: 500;">Appareils enregistrés : <strong style="color: #1f2430;">${access.devices.length} / 5</strong></p>
  </div>
</div>`,
      extraTail: "",
      editorMode: "html",
      blocksJson: "[]",
      published: true,
      isLegacy: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const html = await renderPage(fakeAuthPage as any);
    return new Response(html, { headers: HTML_HEADERS });
  }

  // AFFICHAGE DU LECTEUR PDF SI AUTORISÉ
  const epubButton = access.product.epubPath
    ? `<div style="text-align: center; margin-bottom: 20px;">
         <a href="/api/download-epub/${access_id}" class="btn principal" style="display: inline-flex; align-items: center; gap: 8px;">
           <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-3 3m0 0l-3-3m3 3V4"></path></svg>
           Télécharger au format EPUB (Liseuse)
         </a>
       </div>`
    : "";

  const fakePage = {
    id: 0,
    slug: `lire/${access_id}`,
    title: `Lecture de ${access.product.title}`,
    breadcrumbLabel: access.product.title,
    metaDescription: "",
    metaKeywords: "",
    bodyClass: "bootstrap bd-body-7 bd-pagebackground-104 bd-margins",
    headHtml: "",
    sharePath: "",
    contentHtml: `<div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
      <h1 style="margin-bottom: 20px; text-align: center;">${access.product.title}</h1>
      ${epubButton}
      <div style="background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <iframe 
          src="/api/read-ebook/${access_id}#toolbar=0&navpanes=0&scrollbar=0" 
          style="width: 100%; height: 80vh; border: none; border-radius: 4px;"
          oncontextmenu="return false;"
        ></iframe>
      </div>
    </div>`,
    extraTail: "<script>document.addEventListener(`contextmenu`, e => e.preventDefault());</script>",
    editorMode: "html",
    blocksJson: "[]",
    published: true,
    isLegacy: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const html = await renderPage(fakePage as any);
  return new Response(html, { headers: HTML_HEADERS });
}
