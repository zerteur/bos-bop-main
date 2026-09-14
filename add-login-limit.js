const fs = require('fs');

const path = 'src/lib/actions/session.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('isRateLimited')) {
  // Add imports
  code = code.replace(
    'import { formString as str } from "../forms";',
    'import { formString as str } from "../forms";\nimport { isRateLimited } from "../rate-limit";\nimport { headers } from "next/headers";'
  );

  // Add rate limiting
  const oldLoginStart = `export async function loginAction(formData: FormData) {
  const email = str(formData, "email", 200).toLowerCase();`;
  
  const newLoginStart = `export async function loginAction(formData: FormData) {
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0].trim() || reqHeaders.get("x-real-ip") || "inconnu";
  if (isRateLimited(\`login:\${ip}\`, 5, 15 * 60 * 1000)) {
    redirect("/admin/login?error=2"); // Rate limited
  }

  const email = str(formData, "email", 200).toLowerCase();`;

  code = code.replace(oldLoginStart, newLoginStart);
  fs.writeFileSync(path, code);
  console.log('Login rate limiting added');
} else {
  console.log('Login rate limiting already present');
}
