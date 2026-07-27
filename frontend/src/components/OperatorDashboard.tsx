import React from 'react';
import { Machine, Ticket } from '../types';
import { Activity, Thermometer, Zap, AlertOctagon } from 'lucide-react';

interface OperatorDashboardProps {
  machine: Machine | null;
  tickets: Ticket[];
  isDark: boolean;
  onLogout: () => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ machine, tickets, isDark, onLogout }) => {
  if (!machine) {
    return (
      <div className={`flex items-center justify-center h-full min-h-[400px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <p>No telemetry received for this machine yet. Awaiting agent connection...</p>
      </div>
    );
  }

  const activeTickets = tickets.filter(t => t.machine_id === machine.id && t.status !== 'RESOLVED');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-emerald-500';
      case 'WARNING': return 'text-amber-500';
      case 'ERROR': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'HEALTHY': return isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-100 border-emerald-300';
      case 'WARNING': return isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-100 border-amber-300';
      case 'ERROR': return isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-100 border-rose-300';
      default: return isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300';
    }
  };

  return (
    <div className={`flex flex-col h-full space-y-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* Operator Header */}
      <div className={`flex items-center justify-between p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{machine.name}</h1>
          <p className="text-sm text-slate-500 font-mono mt-1">ID: {machine.id} | LOC: {machine.location}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-semibold ${getStatusBg(machine.status)} ${getStatusColor(machine.status)}`}>
            <Activity className="w-5 h-5" />
            {machine.status}
          </div>
          <button onClick={onLogout} className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors text-sm">
            End Shift (Logout)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        
        {/* Telemetry Gauges */}
        <div className={`col-span-2 grid grid-cols-2 gap-4`}>
          
          <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <Thermometer className={`w-8 h-8 mb-4 ${machine.temperature > 90 ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span className="text-4xl font-bold font-mono">{machine.temperature.toFixed(1)}°C</span>
            <span className="text-sm font-medium mt-2 uppercase tracking-widest text-slate-500">Core Temp</span>
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <Activity className={`w-8 h-8 mb-4 ${machine.vibration > 10 ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className="text-4xl font-bold font-mono">{machine.vibration.toFixed(2)} Hz</span>
            <span className="text-sm font-medium mt-2 uppercase tracking-widest text-slate-500">Vibration Harmonic</span>
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <Zap className={`w-8 h-8 mb-4 ${machine.power_kw === 0 ? 'text-slate-500' : 'text-yellow-500'}`} />
            <span className="text-4xl font-bold font-mono">{machine.power_kw.toFixed(1)} kW</span>
            <span className="text-sm font-medium mt-2 uppercase tracking-widest text-slate-500">Power Draw</span>
          </div>
          
          <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className="text-4xl font-bold font-mono">{machine.rpm}</span>
            <span className="text-sm font-medium mt-2 uppercase tracking-widest text-slate-500">Rotor RPM</span>
          </div>

        </div>

        {/* Assigned Runbooks / Alerts */}
        <div className={`p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            Active Alerts & Runbooks
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {activeTickets.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
                No active maintenance required.
              </div>
            ) : (
              activeTickets.map(ticket => (
                <div key={ticket.ticket_id} className={`p-4 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">{ticket.priority}</span>
                    <span className="text-[10px] text-slate-500">{new Date(ticket.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm font-semibold mb-3">{ticket.description}</p>
                  
                  <div className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap ${isDark ? 'bg-slate-950/80 text-cyan-400 border border-slate-800' : 'bg-slate-800 text-cyan-300'}`}>
                    {ticket.ai_runbook}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
