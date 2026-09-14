import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatPrice } from "@/lib/shop";
import { formatDate, ORDER_STATUS_LABELS } from "@/lib/format";
import { TrafficChart, WeeklyBarChart } from "@/components/admin/TrafficChart";

export const dynamic = "force-dynamic";

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
  const dpts = new Map<string, number>();
  const topProducts = new Map<string, number>();

  for (const o of paidOrders) {
    caTotal += o.totalCents;
    if (o.createdAt.getMonth() === now.getMonth() && o.createdAt.getFullYear() === now.getFullYear()) {
      caMois += o.totalCents;
    }
    
    if (isDetailed) {
      emails.set(o.email, (emails.get(o.email) || 0) + 1);
      
      const match = o.address.match(/\b([0-9]{2})[0-9]{3}\b/);
      if (match) {
        const dpt = match[1];
        dpts.set(dpt, (dpts.get(dpt) || 0) + 1);
      }

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

  const sortedDpts = Array.from(dpts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedProducts = Array.from(topProducts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  
  const dailyMap: Record<string, { views: number, humanViews: number, duration: number }> = {};
  const weeklyMap: Record<string, number> = {};
  const emailStatsMap: Record<string, number> = {};
  
  trafficStats?.forEach(t => {
    if (t.path.startsWith("email:")) {
      const subject = t.path.replace("email:", "");
      emailStatsMap[subject] = (emailStatsMap[subject] || 0) + t.views;
      return; // Do not count as a page view
    }
  
    if (!dailyMap[t.date]) dailyMap[t.date] = { views: 0, humanViews: 0, duration: 0 };
    dailyMap[t.date].views += t.views;
    dailyMap[t.date].humanViews += t.humanViews;
    dailyMap[t.date].duration += t.duration || 0;

    // Calcul semaine (ex: 2026-W37)
    const d = new Date(t.date);
    const year = d.getFullYear();
    const week = Math.ceil(Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
    const weekKey = `${year}-S${week}`;
    
    if (!weeklyMap[weekKey]) weeklyMap[weekKey] = 0;
    weeklyMap[weekKey] += t.views;
  });

  const dailyData = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));
  const weeklyData = Object.entries(weeklyMap).map(([week, views]) => ({ week, views }));

  const emailStatsList = Object.entries(emailStatsMap).map(([subject, opens]) => ({ subject, opens })).sort((a, b) => b.opens - a.opens);

  // Extract Top Departments
  const deptMap: Record<string, number> = {};
  paidOrders.forEach(o => {
    const match = o.address.match(/\b(\d{2})\d{3}\b/);
    if (match) {
      const dept = match[1];
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    }
  });
  const topDepts = Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count).slice(0, 5);


  return (
    <>
      <div className="entete-page">
        <div>
          <h1>Tableau de bord</h1>
          <p className="subtitle">Bienvenue dans l'administration du site bos-bop.fr</p>
        </div>
        <div>
          {isDetailed ? (
            <Link href="/admin" className="btn secondaire">Passer en mode basique</Link>
          ) : (
            <Link href="/admin?mode=detailed" className="btn principal">Voir les statistiques détaillées</Link>
          )}
        </div>
      </div>

      <div className="cards" style={{ marginBottom: 30 }}>
        <div className="card" style={{ borderTop: "4px solid var(--info)" }}>
          <div className="kpi">{formatPrice(caTotal)}</div>
          <div className="kpi-label">Chiffre d'Affaires Global</div>
        </div>
        <div className="card" style={{ borderTop: "4px solid var(--or-fonce)" }}>
          <div className="kpi">{formatPrice(caMois)}</div>
          <div className="kpi-label">CA ce mois-ci</div>
        </div>
        <div className="card" style={{ borderTop: "4px solid var(--ok)" }}>
          <div className="kpi">{paidOrders.length}</div>
          <div className="kpi-label">Ventes (Commandes payées)</div>
        </div>
        {isDetailed && (
          <div className="card" style={{ borderTop: "4px solid #8e24aa" }}>
            <div className="kpi">{retentionRate}%</div>
            <div className="kpi-label">Taux de rétention (clients fidèles)</div>
          </div>
        )}
      </div>

      {isDetailed && (
        <>
          {emailStatsList.length > 0 && (
            <div className="panel" style={{ marginBottom: 30 }}>
              <h2>Tracking des E-mails (Ouvertures)</h2>
              <table className="liste">
                <thead><tr><th>Objet de l'e-mail</th><th style={{width:"150px", textAlign:"right"}}>Ouvertures uniques</th></tr></thead>
                <tbody>
                  {emailStatsList.map(e => (
                    <tr key={e.subject}>
                      <td>{e.subject}</td>
                      <td style={{textAlign:"right"}}><span className="badge vert">{e.opens}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


          {topDepts.length > 0 && (
            <div className="panel" style={{ marginBottom: 30 }}>
              <h2>Top Départements Acheteurs</h2>
              <table className="liste">
                <thead><tr><th>Département</th><th style={{width:"150px", textAlign:"right"}}>Ventes</th></tr></thead>
                <tbody>
                  {topDepts.map(d => (
                    <tr key={d.dept}>
                      <td>Département {d.dept}</td>
                      <td style={{textAlign:"right"}}><span className="badge or">{d.count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="grille-2">

            <div className="panel">
              <h2>Top Produits Vendus</h2>
              {sortedProducts.length === 0 ? (
                <p className="vide">Aucune vente pour l'instant.</p>
              ) : (
                <table className="liste">
                  <thead><tr><th>Livre</th><th>Exemplaires</th></tr></thead>
                  <tbody>
                    {sortedProducts.map(([title, qty]) => (
                      <tr key={title}><td>{title}</td><td><span className="badge or">{qty}</span></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2>Top Départements</h2>
              <p className="subtitle" style={{marginTop:0}}>Zones géographiques de livraison</p>
              {sortedDpts.length === 0 ? (
                <p className="vide">Pas de données géographiques.</p>
              ) : (
                <table className="liste">
                  <thead><tr><th>Département</th><th>Commandes</th></tr></thead>
                  <tbody>
                    {sortedDpts.map(([dpt, count]) => (
                      <tr key={dpt}><td>Dpt. {dpt}</td><td>{count}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="panel">
              
            <div className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>Tableau de Bord Analytique</h2>
              <TrafficChart data={dailyData} />
            </div>
            <div className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>Lissage Hebdomadaire (Vision Long Terme)</h2>
              <WeeklyBarChart data={weeklyData} />
            </div>

              <h2>Pages les plus visitées (Sondes)</h2>
              {allPages.length === 0 ? (
                <p className="vide">Aucune donnée de trafic.</p>
              ) : (
                <table className="liste">
                  <thead><tr><th>Page</th><th>Vues</th><th>Humains</th><th>Temps moyen</th></tr></thead>
                  <tbody>
                    {allPages.map((p) => {
                      const avg = p.humanViewCount > 0 ? Math.round(p.totalTimeSeconds / p.humanViewCount) : 0;
                      return (
                        <tr key={p.id}>
                          <td>{p.title}</td>
                          <td><span className="badge gris">{p.viewCount}</span></td>
                          <td><span className="badge vert">{p.humanViewCount}</span></td>
                          <td>{avg}s</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2>Livres les plus consultés (Sondes)</h2>
              {allProducts.length === 0 ? (
                <p className="vide">Aucune donnée de trafic.</p>
              ) : (
                <table className="liste">
                  <thead><tr><th>Livre</th><th>Vues</th><th>Humains</th><th>Temps moyen</th></tr></thead>
                  <tbody>
                    {allProducts.map((p) => {
                      const avg = p.humanViewCount > 0 ? Math.round(p.totalTimeSeconds / p.humanViewCount) : 0;
                      return (
                        <tr key={p.id}>
                          <td>{p.title}</td>
                          <td><span className="badge gris">{p.viewCount}</span></td>
                          <td><span className="badge vert">{p.humanViewCount}</span></td>
                          <td>{avg}s</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid var(--bord)" }} />
        </>
      )}

      {/* GESTION QUOTIDIENNE */}
      <div className="cards">
        <div className="card">
          <div className="kpi">{pages}</div>
          <div className="kpi-label">Pages du site — <Link href="/admin/pages">gérer</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{unreadMessages}</div>
          <div className="kpi-label">Messages non lus — <Link href="/admin/messages">consulter</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{products}</div>
          <div className="kpi-label">Livres au catalogue — <Link href="/admin/produits">gérer</Link></div>
        </div>
        <div className="card">
          <div className="kpi">{newOrders}</div>
          <div className="kpi-label">Commandes à traiter — <Link href="/admin/commandes">voir</Link></div>
        </div>
      </div>

      {shopEnabled !== "1" && (
        <div className="notice info">
          La boutique en ligne est désactivée : le site est strictement identique au site
          d'origine. Activez-la dans les <Link href="/admin/parametres">réglages</Link> quand
          vous souhaiterez vendre les livres.
        </div>
      )}

      <div className="grille-2">
        <div className="panel">
          <h2>Derniers messages</h2>
          {lastMessages.length === 0 ? (
            <p className="vide">Aucun message pour le moment.</p>
          ) : (
            <table className="liste">
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
          )}
        </div>
        <div className="panel">
          <h2>Dernières commandes</h2>
          {lastOrders.length === 0 ? (
            <p className="vide">Aucune commande pour le moment.</p>
          ) : (
            <table className="liste">
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
          )}
        </div>
      </div>
    </>
  );
}
