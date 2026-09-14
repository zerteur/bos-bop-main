const fs = require('fs');

async function updateEmailWrapperAndUsage() {
  const emailPath = 'src/lib/email.ts';
  let emailCode = fs.readFileSync(emailPath, 'utf8');

  // Add getSetting import if missing
  if (!emailCode.includes('getSetting')) {
    emailCode = 'import { getSetting } from "./settings";\n' + emailCode;
  }

  // Make it async and fetch settings
  emailCode = emailCode.replace(
    'export function emailWrapper(title: string, content: string) {',
    'export async function emailWrapper(title: string, content: string) {'
  );
  
  const oldLogoLogic = `  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";
  const logoUrl = \`\${siteUrl}/assets/images/145e34ff4dd5_logotype-bops-bop.svg\`;`;
  
  const newLogoLogic = `  const siteUrl = process.env.SITE_URL || "https://www.bos-bop.fr";
  const customLogo = await getSetting("emailLogoUrl", "/assets/images/4cd7c0f7b92c_logotype-bops-bop.svg");
  const logoUrl = customLogo.startsWith("http") ? customLogo : \`\${siteUrl}\${customLogo}\`;
  
  const customAvatar = await getSetting("emailAvatarUrl", "/assets/images/logocarré.jpg");
  const avatarUrl = customAvatar.startsWith("http") ? customAvatar : \`\${siteUrl}\${customAvatar}\`;
  
  const senderName = await getSetting("emailSenderName", "L'équipe BOS & BOP");`;

  emailCode = emailCode.replace(oldLogoLogic, newLogoLogic);

  // Add signature to the wrapper output
  const oldReturn = '          </div>\n        </div>\n      </div>\n    </div>\n  `;\n}';
  const newReturn = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e3e6ee; display: flex; align-items: center; gap: 15px;">
              <img src="\${avatarUrl}" alt="\${senderName}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #ddc076;" />
              <div>
                <p style="margin: 0; font-weight: bold; color: #1f2430; font-size: 16px;">\${senderName}</p>
                <p style="margin: 0; color: #6e778c; font-size: 14px;">BOS & BOP</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  \`;
}`;
  emailCode = emailCode.replace('          </div>\n        </div>\n      </div>\n    </div>\n  `;\n}', newReturn);

  // Add await to uses in email.ts
  emailCode = emailCode.replace(/html: emailWrapper\(/g, 'html: await emailWrapper(');

  fs.writeFileSync(emailPath, emailCode);

  // Update crm.ts
  const crmPath = 'src/lib/actions/crm.ts';
  let crmCode = fs.readFileSync(crmPath, 'utf8');
  crmCode = crmCode.replace('const htmlContent = emailWrapper(subject, `', 'const htmlContent = await emailWrapper(subject, `');
  fs.writeFileSync(crmPath, crmCode);

  // Update messages.ts
  const msgPath = 'src/lib/actions/messages.ts';
  let msgCode = fs.readFileSync(msgPath, 'utf8');
  msgCode = msgCode.replace('html: emailWrapper(subject', 'html: await emailWrapper(subject');
  fs.writeFileSync(msgPath, msgCode);

  console.log('Finished updating emailWrapper');
}

updateEmailWrapperAndUsage();
