const fs = require('fs');

function updateSettingsActions() {
  const filePath = 'src/lib/actions/settings.ts';
  let code = fs.readFileSync(filePath, 'utf8');

  const newAction = `
export async function saveEmailDesignSettingsAction(formData: FormData) {
  await requireSession();
  const emailLogoUrl = str(formData, "emailLogoUrl", 300);
  const emailAvatarUrl = str(formData, "emailAvatarUrl", 300);
  const emailSenderName = str(formData, "emailSenderName", 300);

  await setSetting("emailLogoUrl", emailLogoUrl);
  await setSetting("emailAvatarUrl", emailAvatarUrl);
  await setSetting("emailSenderName", emailSenderName);

  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?ok=1");
}
`;

  code += '\n' + newAction;
  fs.writeFileSync(filePath, code);
  console.log('Added saveEmailDesignSettingsAction');
}

updateSettingsActions();
