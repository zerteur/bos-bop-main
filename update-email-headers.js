const fs = require('fs');

async function updateEmail() {
  const emailPath = 'src/lib/email.ts';
  let emailCode = fs.readFileSync(emailPath, 'utf8');

  // Change signature
  emailCode = emailCode.replace(
    'export async function emailWrapper(title: string, content: string) {',
    'export async function emailWrapper(title: string, content: string, preheader: string = "") {'
  );

  // Insert preheader in HTML
  const preheaderHtml = `
      <!-- Pré-header caché pour les messageries (ex: Gmail snippet) -->
      <div style="display: none; max-height: 0px; overflow: hidden; font-size: 0px; line-height: 0px; mso-hide: all;">
        \${preheader || title}
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </div>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #262b38; background-color: #f4f5f8; padding: 40px 20px; line-height: 1.5;">`;
  
  emailCode = emailCode.replace(
    '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; color: #262b38; background-color: #f4f5f8; padding: 40px 20px; line-height: 1.5;">',
    preheaderHtml
  );

  // Add List-Unsubscribe to CRM newsletter
  const crmPath = 'src/lib/actions/crm.ts';
  let crmCode = fs.readFileSync(crmPath, 'utf8');
  
  // Also pass preheader
  crmCode = crmCode.replace(
    'const htmlContent = await emailWrapper(subject, `',
    'const htmlContent = await emailWrapper(subject, `', // keep as is
  );
  
  // Add headers to transporter.sendMail in crm.ts
  const sendMailOld = `  await transporter.sendMail({
    from: \`"BOS & BOP" <\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}>\`,
    bcc: bccList,
    subject: subject,
    html: htmlContent,
  });`;

  const sendMailNew = `  await transporter.sendMail({
    from: \`"BOS & BOP" <\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}>\`,
    replyTo: \`no-reply@bos-bop.fr\`,
    bcc: bccList,
    subject: subject,
    html: htmlContent,
    headers: {
      'List-Unsubscribe': \`<mailto:\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}?subject=Désinscription>\`,
      'Precedence': 'bulk',
      'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
    }
  });`;

  crmCode = crmCode.replace(sendMailOld, sendMailNew);
  
  fs.writeFileSync(emailPath, emailCode);
  fs.writeFileSync(crmPath, crmCode);
  console.log('Successfully added preheader, list-unsubscribe, precedence bulk and reply-to');
}

updateEmail();
