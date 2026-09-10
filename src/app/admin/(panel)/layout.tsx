import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/admin-actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [unreadMessages, newOrders] = await Promise.all([
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.order.count({ where: { status: "NEW" } }),
  ]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <strong>BOS &amp; BOP</strong>
          <span>Administration du site</span>
        </div>
        <AdminNav badges={{ messages: unreadMessages, orders: newOrders }} />
        <div className="sidebar-footer">
          Connecté : {session.email}
          <form action={logoutAction}>
            <button type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
