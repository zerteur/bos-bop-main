import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CrmClientWrapper } from "./CrmClientWrapper";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  const optInCount = customers.filter(c => c.optIn).length;

  const historyStr = await getSetting("newsletterHistory", "[]");
  let newsletterHistory = [];
  try { newsletterHistory = JSON.parse(historyStr); } catch(e){}

  const emailStats = await prisma.trafficStat.findMany({
    where: { path: { startsWith: "email:" } }
  });

  const statsMap: Record<string, number> = {};
  emailStats.forEach(s => {
    const subject = s.path.replace("email:", "");
    statsMap[subject] = (statsMap[subject] || 0) + s.views;
  });

  const historyWithStats = newsletterHistory.map((h: any) => ({
    ...h,
    opens: statsMap[h.subject] || 0
  }));

  return (
    <div>
      <h1 style={{ marginBottom: "10px" }}>Clients & CRM</h1>
      <p style={{ color: "#6b7280", marginBottom: "30px" }}>
        Gérez vos contacts et envoyez des newsletters. 
        <strong> {optInCount} clients inscrits </strong> sur {customers.length} au total.
      </p>

      <CrmClientWrapper customers={customers} history={historyWithStats} />
    </div>
  );
}
