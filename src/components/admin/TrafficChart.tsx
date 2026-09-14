"use client";

import { useState } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

const COLORS = ['#1f2430', '#ddc076', '#f4f5f8', '#c0392b'];

export function TrafficChart({ data }: { data: any[] }) {
  const [days, setDays] = useState(30);

  if (!data || data.length === 0) {
    return <p className="vide">Pas encore de données temporelles pour le graphique.</p>;
  }

  // Filtrage dynamique
  const filteredData = days === 0 ? data : data.slice(-days);

  // Données pour le PieChart (Humains vs Bots)
  const totalViews = filteredData.reduce((acc, curr) => acc + curr.views, 0);
  const totalHumans = filteredData.reduce((acc, curr) => acc + curr.humanViews, 0);
  const pieData = [
    { name: 'Humains', value: totalHumans },
    { name: 'Robots (Bots)', value: totalViews - totalHumans }
  ];

  // Calcul du temps moyen pour l'AreaChart
  const areaData = filteredData.map(d => ({
    date: d.date,
    avgTime: d.humanViews > 0 ? Math.round(d.duration / d.humanViews) : 0
  }));

  return (
    <div style={{ marginTop: 20 }}>
      {/* Contrôles Dynamiques */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className={`btn ${days === 7 ? 'principal' : 'secondaire'}`} onClick={() => setDays(7)}>7 Jours</button>
        <button type="button" className={`btn ${days === 14 ? 'principal' : 'secondaire'}`} onClick={() => setDays(14)}>14 Jours</button>
        <button type="button" className={`btn ${days === 30 ? 'principal' : 'secondaire'}`} onClick={() => setDays(30)}>30 Jours</button>
        <button type="button" className={`btn ${days === 0 ? 'principal' : 'secondaire'}`} onClick={() => setDays(0)}>Tout l'historique</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        
        {/* Graphique principal : Lignes */}
        <div style={{ gridColumn: '1 / -1', height: 350 }}>
          <h3 style={{ textAlign: 'center', color: '#1f2430', marginBottom: 20 }}>Visites Quotidiennes</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="views" name="Vues totales" stroke="#ddc076" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="humanViews" name="Vues (Humains)" stroke="#1f2430" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique Répartition Humains/Bots */}
        <div style={{ height: 300 }}>
          <h3 style={{ textAlign: 'center', color: '#1f2430', marginBottom: 20 }}>Répartition du Trafic</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique Temps Moyen */}
        <div style={{ height: 300 }}>
          <h3 style={{ textAlign: 'center', color: '#1f2430', marginBottom: 20 }}>Temps moyen passé (sec)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="avgTime" name="Secondes" stroke="#ddc076" fill="#fbf7ea" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export function WeeklyBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{ width: '100%', height: 250, marginTop: 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="week" stroke="#888" fontSize={12} />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip cursor={{fill: '#f4f5f8'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          <Legend />
          <Bar dataKey="views" name="Lissage Hebdomadaire (Vues)" fill="#1f2430" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
