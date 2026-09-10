import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Administration — BOS & BOP",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
