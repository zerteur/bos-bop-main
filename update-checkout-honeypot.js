const fs = require('fs');

const path = 'src/app/api/checkout/route.ts';
let code = fs.readFileSync(path, 'utf8');

const oldLogic = `    const formData = await request.formData();

    if (!(await isShopEnabled())) {`;

const newLogic = `    const formData = await request.formData();

    // Vérification du honeypot anti-spam (champ bd_site_web)
    // S'il est rempli, c'est un robot. On fait "semblant" que ça a marché.
    if (formData.get("bd_site_web")) {
      return seeOther("/commande/succes");
    }

    if (!(await isShopEnabled())) {`;

if (!code.includes('bd_site_web')) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync(path, code);
  console.log('Checkout API honeypot check added');
} else {
  console.log('Honeypot check already exists');
}
