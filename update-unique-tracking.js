const fs = require('fs');

async function updateEmails() {
  const emailPath = 'src/lib/email.ts';
  let emailCode = fs.readFileSync(emailPath, 'utf8');

  // Add trackingId parameter
  emailCode = emailCode.replace(
    'export async function emailWrapper(title: string, content: string, preheader: string = "") {',
    'export async function emailWrapper(title: string, content: string, preheader: string = "", trackingId: string = "") {'
  );

  // Update pixel image tag to include trackingId
  emailCode = emailCode.replace(
    '<img src="${siteUrl}/api/track/email?s=${encodeURIComponent(title)}" width="1" height="1" alt="" style="display:none; visibility:hidden; width:0; height:0;" />',
    '<img src="${siteUrl}/api/track/email?s=${encodeURIComponent(title)}${trackingId ? `&u=${encodeURIComponent(trackingId)}` : \'\'}" width="1" height="1" alt="" style="display:none; visibility:hidden; width:0; height:0;" />'
  );

  fs.writeFileSync(emailPath, emailCode);

  const crmPath = 'src/lib/actions/crm.ts';
  let crmCode = fs.readFileSync(crmPath, 'utf8');

  // Rewrite the sending logic in crm.ts
  // We need to replace everything from `const htmlContent = ...` to the end of the `sendMail` block.
  
  const oldSendLogicStart = '  const htmlContent = await emailWrapper(subject, `';
  const oldSendLogicEnd = `    headers: {
      'List-Unsubscribe': \`<mailto:\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}?subject=Désinscription>\`,
      'Precedence': 'bulk',
      'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
    }
  });`;

  if (crmCode.includes(oldSendLogicStart)) {
    const startIndex = crmCode.indexOf(oldSendLogicStart);
    const endIndex = crmCode.indexOf(oldSendLogicEnd) + oldSendLogicEnd.length;
    
    const newSendLogic = `
  const from = \`"BOS & BOP" <\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}>\`;
  const replyTo = \`no-reply@bos-bop.fr\`;
  const listUnsubscribe = \`<mailto:\${process.env.ADMIN_EMAIL || 'contact@bos-bop.fr'}?subject=Désinscription>\`;

  // Send individually to bypass Gmail image caching and provide unique tracking pixels
  // Promise.all with chunking or sequentially
  const BATCH_SIZE = 50;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (customer) => {
      const htmlContent = await emailWrapper(subject, \`
    <h2 style="color: #1f2430; font-size: 20px; margin-top: 0;">\${subject}</h2>
    <div style="color: #262b38; line-height: 1.6; white-space: pre-wrap;">\${content}</div>
    <div style="margin-top: 30px; font-size: 12px; color: #9ba3b5; text-align: center; border-top: 1px solid #e3e6ee; padding-top: 15px;">
      Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
      Pour vous désinscrire, répondez STOP à cet e-mail.
    </div>
  \`, "", customer.email);

      await transporter.sendMail({
        from,
        replyTo,
        to: customer.email,
        subject: subject,
        html: htmlContent,
        headers: {
          'List-Unsubscribe': listUnsubscribe,
          'Precedence': 'bulk',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
        }
      }).catch(err => console.error("Erreur d'envoi newsletter à", customer.email, err));
    }));
  }`;

    crmCode = crmCode.substring(0, startIndex) + newSendLogic + crmCode.substring(endIndex);
    fs.writeFileSync(crmPath, crmCode);
    console.log('Successfully updated tracking logic to use individual emails');
  } else {
    console.log('Could not find old send logic in crm.ts');
  }

}

updateEmails();
