const fs = require('fs');

function updateDashboardStats() {
  const filePath = 'src/app/admin/(panel)/page.tsx';
  let code = fs.readFileSync(filePath, 'utf8');

  const oldTrafficLoop = `  const dailyMap: Record<string, { views: number, humanViews: number }> = {};
  const weeklyMap: Record<string, number> = {};
  
  trafficStats?.forEach(t => {
    if (!dailyMap[t.date]) dailyMap[t.date] = { views: 0, humanViews: 0 };
    dailyMap[t.date].views += t.views;
    dailyMap[t.date].humanViews += t.humanViews;`;

  const newTrafficLoop = `  const dailyMap: Record<string, { views: number, humanViews: number }> = {};
  const weeklyMap: Record<string, number> = {};
  const emailStatsMap: Record<string, number> = {};
  
  trafficStats?.forEach(t => {
    if (t.path.startsWith("email:")) {
      const subject = t.path.replace("email:", "");
      emailStatsMap[subject] = (emailStatsMap[subject] || 0) + t.views;
      return; // Do not count as a page view
    }
  
    if (!dailyMap[t.date]) dailyMap[t.date] = { views: 0, humanViews: 0 };
    dailyMap[t.date].views += t.views;
    dailyMap[t.date].humanViews += t.humanViews;`;

  code = code.replace(oldTrafficLoop, newTrafficLoop);

  const oldDataGen = `  const dailyData = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));
  const weeklyData = Object.entries(weeklyMap).map(([week, views]) => ({ week, views }));`;

  const newDataGen = `  const dailyData = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));
  const weeklyData = Object.entries(weeklyMap).map(([week, views]) => ({ week, views }));
  const emailStatsList = Object.entries(emailStatsMap).map(([subject, opens]) => ({ subject, opens })).sort((a, b) => b.opens - a.opens);`;

  code = code.replace(oldDataGen, newDataGen);

  const oldHtml = `      {isDetailed && (
        <>
          <div className="grille-2">
            <div className="panel">`;

  const newHtml = `      {isDetailed && (
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

          <div className="grille-2">
            <div className="panel">`;

  code = code.replace(oldHtml, newHtml);

  fs.writeFileSync(filePath, code);
  console.log('Successfully added email stats to dashboard');
}

updateDashboardStats();
