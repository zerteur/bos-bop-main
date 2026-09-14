const fs = require('fs');

async function updateCrmHistory() {
  // 1. Update src/lib/actions/crm.ts to save history
  const crmActionPath = 'src/lib/actions/crm.ts';
  let crmActionCode = fs.readFileSync(crmActionPath, 'utf8');

  // Add getSetting and setSetting if missing
  if (!crmActionCode.includes('getSetting')) {
    crmActionCode = crmActionCode.replace('import { setSetting', 'import { getSetting, setSetting');
  }

  const saveHistoryLogic = `
  // Sauvegarder l'historique
  try {
    const historyStr = await getSetting("newsletterHistory", "[]");
    let history = JSON.parse(historyStr);
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      subject,
      recipientsCount: customers.length
    });
    // Garder les 50 dernières
    history = history.slice(0, 50);
    await setSetting("newsletterHistory", JSON.stringify(history));
  } catch (e) {
    console.error("Impossible de sauvegarder l'historique", e);
  }
}
`;
  
  crmActionCode = crmActionCode.replace('  }\n}', '  }\n' + saveHistoryLogic);
  fs.writeFileSync(crmActionPath, crmActionCode);

  // 2. Update src/app/admin/(panel)/crm/page.tsx
  const pagePath = 'src/app/admin/(panel)/crm/page.tsx';
  let pageCode = `import { prisma } from "@/lib/db";
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
`;
  fs.writeFileSync(pagePath, pageCode);

  // 3. Update src/app/admin/(panel)/crm/CrmClientWrapper.tsx
  const wrapperPath = 'src/app/admin/(panel)/crm/CrmClientWrapper.tsx';
  let wrapperCode = fs.readFileSync(wrapperPath, 'utf8');

  // Add history to props
  wrapperCode = wrapperCode.replace(
    'export function CrmClientWrapper({ customers }: { customers: any[] }) {',
    'export function CrmClientWrapper({ customers, history = [] }: { customers: any[], history?: any[] }) {'
  );

  // Add history table to the template
  const historyHtml = `
            <button type="submit" className="btn principal" disabled={loading} style={{ background: "#ddc076", color: "#1f2430" }}>
              {loading ? "Envoi en cours..." : "Envoyer la Newsletter"}
            </button>
          </form>

          {history.length > 0 && (
            <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid #e3e6ee" }}>
              <h3 style={{ marginBottom: "20px", color: "#1f2430" }}>Historique des envois</h3>
              <table className="liste">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Objet</th>
                    <th style={{ textAlign: "right" }}>Destinataires</th>
                    <th style={{ textAlign: "right" }}>Ouvertures</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id}>
                      <td style={{ color: "#6b7280" }}>{new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ fontWeight: 500 }}>{h.subject}</td>
                      <td style={{ textAlign: "right" }}>{h.recipientsCount}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="badge vert">{h.opens}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
`;

  wrapperCode = wrapperCode.replace(
    `            <button type="submit" className="btn principal" disabled={loading} style={{ background: "#ddc076", color: "#1f2430" }}>
              {loading ? "Envoi en cours..." : "Envoyer la Newsletter"}
            </button>
          </form>`,
    historyHtml
  );

  fs.writeFileSync(wrapperPath, wrapperCode);
  console.log('CRM Newsletter History Updated');
}

updateCrmHistory();
