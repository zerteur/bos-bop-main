import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Racine minimale : les pages publiques sont servies par des route handlers
// (HTML historique reproduit à l'identique) ; ce layout ne concerne que
// l'administration.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
