const fs = require('fs');

const path = 'src/lib/shop.ts';
let code = fs.readFileSync(path, 'utf8');

const oldFormStart = `<form action="/api/checkout" method="post">
<p><label style="font-weight:600;">Nom complet`;

const newFormStart = `<form action="/api/checkout" method="post">
<!-- Honeypot anti-spam caché -->
<div style="display:none;" aria-hidden="true">
  <label for="bd_site_web">Ne pas remplir ce champ si vous êtes humain :</label>
  <input type="text" name="bd_site_web" id="bd_site_web" tabIndex="-1" autocomplete="off" />
</div>
<p><label style="font-weight:600;">Nom complet`;

if (!code.includes('bd_site_web')) {
  code = code.replace(oldFormStart, newFormStart);
  fs.writeFileSync(path, code);
  console.log('Honeypot added to shop.ts');
} else {
  console.log('Honeypot already present in shop.ts');
}
