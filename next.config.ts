import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le rendu des pages publiques dépend de la base de données (contenu géré
  // depuis l'administration) : tout est rendu dynamiquement côté serveur.
  poweredByHeader: false,
  async headers() {
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
        // Assets du template d'origine : noms préfixés par un hash de contenu,
        // donc immuables -> cache navigateur agressif sans risque.
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Fichiers téléversés : noms horodatés (jamais réécrits), immuables.
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    // Anciennes URL Joomla -> nouvelles URL (préservation du référencement)
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/page.html", destination: "/", permanent: true },
      { source: "/index.php", destination: "/", permanent: true },
      {
        source: "/:slug*_html.html",
        destination: "/:slug*",
        permanent: true,
      },
      { source: "/:slug*.html", destination: "/:slug*", permanent: true },
      { source: "/contact-2", destination: "/mentions-legales", permanent: true },
    ];
  },
};

export default nextConfig;
