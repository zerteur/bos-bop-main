const fs = require('fs');

const path = 'next.config.ts';
let code = fs.readFileSync(path, 'utf8');

const oldHeaders = `  async headers() {
    return [
      {
        // Assets du template`;

const newHeaders = `  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' }
    ];

    return [
      {
        // Appliquer les headers de sécurité à toutes les routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Assets du template`;

code = code.replace(oldHeaders, newHeaders);
fs.writeFileSync(path, code);
console.log('Security headers added to next config');
