import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatPrice } from "@/lib/shop";
import { formatDate, ORDER_STATUS_LABELS } from "@/lib/format";
import { TrafficChart } from "@/components/admin/TrafficChart";

export const dynamic = "force-dynamic";

function Kpi({
  value,
  label,
  href,
  tone,
  hint,
}: {
  value: ReactNode;
  label: string;
  href?: string;
  hint?: string;
  tone: "info" | "or" | "ok" | "alert" | "violet" | "gris";
}) {
  const text = href ? <Link href={href}>{label}</Link> : label;
  return (
    <div className={`kpi-tile kpi-${tone}`} title={hint}>
      <div className="kpi">{value}</div>
      <div className="kpi-label">{text}</div>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

function RankList({
  items,
  empty,
}: {
  items: { key: string; label: string; primary?: ReactNode; secondary?: ReactNode }[];
  empty: string;
}) {
  if (items.length === 0) return <p className="vide">{empty}</p>;
  return (
    <ul className="dash-rank">
      {items.map((item) => (
        <li key={item.key}>
          <span className="dash-rank-label" title={item.label}>{item.label}</span>
          <span className="dash-rank-vals">
            {item.primary}
            {item.secondary}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage(props: { searchParams?: Promise<{ mode?: string }> }) {
  const searchParams = await props.searchParams;
  const isDetailed = searchParams?.mode === "detailed";

  const [pages, unreadMessages, products, newOrders, shopEnabled, lastMessages, lastOrders, paidOrders, allPages, allProducts, trafficStats] =
    await Promise.all([
      prisma.page.count(),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.product.count(),
      prisma.order.count({ where: { status: "NEW" } }),
      getSetting("shopEnabled", "0"),
      prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.order.findMany({ where: { paymentStatus: "PAID" }, include: { items: true } }),
      isDetailed ? prisma.page.findMany({ orderBy: { viewCount: "desc" }, take: 5 }) : Promise.resolve([]),
      isDetailed ? prisma.product.findMany({ orderBy: { viewCount: "desc" }, take: 5 }) : Promise.resolve([]),
      isDetailed ? prisma.trafficStat.findMany({ orderBy: { date: "asc" } }) : Promise.resolve([]),
    ]);

  let caTotal = 0;
  let caMois = 0;
  const now = new Date();
  const emails = new Map<string, number>();
  const topProducts = new Map<string, number>();

  for (const o of paidOrders) {
    caTotal += o.totalCents;
    if (o.createdAt.getMonth() === now.getMonth() && o.createdAt.getFullYear() === now.getFullYear()) {
      caMois += o.totalCents;
    }

    if (isDetailed) {
      emails.set(o.email, (emails.get(o.email) || 0) + 1);
      for (const item of o.items) {
        topProducts.set(item.titleSnapshot, (topProducts.get(item.titleSnapshot) || 0) + item.quantity);
      }
    }
  }

  const totalCustomers = emails.size;
  let returningCustomers = 0;
  for (const count of emails.values()) {
    if (count > 1) returningCustomers++;
  }
  const retentionRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0;
  const sortedProducts = Array.from(topProducts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const dailyMap: Record<string, { views: number; humanViews: number; duration: number; ventes: number; ca: number }> = {};
  const weeklyMap: Record<string, number> = {};
  const emailStatsMap: Record<string, number> = {};

  trafficStats?.forEach((t) => {
    if (t.path.startsWith("email:")) {
      const subject = t.path.replace("email:", "");
      emailStatsMap[subject] = (emailStatsMap[subject] || 0) + t.views;
      return;
    }

    if (!dailyMap[t.date]) dailyMap[t.date] = { views: 0, humanViews: 0, duration: 0, ventes: 0, ca: 0 };
    dailyMap[t.date].views += t.views;
    dailyMap[t.date].humanViews += t.humanViews;
    dailyMap[t.date].duration += t.duration || 0;

    const d = new Date(t.date);
    const year = d.getFullYear();
    const week = Math.ceil(Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
    const weekKey = `${year}-S${week}`;
    if (!weeklyMap[weekKey]) weeklyMap[weekKey] = 0;
    weeklyMap[weekKey] += t.views;
  });

  paidOrders.forEach((o) => {
    const d = o.createdAt;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dailyMap[dateStr]) dailyMap[dateStr] = { views: 0, humanViews: 0, duration: 0, ventes: 0, ca: 0 };
    dailyMap[dateStr].ventes += 1;
    dailyMap[dateStr].ca += o.totalCents / 100;
  });

  const dailyData = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weeklyData = Object.entries(weeklyMap).map(([week, views]) => ({ week, views }));
  const emailStatsList = Object.entries(emailStatsMap)
    .map(([subject, opens]) => ({ subject, opens }))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 5);

  const deptMap: Record<string, number> = {};
  if (isDetailed) {
    paidOrders.forEach((o) => {
      const match = o.address.match(/\b(\d{2})\d{3}\b/);
      if (match) {
        const dept = match[1];
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      }
    });
  }
  const topDepts = Object.entries(deptMap)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalViews = dailyData.reduce((sum, d) => sum + d.views, 0);
  const totalHumans = dailyData.reduce((sum, d) => sum + d.humanViews, 0);
  const totalDuration = dailyData.reduce((sum, d) => sum + d.duration, 0);
  const emailOpens = emailStatsList.reduce((sum, e) => sum + e.opens, 0);
  const conversion = totalHumans > 0 ? (paidOrders.length / totalHumans) * 100 : 0;
  const panierMoyenCents = paidOrders.length > 0 ? Math.round(caTotal / paidOrders.length) : 0;
  const caParVisiteurCents = totalHumans > 0 ? Math.round(caTotal / totalHumans) : 0;
  const humanShare = totalViews > 0 ? Math.round((totalHumans / totalViews) * 100) : 0;
  const avgTime = totalHumans > 0 ? Math.round(totalDuration / totalHumans) : 0;
  const conversionLabel = conversion === 0 ? "0 %" : `${conversion < 10 ? conversion.toFixed(1).replace(".", ",") : Math.round(conversion)} %`;

  return (
    <div className={`dash${isDetailed ? " dash-detailed" : ""}`}>
      <header className="dash-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="subtitle">Activité du site, en un coup d&apos;œil.</p>
        </div>
        {isDetailed ? (
          <Link href="/admin" className="btn secondaire petit">Vue compacte</Link>
        ) : (
          <Link href="/admin?mode=detailed" className="btn principal petit">Statistiques détaillées</Link>
        )}
      </header>

      <section className="dash-kpis" aria-label="Indicateurs">
        {isDetailed ? (
          <>
            <Kpi tone="ok" value={conversionLabel} label="Conversion" href="/admin/commandes" hint="Ventes payées ÷ visiteurs humains" />
            <Kpi tone="info" value={paidOrders.length ? formatPrice(panierMoyenCents) : "—"} label="Panier moyen" hint="CA global ÷ nombre de ventes" />
            <Kpi tone="or" value={totalHumans ? formatPrice(caParVisiteurCents) : "—"} label="CA / visiteur" hint="CA global ÷ visiteurs humains" />
            <Kpi tone="gris" value={`${humanShare} %`} label="Trafic humain" hint="Visites humaines ÷ visites totales" />
            <Kpi tone="or" value={formatDuration(avgTime)} label="Temps moyen" hint="Durée totale ÷ visites humaines" />
            <Kpi tone="violet" value={`${retentionRate} %`} label="Rétention" href="/admin/crm" hint="Clients ayant racheté ÷ clients payants" />
            <Kpi tone="info" value={formatPrice(caMois)} label="CA du mois" />
            <Kpi tone="ok" value={emailOpens} label="Ouvertures e-mail" href="/admin/crm" hint="Ouvertures uniques des campagnes" />
          </>
        ) : (
          <>
            <Kpi tone="info" value={formatPrice(caTotal)} label="CA global" />
            <Kpi tone="or" value={formatPrice(caMois)} label="CA du mois" />
            <Kpi tone="ok" value={paidOrders.length} label="Ventes payées" href="/admin/commandes" />
            <Kpi tone="alert" value={unreadMessages} label="Messages non lus" href="/admin/messages" />
            <Kpi tone="or" value={newOrders} label="Commandes à traiter" href="/admin/commandes" />
            <Kpi tone="gris" value={pages} label="Pages" href="/admin/pages" />
            <Kpi tone="gris" value={products} label="Livres" href="/admin/produits" />
          </>
        )}
      </section>

      {shopEnabled !== "1" && (
        <div className="notice info dash-notice">
          Boutique désactivée — identique au site d&apos;origine. Activez-la dans les{" "}
          <Link href="/admin/parametres">réglages</Link> pour vendre les livres.
        </div>
      )}

      <div className="dash-body">
        {isDetailed && (
          <section className="dash-analytics" aria-label="Statistiques">
            <div className="panel dash-panel dash-charts">
              <div className="dash-panel-head">
                <h2>Trafic et conversion</h2>
              </div>
              <TrafficChart data={dailyData} weeklyData={weeklyData} compact />
            </div>
            <div className="dash-stat-grid">
              <div className="panel dash-panel">
                <h2>Pages visitées</h2>
                <RankList
                  empty="Aucune donnée de trafic."
                  items={allPages.map((p) => ({
                    key: String(p.id),
                    label: p.title,
                    primary: <span className="badge gris">{p.viewCount}</span>,
                    secondary: <span className="badge vert" title="Visites humaines">{p.humanViewCount}</span>,
                  }))}
                />
              </div>
              <div className="panel dash-panel">
                <h2>Livres consultés</h2>
                <RankList
                  empty="Aucune donnée de trafic."
                  items={allProducts.map((p) => ({
                    key: String(p.id),
                    label: p.title,
                    primary: <span className="badge gris">{p.viewCount}</span>,
                    secondary: <span className="badge vert" title="Visites humaines">{p.humanViewCount}</span>,
                  }))}
                />
              </div>
              <div className="panel dash-panel">
                <h2>Top ventes</h2>
                <RankList
                  empty="Aucune vente pour l'instant."
                  items={sortedProducts.map(([title, qty]) => ({
                    key: title,
                    label: title,
                    primary: <span className="badge or">{qty}</span>,
                  }))}
                />
              </div>
              <div className="panel dash-panel">
                <h2>Départements</h2>
                <RankList
                  empty="Pas de données géographiques."
                  items={topDepts.map((d) => ({
                    key: d.dept,
                    label: `Département ${d.dept}`,
                    primary: <span className="badge or">{d.count}</span>,
                  }))}
                />
              </div>
              {emailStatsList.length > 0 && (
                <div className="panel dash-panel dash-stat-wide">
                  <h2>Ouvertures e-mail</h2>
                  <RankList
                    empty=""
                    items={emailStatsList.map((e) => ({
                      key: e.subject,
                      label: e.subject,
                      primary: <span className="badge vert">{e.opens}</span>,
                    }))}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        <section className="dash-ops" aria-label="Activité récente">
          <div className="panel dash-panel">
            <div className="dash-panel-head">
              <h2>Derniers messages</h2>
              <Link href="/admin/messages" className="dash-more">Tous</Link>
            </div>
            {lastMessages.length === 0 ? (
              <p className="vide">Aucun message pour le moment.</p>
            ) : (
              <div className="table-scroll">
                <table className="liste compacte">
                  <tbody>
                    {lastMessages.map((m) => (
                      <tr key={m.id} className={m.isRead ? undefined : "non-lu"}>
                        <td>{formatDate(m.createdAt)}</td>
                        <td>
                          <Link href={`/admin/messages/${m.id}`}>
                            {m.firstName} {m.lastName}
                          </Link>
                        </td>
                        <td>{m.subject || "(sans sujet)"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="panel dash-panel">
            <div className="dash-panel-head">
              <h2>Dernières commandes</h2>
              <Link href="/admin/commandes" className="dash-more">Toutes</Link>
            </div>
            {lastOrders.length === 0 ? (
              <p className="vide">Aucune commande pour le moment.</p>
            ) : (
              <div className="table-scroll">
                <table className="liste compacte">
                  <tbody>
                    {lastOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{formatDate(o.createdAt)}</td>
                        <td>
                          <Link href={`/admin/commandes/${o.id}`}>{o.reference}</Link>
                        </td>
                        <td>{formatPrice(o.totalCents)}</td>
                        <td>
                          <span className="badge or">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
