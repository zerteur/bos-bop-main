const fs = require('fs');

const checkoutPath = 'src/app/api/checkout/route.ts';
let checkoutCode = fs.readFileSync(checkoutPath, 'utf8');

if (!checkoutCode.includes('isRateLimited')) {
  // Add imports
  checkoutCode = checkoutCode.replace(
    'import { getTransporter, emailWrapper } from "@/lib/email";',
    'import { getTransporter, emailWrapper } from "@/lib/email";\nimport { isRateLimited, clientIp } from "@/lib/rate-limit";'
  );

  // Add logic at the beginning of POST
  const oldPostStart = `export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();`;
    
  const newPostStart = `export async function POST(request: NextRequest) {
  try {
    const limited = isRateLimited(\`checkout:\${clientIp(request)}\`, 10, 10 * 60 * 1000);
    if (limited) {
      return NextResponse.redirect(new URL("/commande?error=" + encodeURIComponent("Trop de tentatives, veuillez patienter."), request.url));
    }

    const formData = await request.formData();`;

  checkoutCode = checkoutCode.replace(oldPostStart, newPostStart);
  fs.writeFileSync(checkoutPath, checkoutCode);
  console.log('Rate limiting added to checkout');
} else {
  console.log('Rate limiting already exists');
}
