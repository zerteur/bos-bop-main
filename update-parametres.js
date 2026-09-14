const fs = require('fs');

function updateParametres() {
  const filePath = 'src/app/admin/(panel)/parametres/page.tsx';
  let code = fs.readFileSync(filePath, 'utf8');

  // Add the import
  code = code.replace(
    'saveSmtpSettingsAction,',
    'saveSmtpSettingsAction,\n  saveEmailDesignSettingsAction,'
  );

  // Add new settings to Promise.all
  code = code.replace(
    'getSetting("smtpPass", "").then(p => !!p),',
    'getSetting("smtpPass", "").then(p => !!p),\n    getSetting("emailLogoUrl", "/assets/images/4cd7c0f7b92c_logotype-bops-bop.svg"),\n    getSetting("emailAvatarUrl", "/assets/images/logocarré.jpg"),\n    getSetting("emailSenderName", "L\'équipe BOS & BOP"),'
  );

  // Destructure them
  code = code.replace(
    'const [siteUrl, shopEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassOk] = await Promise.all([',
    'const [siteUrl, shopEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassOk, emailLogoUrl, emailAvatarUrl, emailSenderName] = await Promise.all(['
  );

  // Add the panel
  const panelHtml = `
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
        <h2>Serveur d'envoi d'emails (SMTP)</h2>`;

  code = code.replace('      <div className="panel">\n        <h2>Serveur d\'envoi d\'emails (SMTP)</h2>', panelHtml);

  fs.writeFileSync(filePath, code);
  console.log('Updated parametres/page.tsx');
}

updateParametres();
