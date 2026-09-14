const fs = require('fs');

const path = 'src/app/admin/login/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldError = `{params.error && (
          <div className="notice erreur">Identifiants incorrects.</div>
        )}`;

const newError = `{params.error === "2" ? (
          <div className="notice erreur">Trop de tentatives. Réessayez dans 15 minutes.</div>
        ) : params.error ? (
          <div className="notice erreur">Identifiants incorrects.</div>
        ) : null}`;

code = code.replace(oldError, newError);
fs.writeFileSync(path, code);
console.log('Login error message updated');
