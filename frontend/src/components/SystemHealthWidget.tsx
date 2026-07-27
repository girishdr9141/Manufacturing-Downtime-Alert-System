import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Ticket, Machine } from '../types';
import { AlertOctagon, HeartPulse } from 'lucide-react';

interface SystemHealthWidgetProps {
  machines: Machine[];
  tickets: Ticket[];
  isDark?: boolean;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ machines, tickets, isDark = true }) => {
  const openTickets = tickets.filter((t) => t.status === 'OPEN');

  let healthyCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  machines.forEach((m) => {
    const mOpen = openTickets.filter((t) => t.machine_id === m.id);
    if (mOpen.some((t) => t.priority === 'P1' || t.priority === 'CRITICAL')) {
      errorCount++;
    } else if (mOpen.length > 0) {
      warningCount++;
    } else if (m.status.includes('CRITICAL') || m.status.includes('ERROR')) {
      errorCount++;
    } else if (m.status.includes('WARNING')) {
      warningCount++;
    } else {
      healthyCount++;
    }
  });

  const chartData = [
    { name: 'Healthy Nodes', value: healthyCount, color: '#10b981' },
    { name: 'Warning Nodes', value: warningCount, color: '#f59e0b' },
    { name: 'Critical Nodes', value: errorCount, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    chartData.push({ name: 'Healthy Nodes', value: machines.length || 3, color: '#10b981' });
  }

  const totalMachines = machines.length || 3;
  const healthPercent = Math.round((healthyCount / totalMachines) * 100);

  // Theme helpers
  const card = isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200 shadow-md';
  const headerTitle = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const scoreLabel = isDark ? 'text-slate-400' : 'text-slate-500';
  const centerLabel = isDark ? 'text-white' : 'text-slate-900';
  const centerSub = isDark ? 'text-slate-400' : 'text-slate-500';
  const breakdownCard = isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-100 border-slate-200';
  const breakdownLabel = isDark ? 'text-slate-400' : 'text-slate-500';
  const footer = isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500';
  const footerStrong = isDark ? 'text-white' : 'text-slate-900';

  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }
    : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', fontFamily: 'monospace', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };

  return (
    <div className={`border rounded-2xl p-5 flex flex-col justify-between h-full min-h-[380px] transition-colors duration-300 ${card}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-600'}`}>
            <HeartPulse className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold tracking-tight ${headerTitle}`}>System Health &amp; Ratio</h2>
            <p className={`text-[11px] font-mono ${subText}`}>Fleet stability analysis</p>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className={`text-xs block ${scoreLabel}`}>HEALTH SCORE</span>
          <span className="text-base font-bold text-emerald-400">{healthPercent}%</span>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="relative w-full h-[200px] flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="transparent">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => [`${value} Node(s)`, name]} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
          <span className={`text-2xl font-bold tracking-tight ${centerLabel}`}>{healthyCount}/{totalMachines}</span>
          <span className={`text-[10px] tracking-wider uppercase ${centerSub}`}>Healthy</span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs mt-2">
        <div className={`border p-2.5 rounded-xl text-center transition-colors ${breakdownCard}`}>
          <span className={`text-[10px] block uppercase ${breakdownLabel}`}>Healthy</span>
          <span className="text-sm font-bold text-emerald-400">{healthyCount}</span>
        </div>
        <div className={`border p-2.5 rounded-xl text-center transition-colors ${breakdownCard}`}>
          <span className={`text-[10px] block uppercase ${breakdownLabel}`}>Warning</span>
          <span className="text-sm font-bold text-amber-400">{warningCount}</span>
        </div>
        <div className={`border p-2.5 rounded-xl text-center transition-colors ${breakdownCard}`}>
          <span className={`text-[10px] block uppercase ${breakdownLabel}`}>Critical</span>
          <span className="text-sm font-bold text-rose-400">{errorCount}</span>
        </div>
      </div>

      {/* Footer */}
      <div className={`mt-3 border rounded-xl px-3 py-2 flex items-center justify-between text-xs font-mono transition-colors ${footer}`}>
        <span className="flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          Active Tickets: <strong className={footerStrong}>{openTickets.length}</strong>
        </span>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Auto-Evaluated</span>
      </div>
    </div>
  );
};
