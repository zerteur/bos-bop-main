"use client";

import { useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";

const COLORS = ["#1f2430", "#ddc076"];

const tooltipBox = {
  borderRadius: "10px",
  border: "none",
  boxShadow: "0 8px 24px rgba(20,30,60,0.12)",
  fontSize: 13,
};

type DayPoint = {
  date: string;
  views: number;
  humanViews: number;
  duration?: number;
  ventes?: number;
  ca?: number;
};
type WeekPoint = { week: string; views: number };

function shortDate(value: string) {
  const parts = String(value).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}

function ConversionTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const vues = payload.find((p) => p.dataKey === "humanViews")?.value || 0;
  const ventes = payload.find((p) => p.dataKey === "ventes")?.value || 0;
  const conversion = vues > 0 ? ((ventes / vues) * 100).toFixed(1) : "0.0";
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{shortDate(label || "")}</p>
      <div className="chart-tooltip-row">
        <span>Visiteurs</span>
        <strong>{vues}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>Ventes</span>
        <strong>{ventes}</strong>
      </div>
      <div className="chart-tooltip-conv">
        <span>Conversion</span>
        <strong>{conversion} %</strong>
      </div>
    </div>
  );
}

export function TrafficChart({
  data,
  weeklyData = [],
  compact = false,
}: {
  data: DayPoint[];
  weeklyData?: WeekPoint[];
  compact?: boolean;
}) {
  const [days, setDays] = useState(30);

  if (!data || data.length === 0) {
    return <p className="vide">Pas encore de données temporelles pour le graphique.</p>;
  }

  const filteredData = days === 0 ? data : data.slice(-days);
  const totalViews = filteredData.reduce((acc, curr) => acc + curr.views, 0);
  const totalHumans = filteredData.reduce((acc, curr) => acc + curr.humanViews, 0);
  const totalBots = Math.max(0, totalViews - totalHumans);
  const pieData = [
    { name: "Humains", value: totalHumans },
    { name: "Robots", value: totalBots },
  ];
  const areaData = filteredData.map((d) => ({
    date: d.date,
    avgTime: d.humanViews > 0 ? Math.round((d.duration || 0) / d.humanViews) : 0,
  }));

  const ranges = [
    { n: 7, label: "7 j" },
    { n: 14, label: "14 j" },
    { n: 30, label: "30 j" },
    { n: 0, label: "Tout" },
  ];

  const composed = (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={filteredData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
        <XAxis dataKey="date" tickFormatter={shortDate} stroke="#9aa1b5" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="#9aa1b5" fontSize={11} width={28} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#2e7d32" fontSize={11} width={24} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ConversionTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} iconType="circle" />
        <Bar yAxisId="right" dataKey="ventes" name="Ventes" barSize={compact ? 14 : 18} fill="url(#colorVentes)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Line yAxisId="left" type="monotone" dataKey="humanViews" name="Visiteurs" stroke="#1f2430" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const toolbar = (
    <div className="chart-toolbar">
      {ranges.map((r) => (
        <button
          key={r.n}
          type="button"
          className={`btn petit ${days === r.n ? "principal" : "secondaire"}`}
          onClick={() => setDays(r.n)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  const humanPct = totalViews > 0 ? Math.round((totalHumans / totalViews) * 100) : 0;
  const donut = (
    <div className="chart-donut">
      <div className="chart-donut-plot">
        <ResponsiveContainer width={compact ? 108 : 160} height={compact ? 108 : 160}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={compact ? 32 : 52}
              outerRadius={compact ? 48 : 72}
              paddingAngle={3}
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipBox} />
          </PieChart>
        </ResponsiveContainer>
        <span className="chart-donut-center">{humanPct}%</span>
      </div>
      <ul className="chart-donut-legend">
        <li>
          <i style={{ background: COLORS[0] }} />
          Humains <strong>{totalHumans}</strong>
        </li>
        <li>
          <i style={{ background: COLORS[1] }} />
          Robots <strong>{totalBots}</strong>
        </li>
      </ul>
    </div>
  );

  return (
    <div className={compact ? "chart-compact" : "chart-full"}>
      {!compact && toolbar}

      {compact ? (
        <>
          <div className="chart-compact-head">
            <h2>Trafic et conversion</h2>
            {toolbar}
          </div>
          <div className="chart-grid">
            <div className="chart-main">
              <div className="chart-plot">{composed}</div>
            </div>
            {donut}
          </div>
        </>
      ) : (
        <div className="chart-full-grid">
          <div className="chart-full-line">
            <h3>Analyse croisée : trafic et ventes</h3>
            {composed}
          </div>
          <div className="chart-full-pie">{donut}</div>
          <div className="chart-full-area">
            <h3>Engagement (temps moyen)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={tooltipBox} />
                <Area type="monotone" dataKey="avgTime" name="Secondes" stroke="#ddc076" fill="#fbf7ea" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {weeklyData.length > 0 && (
            <div className="chart-weekly">
              <h3>Tendance hebdomadaire</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="week" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip cursor={{ fill: "#f4f5f8" }} contentStyle={tooltipBox} />
                  <Bar dataKey="views" name="Vues" fill="#1f2430" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WeeklyBarChart({ data }: { data: WeekPoint[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="chart-weekly">
      <h3>Tendance hebdomadaire</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="week" stroke="#888" fontSize={12} />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip cursor={{ fill: "#f4f5f8" }} contentStyle={tooltipBox} />
          <Legend />
          <Bar dataKey="views" name="Vues hebdomadaires" fill="#1f2430" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
