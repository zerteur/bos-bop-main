import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [unreadMessages, newOrders] = await Promise.all([
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.order.count({ where: { status: "NEW" } }),
  ]);

  return (
    <AdminShell email={session.email} badges={{ messages: unreadMessages, orders: newOrders }}>
      {children}
    </AdminShell>
  );
}
