const fs = require('fs');

const path = 'src/app/admin/(panel)/parametres/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldPanel = `      <div className="panel">
        <h2>Mot de passe</h2>`;

const newPanel = `      <div className="panel">
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
        <h2>Mot de passe</h2>`;

code = code.replace(oldPanel, newPanel);
fs.writeFileSync(path, code);
console.log('Added backup panel');
