import React, { useState, useEffect, useCallback } from 'react';
import { Machine, Ticket } from '../types';
import { useI18n } from '../i18n';
import { Activity, Thermometer, Zap, AlertOctagon, CheckCircle2, UserCheck, Bell, ClipboardCheck, LogOut, CheckCircle, User, AlertTriangle, AlertCircle } from 'lucide-react';

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
  const { t, lang, setLang } = useI18n();
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

  const markJobResolved = useCallback((ticketId: string) => {
    setAssignedJobs(prev => prev.map(j => j.ticketId === ticketId ? { ...j, resolved: true } : j));
    
    // Find the job to get the machineId and expertName
    const job = assignedJobs.find(j => j.ticketId === ticketId);
    if (!job) return;

    try {
      const channel = new BroadcastChannel(MFG_CHANNEL);
      channel.postMessage({
        type: 'ISSUE_RESOLVED',
        ticketId: job.ticketId,
        machineId: job.machineId,
        expertName: job.expertName,
        resolvedAt: new Date().toLocaleTimeString(),
      });
      channel.close();
    } catch { /* ignore */ }
  }, [assignedJobs]);

  const activeTickets = tickets.filter(t => machine && t.machine_id === machine.id && t.status !== 'RESOLVED');

  const getStatusGlow = (status: string) => {
    if (!status) return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    if (status.includes('CRITICAL') || status.includes('ERROR')) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (status.includes('WARNING')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';

  const mStatus = machine?.status || t('awaitingTelemetry');
  const mTemp = machine?.temperature || 0;
  const mVib = machine?.vibration || 0;
  const mPower = machine?.power_kw || 0;
  const mRpm = machine?.rpm || 0;

  return (
    <div className={`flex flex-col h-full space-y-4 font-sans transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>

      {/* ── Incoming Job Alert Banner ── */}
      {newJobAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border-blue-500/30' : 'bg-white border-blue-200'}`}>
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('expertAssigned')}</h2>
            <p className={`text-center mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong className="text-blue-500">{newJobAlert.expertName}</strong> {t('dispatchedTo')}
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border ${card}`}>
        <div className="mb-4 md:mb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {(currentUser?.name || currentUser?.email || 'O')[0].toUpperCase()}
            </div>
            <div>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name || currentUser?.email}</p>
              <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('operatorRole')}</p>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-3">{machine?.name || machine?.id || t('unknownMachine')}</h1>
          <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            ID: {machine?.id || '---'} · {machine?.location || '---'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'en' ? 'ja' : 'en')} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'}`}>
            {lang === 'en' ? 'EN' : 'JA'}
          </button>
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
            <LogOut className="w-3.5 h-3.5" /> {t('endShift')}
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">

        {/* Telemetry gauges */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { icon: <Thermometer className="w-7 h-7" />, value: `${mTemp.toFixed(1)}°C`, label: t('coreTemp'), warn: mTemp > 80, critical: mTemp > 95 },
            { icon: <Activity className="w-7 h-7" />, value: `${mVib.toFixed(2)} mm/s`, label: t('vibration'), warn: mVib > 6, critical: mVib > 9 },
            { icon: <Zap className="w-7 h-7" />, value: `${mPower.toFixed(1)} kW`, label: t('powerDraw'), warn: mPower < 1 && mPower > 0, critical: mPower === 0 && machine },
            { icon: <span className="text-2xl font-bold font-mono">{mRpm}</span>, value: null, label: t('rotorRpm'), warn: mRpm < 1200 && mRpm > 0, critical: mRpm === 0 && machine },
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
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">

          {/* ── Assigned Work Orders from Admin ── */}
          <div className={`flex-1 rounded-2xl border p-5 flex flex-col min-h-[300px] overflow-hidden ${card}`}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" /> {t('assignedWorkOrders')}
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {assignedJobs.length === 0 ? (
                <div className={`h-full flex items-center justify-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('noWorkOrders')}
                </div>
              ) : assignedJobs.map(job => (
                <div key={job.ticketId} className={`p-4 rounded-xl border ${
                  job.resolved
                    ? isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-200'
                    : isDark ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{job.ticketId}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{job.expertName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{job.expertRole}</span>
                  </div>
                  {job.notes && <p className={`text-xs italic mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>"{job.notes}"</p>}
                  
                  <div className="flex items-center gap-2">
                    {job.resolved ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {t('resolved')}</span>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1 animate-pulse"><Activity className="w-3.5 h-3.5" /> {t('inProgress')}</span>
                        <button
                          onClick={() => markJobResolved(job.ticketId)}
                          className="ml-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-bold transition-colors"
                        >
                          {t('markResolved')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Active Alerts ── */}
          <div className={`rounded-2xl border p-4 flex flex-col ${card}`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              {t('activeAlerts')}
            </h2>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {activeTickets.length === 0 ? (
                <p className={`text-xs text-center py-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t('noActiveAlerts')}</p>
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
