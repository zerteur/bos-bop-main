import { getSetting } from "@/lib/settings";
import { DEFAULT_SITE_URL } from "@/lib/constants";
import {
  saveSettingsAction,
  changePasswordAction,
  saveStripeSettingsAction,
  saveRecaptchaSettingsAction,
  saveSmtpSettingsAction,
  saveEmailDesignSettingsAction,
  testSmtpAction,
} from "@/lib/admin-actions";
import { isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";
import { getRecaptchaSiteKey, isRecaptchaSecretConfigured } from "@/lib/recaptcha";
import { getPublicOriginFromHeaders } from "@/lib/http";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { type: "ok" | "erreur"; text: string }> = {
  "1": { type: "ok", text: "Réglages enregistrés." },
  mdp: { type: "ok", text: "Mot de passe modifié." },
  "mdp-court": { type: "erreur", text: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
  "mdp-differents": { type: "erreur", text: "La confirmation ne correspond pas au nouveau mot de passe." },
  "mdp-actuel": { type: "erreur", text: "Le mot de passe actuel est incorrect." },
  "email-ok": { type: "ok", text: "L'e-mail de test a été envoyé avec succès !" },
  "email-fail": { type: "erreur", text: "Échec de l'envoi de l'e-mail. Vérifiez vos identifiants SMTP." },
  "email-vide": { type: "erreur", text: "L'adresse e-mail de test est requise." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  const notice = MESSAGES[ok ?? ""] ?? MESSAGES[erreur ?? ""];
  const [siteUrl, shopEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassOk, emailLogoUrl, emailAvatarUrl, emailSenderName] = await Promise.all([
    getSetting("siteUrl", DEFAULT_SITE_URL),
    getSetting("shopEnabled", "0"),
    getSetting("smtpHost", ""),
    getSetting("smtpPort", "587"),
    getSetting("smtpSecure", "0"),
    getSetting("smtpUser", ""),
    getSetting("smtpPass", "").then(p => !!p),
    getSetting("emailLogoUrl", "/assets/images/4cd7c0f7b92c_logotype-bops-bop.svg"),
    getSetting("emailAvatarUrl", "/assets/images/logocarre.jpg"),
    getSetting("emailSenderName", "L'équipe BOS & BOP"),
  ]);
  const [stripeKeyOk, stripeWebhookOk, publicOrigin, recaptchaSiteKey, recaptchaSecretOk] =
    await Promise.all([
      isStripeConfigured(),
      isStripeWebhookConfigured(),
      getPublicOriginFromHeaders(),
      getRecaptchaSiteKey(),
      isRecaptchaSecretConfigured(),
    ]);
  const recaptchaSiteLockedByEnv = !!process.env.RECAPTCHA_SITE_KEY;
  const recaptchaSecretLockedByEnv = !!process.env.RECAPTCHA_SECRET_KEY;
  // Dérivée de la requête d'administration en cours (adresse actuellement
  // utilisée pour accéder au site), jamais du réglage "Adresse publique du
  // site" ci-dessus : celui-ci se périme dès que le site change de domaine
  // (préproduction, bascule finale du DNS…) et Stripe redirigerait alors les
  // clients — et enverrait ses webhooks — vers une adresse morte (voir
  // getPublicOrigin/getPublicOriginFromHeaders dans src/lib/http.ts).
  const webhookUrl = `${publicOrigin}/api/stripe/webhook`;
  // Une variable d'environnement, si définie, l'emporte toujours sur le
  // réglage enregistré ici (voir src/lib/stripe.ts) : le signaler pour ne
  // pas laisser croire qu'un enregistrement depuis cette page a un effet.
  const stripeKeyLockedByEnv = !!process.env.STRIPE_SECRET_KEY;
  const stripeWebhookLockedByEnv = !!process.env.STRIPE_WEBHOOK_SECRET;

  return (
    <>
      <h1>Réglages</h1>
      <p className="subtitle">Paramètres généraux du site et de la boutique.</p>
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <div className="panel">
        <h2>Site</h2>
        <form action={saveSettingsAction}>
          <label className="champ">
            Adresse publique du site{" "}
            <span className="aide">(utilisée pour les liens de partage des pages)</span>
            <input type="url" name="siteUrl" defaultValue={siteUrl} />
          </label>
          <label className="champ-inline">
            <input type="checkbox" name="shopEnabled" value="1" defaultChecked={shopEnabled === "1"} />
            Activer la boutique en ligne (catalogue <code className="slug">/livres</code>, panier et commandes)
          </label>
          <p className="subtitle">
            Tant que la boutique est désactivée, le site public reste strictement identique au
            site d&apos;origine. Après activation, pensez à ajouter une entrée «&nbsp;Les
            livres&nbsp;» pointant vers <code className="slug">/livres</code> dans le menu du
            site.
          </p>
          <button type="submit" className="btn principal">
            Enregistrer
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Paiement en ligne (Stripe)</h2>
        <p>
          Clé secrète Stripe :{" "}
          <span className={`badge ${stripeKeyOk ? "vert" : "gris"}`}>
            {stripeKeyOk ? "Configurée" : "Non configurée"}
          </span>
        </p>
        <p>
          Webhook de confirmation :{" "}
          <span className={`badge ${stripeWebhookOk ? "vert" : "gris"}`}>
            {stripeWebhookOk ? "Configuré" : "Non configuré"}
          </span>
        </p>
        {stripeKeyOk ? (
          <p className="subtitle">
            Le paiement par carte est actif : à la validation d&apos;une commande, le client est
            redirigé vers une page de paiement Stripe sécurisée.
          </p>
        ) : (
          <p className="subtitle">
            Tant qu&apos;aucune clé n&apos;est configurée, la boutique fonctionne normalement :
            après validation, une commande est enregistrée et vous convenez du règlement
            directement avec le client (comme aujourd&apos;hui).
          </p>
        )}
        <p className="subtitle">
          Adresse de webhook à renseigner dans le tableau de bord Stripe :{" "}
          <code className="slug">{webhookUrl}</code> — marche à suivre complète dans le README,
          section « Connecter Stripe ». Cette adresse correspond au domaine actuellement utilisé
          pour accéder au site ; si vous changez de domaine (mise en ligne définitive, par
          exemple), pensez à mettre à jour l&apos;endpoint webhook correspondant dans Stripe.
        </p>

        <form action={saveStripeSettingsAction}>
          <label className="champ">
            Clé secrète Stripe{" "}
            <span className="aide">
              ({stripeKeyOk ? "déjà enregistrée — " : ""}laisser vide pour{" "}
              {stripeKeyOk ? "ne pas la changer" : "ne rien modifier"})
            </span>
            <input
              type="password"
              name="stripeSecretKey"
              placeholder={stripeKeyOk ? "••••••••••••••••••••" : "sk_live_… ou sk_test_…"}
              autoComplete="off"
              disabled={stripeKeyLockedByEnv}
              maxLength={300}
            />
          </label>
          {stripeKeyLockedByEnv && (
            <p className="subtitle">
              Une variable d&apos;environnement <code className="slug">STRIPE_SECRET_KEY</code> est
              définie sur le serveur : elle est utilisée en priorité et ce champ reste sans effet
              tant qu&apos;elle est présente. Retirez-la du fichier <code className="slug">.env</code>{" "}
              si vous préférez gérer la clé depuis cette page.
            </p>
          )}

          <label className="champ">
            Secret de signature du webhook{" "}
            <span className="aide">
              ({stripeWebhookOk ? "déjà enregistré — " : ""}laisser vide pour{" "}
              {stripeWebhookOk ? "ne pas le changer" : "ne rien modifier"})
            </span>
            <input
              type="password"
              name="stripeWebhookSecret"
              placeholder={stripeWebhookOk ? "••••••••••••••••••••" : "whsec_…"}
              autoComplete="off"
              disabled={stripeWebhookLockedByEnv}
              maxLength={300}
            />
          </label>
          {stripeWebhookLockedByEnv && (
            <p className="subtitle">
              Une variable d&apos;environnement <code className="slug">STRIPE_WEBHOOK_SECRET</code>{" "}
              est définie sur le serveur : elle est utilisée en priorité et ce champ reste sans
              effet tant qu&apos;elle est présente.
            </p>
          )}

          <button type="submit" className="btn principal" disabled={stripeKeyLockedByEnv && stripeWebhookLockedByEnv}>
            Enregistrer
          </button>
          {(stripeKeyOk || stripeWebhookOk) && (
            <>
              {" "}
              <button
                type="submit"
                name="retirer"
                value="1"
                className="btn secondaire"
                formNoValidate
              >
                Retirer les clés enregistrées
              </button>
            </>
          )}
        </form>
      </div>

      <div className="panel">
        <h2>Protection anti-robot du formulaire de contact (reCAPTCHA v2)</h2>
        <p>
          Clé de site :{" "}
          <span className={`badge ${recaptchaSiteKey ? "vert" : "gris"}`}>
            {recaptchaSiteKey ? "Configurée" : "Non configurée"}
          </span>{" "}
          Clé secrète :{" "}
          <span className={`badge ${recaptchaSecretOk ? "vert" : "gris"}`}>
            {recaptchaSecretOk ? "Configurée" : "Non configurée"}
          </span>
        </p>
        {recaptchaSiteKey && recaptchaSecretOk ? (
          <p className="subtitle">
            Une case «&nbsp;Je ne suis pas un robot&nbsp;» est affichée dans le formulaire de
            contact et vérifiée à chaque envoi.
          </p>
        ) : (
          <p className="subtitle">
            Tant qu&apos;aucune clé n&apos;est configurée, le formulaire fonctionne normalement et
            reste protégé par un champ piège invisible et une limite de fréquence. Renseignez les
            deux clés pour activer en plus la case reCAPTCHA. Il faut créer un site de type{" "}
            <strong>reCAPTCHA v2 « Je ne suis pas un robot&nbsp;»</strong> sur{" "}
            <code className="slug">google.com/recaptcha/admin</code> (marche à suivre complète dans
            le README, section «&nbsp;Connecter reCAPTCHA&nbsp;»).
          </p>
        )}

        <form action={saveRecaptchaSettingsAction}>
          <label className="champ">
            Clé de site <span className="aide">(publique)</span>
            <input
              type="text"
              name="recaptchaSiteKey"
              defaultValue={recaptchaSiteKey}
              placeholder="6L…"
              autoComplete="off"
              disabled={recaptchaSiteLockedByEnv}
              maxLength={300}
            />
          </label>
          {recaptchaSiteLockedByEnv && (
            <p className="subtitle">
              Une variable d&apos;environnement <code className="slug">RECAPTCHA_SITE_KEY</code> est
              définie sur le serveur : elle est utilisée en priorité et ce champ reste sans effet.
            </p>
          )}

          <label className="champ">
            Clé secrète{" "}
            <span className="aide">
              ({recaptchaSecretOk ? "déjà enregistrée — " : ""}laisser vide pour{" "}
              {recaptchaSecretOk ? "ne pas la changer" : "ne rien modifier"})
            </span>
            <input
              type="password"
              name="recaptchaSecretKey"
              placeholder={recaptchaSecretOk ? "••••••••••••••••••••" : "6L…"}
              autoComplete="off"
              disabled={recaptchaSecretLockedByEnv}
              maxLength={300}
            />
          </label>
          {recaptchaSecretLockedByEnv && (
            <p className="subtitle">
              Une variable d&apos;environnement <code className="slug">RECAPTCHA_SECRET_KEY</code>{" "}
              est définie sur le serveur : elle est utilisée en priorité et ce champ reste sans
              effet.
            </p>
          )}

          <button
            type="submit"
            className="btn principal"
            disabled={recaptchaSiteLockedByEnv && recaptchaSecretLockedByEnv}
          >
            Enregistrer
          </button>
          {(recaptchaSiteKey || recaptchaSecretOk) && (
            <>
              {" "}
              <button
                type="submit"
                name="retirer"
                value="1"
                className="btn secondaire"
                formNoValidate
              >
                Retirer les clés enregistrées
              </button>
            </>
          )}
        </form>
      </div>


      <div className="panel">
        <h2>Design des E-mails</h2>
        <p className="subtitle">
          Personnalisez l'apparence des e-mails envoyés par la plateforme (newsletters, commandes, réponses de contact).
        </p>
        <form action={saveEmailDesignSettingsAction}>
          <label className="champ">
            Nom d'expédition <span className="aide">(ex: L'équipe BOS & BOP)</span>
            <input type="text" name="emailSenderName" defaultValue={emailSenderName} required />
          </label>
          <label className="champ">
            URL du logo <span className="aide">(chemin relatif ou absolu)</span>
            <input type="text" name="emailLogoUrl" defaultValue={emailLogoUrl} required />
          </label>
          <label className="champ">
            URL de l'avatar <span className="aide">(Affiche une photo de profil dans la signature)</span>
            <input type="text" name="emailAvatarUrl" defaultValue={emailAvatarUrl} />
          </label>
          <button type="submit" className="btn principal">
            Enregistrer le design
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Serveur d'envoi d'emails (SMTP)</h2>
        <p className="subtitle">
          Configuration requise pour envoyer automatiquement les liens de lecture des livres numériques (e-books) par email.
        </p>

        <form action={saveSmtpSettingsAction}>
          <div className="grille-2">
            <label className="champ">
              Hôte SMTP <span className="aide">(ex: smtp.gmail.com)</span>
              <input type="text" name="smtpHost" defaultValue={smtpHost} />
            </label>
            <label className="champ">
              Port <span className="aide">(ex: 465 ou 587)</span>
              <input type="number" name="smtpPort" defaultValue={smtpPort} />
            </label>
          </div>
          
          <label className="champ">
            Nom d'utilisateur <span className="aide">(votre adresse email)</span>
            <input type="email" name="smtpUser" defaultValue={smtpUser} />
          </label>
          
          <label className="champ">
            Mot de passe{" "}
            <span className="aide">
              ({smtpPassOk ? "déjà enregistré — " : ""}laisser vide pour{" "}
              {smtpPassOk ? "ne pas le changer" : "ne rien modifier"})
            </span>
            <input
              type="password"
              name="smtpPass"
              placeholder={smtpPassOk ? "••••••••••••••••••••" : ""}
              autoComplete="off"
            />
          </label>

          <label className="champ-inline">
            <input type="checkbox" name="smtpSecure" value="1" defaultChecked={smtpSecure === "1"} />
            Connexion sécurisée (SSL/TLS - requis pour le port 465)
          </label>

          <button type="submit" className="btn principal">
            Enregistrer
          </button>
        </form>

        <form action={testSmtpAction} style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <p className="subtitle" style={{ marginTop: 0 }}><strong>Tester la connexion :</strong></p>
          <label className="champ-inline">
            <input type="email" name="testEmail" placeholder="Entrez une adresse email..." required />
            <button type="submit" className="btn secondaire petit">Envoyer un test</button>
          </label>
        </form>
      </div>

      <div className="panel">
        <h2>Sécurité & Données</h2>
        <p className="subtitle">
          Vous pouvez télécharger une copie intégrale de la base de données (commandes, clients, pages, statistiques)
          pour garantir la sécurité de vos informations. Conservez ce fichier en lieu sûr.
        </p>
        <div style={{ marginTop: "15px", marginBottom: "30px" }}>
          <a href="/api/admin/backup" className="btn principal" download style={{ background: "#c0392b", color: "#fff", textDecoration: "none" }}>
            📥 Télécharger la Sauvegarde (bosbop.db)
          </a>
        </div>
      </div>

      <div className="panel">
        <h2>Mot de passe</h2>
        <form action={changePasswordAction}>
          <div className="grille-2">
            <label className="champ">
              Mot de passe actuel
              <input type="password" name="current" required autoComplete="current-password" />
            </label>
            <span />
            <label className="champ">
              Nouveau mot de passe <span className="aide">(8 caractères minimum)</span>
              <input type="password" name="new" required minLength={8} autoComplete="new-password" />
            </label>
            <label className="champ">
              Confirmer le nouveau mot de passe
              <input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
            </label>
          </div>
          <button type="submit" className="btn principal">
            Changer le mot de passe
          </button>
        </form>
      </div>
    </>
  );
}
