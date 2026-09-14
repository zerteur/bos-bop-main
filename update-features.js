const fs = require('fs');

async function updateAll() {
  // 1. Fix Magic Link
  const crmActionPath = 'src/lib/actions/crm.ts';
  let crmActionCode = fs.readFileSync(crmActionPath, 'utf8');

  const oldUnsubscribe = `Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
      Pour vous désinscrire, répondez STOP à cet e-mail.`;
  const newUnsubscribe = `Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
      <a href="\${process.env.SITE_URL || 'https://www.bos-bop.fr'}/api/unsubscribe?email=\${encodeURIComponent(customer.email)}" style="color: #ddc076; text-decoration: underline;">Se désinscrire en un clic</a>`;
  
  // also fix the encoding issue if there was any accent problem.
  crmActionCode = crmActionCode.replace(oldUnsubscribe, newUnsubscribe);

  // Also fix the accent issues because my prev script might have messed them up 
  crmActionCode = crmActionCode.replace('Vous recevez cet e-mail car vous Ǧtes inscrit  notre newsletter ou vous avez passǸ commande.', 'Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.');
  crmActionCode = crmActionCode.replace('Pour vous dǸsinscrire, rǸpondez STOP  cet e-mail.', 'Pour vous désinscrire, répondez STOP à cet e-mail.');
  crmActionCode = crmActionCode.replace(
    'Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>\n      Pour vous désinscrire, répondez STOP à cet e-mail.',
    `Vous recevez cet e-mail car vous êtes inscrit à notre newsletter ou vous avez passé commande.<br/>
      <a href="\${process.env.SITE_URL || 'https://www.bos-bop.fr'}/api/unsubscribe?email=\${encodeURIComponent(customer.email)}" style="color: #ddc076; text-decoration: underline;">Se désinscrire en un clic</a>`
  );

  fs.writeFileSync(crmActionPath, crmActionCode);

  // 2. Fix admin css
  const cssPath = 'src/app/admin/admin.css';
  let cssCode = fs.readFileSync(cssPath, 'utf8');

  // use all space
  cssCode = cssCode.replace('.admin-main { flex: 1; padding: 28px 34px 60px; max-width: 1200px; }', '.admin-main { flex: 1; padding: 28px 34px 60px; max-width: 100%; }');

  // improve tables
  cssCode = cssCode.replace('table.liste th { background: #fafbfd; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--texte-2); }', 'table.liste th { background: #fafbfd; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--texte-2); border-bottom: 2px solid var(--bord); }\ntable.liste tbody tr:hover { background: #fbfbfc; }\ntable.liste { box-shadow: 0 4px 6px rgba(0,0,0,0.02); }');
  
  fs.writeFileSync(cssPath, cssCode);

  // 3. Add Top Departements to Dashboard
  const pagePath = 'src/app/admin/(panel)/page.tsx';
  let pageCode = fs.readFileSync(pagePath, 'utf8');

  const deptExtractLogic = `
  const emailStatsList = Object.entries(emailStatsMap).map(([subject, opens]) => ({ subject, opens })).sort((a, b) => b.opens - a.opens);

  // Extract Top Departments
  const deptMap: Record<string, number> = {};
  paidOrders.forEach(o => {
    const match = o.address.match(/\\b(\\d{2})\\d{3}\\b/);
    if (match) {
      const dept = match[1];
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    }
  });
  const topDepts = Object.entries(deptMap).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count).slice(0, 5);
`;

  pageCode = pageCode.replace('  const emailStatsList = Object.entries(emailStatsMap).map(([subject, opens]) => ({ subject, opens })).sort((a, b) => b.opens - a.opens);', deptExtractLogic);

  const newHtml = `
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
`;
  pageCode = pageCode.replace('          <div className="grille-2">', newHtml);
  fs.writeFileSync(pagePath, pageCode);

  console.log('Done script');
}

updateAll();
