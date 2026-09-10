import type { ReactNode } from "react";

// Racine minimale : les pages publiques sont servies par des route handlers
// (HTML historique reproduit à l'identique) ; ce layout ne concerne que
// l'administration.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
