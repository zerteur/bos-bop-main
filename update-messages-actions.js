const fs = require('fs');

function updateMessagesActions() {
  const filePath = 'src/lib/actions/messages.ts';
  let code = fs.readFileSync(filePath, 'utf8');

  const newAction = `
export async function replyToMessageAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const content = formData.get("content")?.toString() || "";
  const subject = formData.get("subject")?.toString() || "";

  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message || !message.email) throw new Error("Message introuvable ou sans email.");

  const { getTransporter, emailWrapper } = await import("../email");
  const mailer = await getTransporter();
  const { getSetting } = await import("../settings");
  const user = await getSetting("smtpUser", "");
  
  await mailer.sendMail({
    from: \`"Boutique BOS & BOP" <\${user}>\`,
    to: message.email,
    subject: subject || \`Re: \${message.subject}\`,
    html: emailWrapper(subject || "Réponse à votre message", content)
  });

  return { success: true };
}
`;

  code += '\n' + newAction;
  fs.writeFileSync(filePath, code);
  console.log('Added replyToMessageAction to messages.ts');
}

updateMessagesActions();
