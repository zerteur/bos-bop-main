const fs = require('fs');

const path = 'src/app/[...slug]/route.ts';
let code = fs.readFileSync(path, 'utf8');

// The headers to use for cacheable pages
const CACHE_HEADERS = `{ ...HTML_HEADERS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" }`;

// 1. viewShopList (catalog)
const oldShopList = `return new Response(html, { headers: HTML_HEADERS });`;
const newShopList = `return new Response(html, { headers: ${CACHE_HEADERS} });`;

// Replace specifically inside viewShopList (first === "livres" && parts.length === 1)
code = code.replace(
  /if \(first === "livres" && parts\.length === 1\) {[\s\S]*?return new Response\(html, { headers: HTML_HEADERS }\);/,
  (match) => match.replace('return new Response(html, { headers: HTML_HEADERS });', 'return new Response(html, { headers: { ...HTML_HEADERS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } });')
);

// 2. viewProductDetail (product)
code = code.replace(
  /if \(first === "livres" && parts\.length === 2\) {[\s\S]*?return new Response\(html, { headers: HTML_HEADERS }\);/,
  (match) => match.replace('return new Response(html, { headers: HTML_HEADERS });', 'return new Response(html, { headers: { ...HTML_HEADERS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } });')
);

// 3. renderPage (custom pages like / or /contact)
// wait, /contact has a form. If we cache /contact, what happens? 
// The contact form action is /api/contact which is POST. Caching the HTML form is totally fine, honeypot is static.
code = code.replace(
  /const html = await renderPage\(page, { injectFormMessage: formMessage }\);\s*return new Response\(html, { headers: HTML_HEADERS }\);/g,
  (match) => match.replace('return new Response(html, { headers: HTML_HEADERS });', 'return new Response(html, { headers: { ...HTML_HEADERS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600" } });')
);

fs.writeFileSync(path, code);
console.log('Caching added to public pages');
