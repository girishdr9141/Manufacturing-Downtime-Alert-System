import React, { useState, useEffect, useCallback } from 'react';
import { Machine, Ticket } from '../types';
import { Activity, Thermometer, Zap, AlertOctagon, CheckCircle2, UserCheck, Bell, ClipboardCheck, LogOut } from 'lucide-react';

interface DispatchJob {
  ticketId: string;
  machineId: string;
  expertName: string;
  expertRole: string;
  notes: string;
  runbook: string;
  description: string;
  priority: string;
  dispatchedAt: string;
  resolved: boolean;
}

interface OperatorDashboardProps {
  machine: Machine | null;
  tickets: Ticket[];
  isDark: boolean;
  onLogout: () => void;
  currentUser: any;
  onToggleTheme: () => void;
}

const MFG_CHANNEL = 'mfg_dx_notifications';

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ machine, tickets, isDark, onLogout, currentUser, onToggleTheme }) => {
  const [assignedJobs, setAssignedJobs] = useState<DispatchJob[]>([]);
  const [newJobAlert, setNewJobAlert]   = useState<DispatchJob | null>(null);

  // ── Sync Jobs from DB Tickets ───────────────────────────────────────────────
  useEffect(() => {
    const syncedJobs = tickets
      .filter(t => t.status !== 'RESOLVED' && t.dispatched_expert)
      .map(t => ({
        ticketId: t.ticket_id,
        machineId: t.machine_id,
        expertName: t.dispatched_expert!,
        expertRole: 'Field Expert',
        notes: t.dispatched_notes || '',
        runbook: t.ai_runbook || '',
        description: t.description || '',
        priority: t.priority,
        dispatchedAt: new Date(t.updated_at || t.created_at).toLocaleTimeString(),
        resolved: false
      }));

    setAssignedJobs(prev => {
      const merged = [...prev];
      syncedJobs.forEach(sj => {
        if (!merged.find(j => j.ticketId === sj.ticketId)) {
          merged.push(sj);
        }
      });
      return merged;
    });
  }, [tickets]);

  // ── Listen for expert dispatch messages from admin tab ──────────────────────
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(MFG_CHANNEL);
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'EXPERT_DISPATCHED') {
          // Only show if it's for this machine (or if no machine assigned yet, show all)
          if (!machine || msg.machineId === machine.id) {
            const job: DispatchJob = { ...msg, resolved: false };
            setAssignedJobs(prev => {
              const exists = prev.some(j => j.ticketId === job.ticketId);
              return exists ? prev : [job, ...prev];
            });
            setNewJobAlert(job);
            setTimeout(() => setNewJobAlert(null), 6000);
          }
        }
      };
    } catch {
      // BroadcastChannel not supported (very old browsers)
    }
    return () => channel?.close();
  }, [machine]);

  // ── Mark a job as resolved and notify admin tab ─────────────────────────────
  const markResolved = useCallback((job: DispatchJob) => {
    setAssignedJobs(prev => prev.map(j => j.ticketId === job.ticketId ? { ...j, resolved: true } : j));
    try {
      const channel = new BroadcastChannel(MFG_CHANNEL);
      channel.postMessage({
        type: 'ISSUE_RESOLVED',
        ticketId:   job.ticketId,
        machineId:  job.machineId,
        expertName: job.expertName,
        resolvedAt: new Date().toLocaleTimeString(),
      });
      channel.close();
    } catch { /* ignore */ }
  }, []);

  const activeTickets = tickets.filter(t => machine && t.machine_id === machine.id && t.status !== 'RESOLVED');

  const getStatusGlow = (status: string) => {
    if (!status) return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    if (status.includes('CRITICAL') || status.includes('ERROR')) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (status.includes('WARNING')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';

  const mStatus = machine?.status || 'AWAITING TELEMETRY';
  const mTemp = machine?.temperature || 0;
  const mVib = machine?.vibration || 0;
  const mPower = machine?.power_kw || 0;
  const mRpm = machine?.rpm || 0;

  return (
    <div className={`flex flex-col h-full space-y-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>

      {/* ── Incoming Job Alert Banner ── */}
      {newJobAlert && (
        <div className="fixed top-4 right-4 z-50 w-80 animate-bounce-once">
          <div className={`rounded-2xl border shadow-2xl p-4 ${isDark ? 'bg-slate-900 border-emerald-500/50' : 'bg-white border-emerald-400'}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>🔧 Expert Assigned to You!</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}><strong>{newJobAlert.expertName}</strong> has been dispatched to your machine.</p>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{newJobAlert.machineId} · {newJobAlert.ticketId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className={`flex items-center justify-between p-5 rounded-2xl border ${card}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {(currentUser?.name || currentUser?.email || 'O')[0].toUpperCase()}
            </div>
            <div>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name || currentUser?.email}</p>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Floor Operator</p>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-3">{machine?.name || machine?.id || 'Unknown Machine'}</h1>
          <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            ID: {machine?.id || '---'} · {machine?.location || '---'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono ${getStatusGlow(mStatus)}`}>
            <Activity className="w-4 h-4" />
            {mStatus}
          </div>
          
          <button onClick={onToggleTheme} className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <span className={`absolute w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`}>
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>

          <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors">
            <LogOut className="w-3.5 h-3.5" /> End Shift
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* Telemetry gauges */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { icon: <Thermometer className="w-7 h-7" />, value: `${mTemp.toFixed(1)}°C`, label: 'Core Temp', warn: mTemp > 80, critical: mTemp > 95 },
            { icon: <Activity className="w-7 h-7" />, value: `${mVib.toFixed(2)} mm/s`, label: 'Vibration', warn: mVib > 6, critical: mVib > 9 },
            { icon: <Zap className="w-7 h-7" />, value: `${mPower.toFixed(1)} kW`, label: 'Power Draw', warn: mPower < 1 && mPower > 0, critical: mPower === 0 && machine },
            { icon: <span className="text-2xl font-bold font-mono">{mRpm}</span>, value: null, label: 'Rotor RPM', warn: mRpm < 1200 && mRpm > 0, critical: mRpm === 0 && machine },
          ].map((g, i) => (
            <div key={i} className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${card}`}>
              <div className={g.critical ? 'text-rose-400' : g.warn ? 'text-amber-400' : 'text-emerald-400'}>
                {g.icon}
              </div>
              {g.value && <span className={`text-3xl font-bold font-mono mt-3 ${g.critical ? 'text-rose-400' : g.warn ? 'text-amber-400' : isDark ? 'text-white' : 'text-slate-900'}`}>{g.value}</span>}
              <span className={`text-xs font-medium mt-1.5 uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{g.label}</span>
            </div>
          ))}
        </div>

        {/* Right panel: Assigned Jobs + Active Alerts */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* ── Assigned Work Orders from Admin ── */}
          <div className={`flex-1 rounded-2xl border flex flex-col p-4 ${card}`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <UserCheck className="w-4 h-4 text-blue-400" />
              Assigned Work Orders
              {assignedJobs.filter(j => !j.resolved).length > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                  {assignedJobs.filter(j => !j.resolved).length} OPEN
                </span>
              )}
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {assignedJobs.length === 0 ? (
                <div className={`py-6 text-center text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  <UserCheck className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No work orders assigned yet.<br/>Admin will dispatch experts here.
                </div>
              ) : assignedJobs.map(job => (
                <div key={job.ticketId} className={`p-3 rounded-xl border text-xs transition-all ${
                  job.resolved
                    ? isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'
                    : isDark ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{job.ticketId}</span>
                    {job.resolved
                      ? <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> RESOLVED</span>
                      : <span className="text-[10px] text-blue-400 font-mono animate-pulse">● IN PROGRESS</span>
                    }
                  </div>
                  <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{job.expertName}</p>
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{job.expertRole}</p>
                  {job.notes && <p className={`mt-1 italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>"{job.notes}"</p>}
                  <p className={`mt-1 text-[10px] font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{job.dispatchedAt}</p>

                  {!job.resolved && (
                    <button
                      onClick={() => markResolved(job)}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Mark Issue as Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Active Alerts ── */}
          <div className={`rounded-2xl border p-4 flex flex-col ${card}`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Active Alerts
            </h2>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {activeTickets.length === 0 ? (
                <p className={`text-xs text-center py-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No active alerts.</p>
              ) : activeTickets.map(ticket => (
                <div key={ticket.ticket_id} className={`p-2.5 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold font-mono text-rose-400">{ticket.priority} · {ticket.ticket_id}</span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{ticket.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
