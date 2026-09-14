const fs = require('fs');

function limitTrackingRoute(routePath) {
  let code = fs.readFileSync(routePath, 'utf8');
  if (!code.includes('isRateLimited')) {
    code = code.replace(
      'import { NextRequest',
      'import { NextRequest, NextResponse }'
    );
    // Remove duplicate NextResponse if added
    code = code.replace('import { NextRequest, NextResponse, NextResponse', 'import { NextRequest, NextResponse');
    
    code = code.replace(
      'import { recordUniqueOpen } from "@/lib/email-tracking";',
      'import { recordUniqueOpen } from "@/lib/email-tracking";\nimport { isRateLimited, clientIp } from "@/lib/rate-limit";'
    );
    
    const oldStart = `export async function GET(request: NextRequest) {
  const url = new URL(request.url);`;
  
    const newStart = `export async function GET(request: NextRequest) {
  if (isRateLimited(\`track:\${clientIp(request)}\`, 100, 10 * 60 * 1000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const url = new URL(request.url);`;

    code = code.replace(oldStart, newStart);
    fs.writeFileSync(routePath, code);
  }
}

limitTrackingRoute('src/app/api/track/email/route.ts');
limitTrackingRoute('src/app/api/track/click/route.ts');
console.log('Rate limiting added to tracking');
