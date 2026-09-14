const fs = require('fs');

const crmPath = 'src/lib/actions/crm.ts';
let crmCode = fs.readFileSync(crmPath, 'utf8');

const oldHtmlBlock = `      await Promise.all(batch.map(async (customer) => {
        const htmlContent = await emailWrapper(subject, \`
      <h2 style="color: #1f2430; font-size: 20px; margin-top: 0;">\${subject}</h2>
      <div style="color: #262b38; line-height: 1.6; white-space: pre-wrap;">\${content}</div>
      <div style="margin-top: 30px; font-size: 12px; color: #9ba3b5; text-align: center; border-top: 1px solid #e3e6ee; padding-top: 15px;">
        Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
        <a href="\${process.env.SITE_URL || 'https://www.bos-bop.fr'}/api/unsubscribe?email=\${encodeURIComponent(customer.email)}" style="color: #ddc076; text-decoration: underline;">Se désinscrire en un clic</a>
      </div>
    \`, "", customer.email);`;

const newHtmlBlock = `      await Promise.all(batch.map(async (customer) => {
        // Remplacement de tous les liens pour le tracking de clics
        const siteUrl = process.env.SITE_URL || 'https://www.bos-bop.fr';
        let trackedContent = content.replace(/href="([^"]+)"/g, (match, url) => {
          if (url.startsWith('mailto:') || url.startsWith('tel:')) return match;
          return \`href="\${siteUrl}/api/track/click?url=\${encodeURIComponent(url)}&s=\${encodeURIComponent(subject)}&u=\${encodeURIComponent(customer.email)}"\`;
        });

        const htmlContent = await emailWrapper(subject, \`
      <h2 style="color: #1f2430; font-size: 20px; margin-top: 0;">\${subject}</h2>
      <div style="color: #262b38; line-height: 1.6; white-space: pre-wrap;">\${trackedContent}</div>
      <div style="margin-top: 30px; font-size: 12px; color: #9ba3b5; text-align: center; border-top: 1px solid #e3e6ee; padding-top: 15px;">
        Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
        <a href="\${siteUrl}/api/track/click?url=\${encodeURIComponent(siteUrl + '/api/unsubscribe?email=' + encodeURIComponent(customer.email))}&s=\${encodeURIComponent(subject)}&u=\${encodeURIComponent(customer.email)}" style="color: #ddc076; text-decoration: underline;">Se désinscrire en un clic</a>
      </div>
    \`, "", customer.email);`;

crmCode = crmCode.replace(oldHtmlBlock, newHtmlBlock);
fs.writeFileSync(crmPath, crmCode);
console.log('CRM links tracked');
