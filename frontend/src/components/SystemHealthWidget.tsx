import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Ticket, Machine } from '../types';
import { Activity, ShieldCheck, AlertOctagon, HeartPulse, CheckCircle2 } from 'lucide-react';

interface SystemHealthWidgetProps {
  machines: Machine[];
  tickets: Ticket[];
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({ machines, tickets }) => {
  // Compute health ratio based on ticket data
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
    } else {
      healthyCount++;
    }
  });

  const chartData = [
    { name: 'Healthy Nodes', value: healthyCount, color: '#10b981' },
    { name: 'Warning Nodes', value: warningCount, color: '#f59e0b' },
    { name: 'Critical Nodes', value: errorCount, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  // Fallback if all 0
  if (chartData.length === 0) {
    chartData.push({ name: 'Healthy Nodes', value: machines.length || 3, color: '#10b981' });
  }

  const totalMachines = machines.length || 3;
  const healthPercent = Math.round((healthyCount / totalMachines) * 100);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between h-full min-h-[380px] shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
            <HeartPulse className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">System Health & Ratio</h2>
            <p className="text-[11px] text-slate-400 font-mono">Fleet stability analysis</p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-xs text-slate-400 block">HEALTH SCORE</span>
          <span className="text-base font-bold text-emerald-400">{healthPercent}%</span>
        </div>
      </div>

      {/* Donut Chart with Center Metric */}
      <div className="relative w-full h-[200px] flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
              formatter={(value: any, name: any) => [`${value} Node(s)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Overlay Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
          <span className="text-2xl font-bold text-white tracking-tight">{healthyCount}/{totalMachines}</span>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase">Healthy</span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs mt-2">
        <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block uppercase">Healthy</span>
          <span className="text-sm font-bold text-emerald-400">{healthyCount}</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block uppercase">Warning</span>
          <span className="text-sm font-bold text-amber-400">{warningCount}</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 block uppercase">Critical</span>
          <span className="text-sm font-bold text-rose-400">{errorCount}</span>
        </div>
      </div>

      {/* Footer Alert Status */}
      <div className="mt-3 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          Active Tickets: <strong className="text-white">{openTickets.length}</strong>
        </span>
        <span className="text-[10px] text-slate-500">Auto-Evaluated</span>
      </div>

    </div>
  );
};
