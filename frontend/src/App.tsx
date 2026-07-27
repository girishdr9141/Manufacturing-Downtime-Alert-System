import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { LiveFleetMapWidget } from './components/LiveFleetMapWidget';
import { SystemHealthWidget } from './components/SystemHealthWidget';
import { ActiveTicketsWidget } from './components/ActiveTicketsWidget';
import { C2DCommandPanel } from './components/C2DCommandPanel';
import { ToastContainer } from './components/ToastContainer';
import { OperatorDashboard } from './components/OperatorDashboard';

import { Ticket, Machine, ToastMessage, C2DCommandLog } from './types';

// ─── Environment ─────────────────────────────────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const WS_URL  = (import.meta.env.VITE_WS_URL  || '').replace(/\/+$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isAnomaly(status: string): boolean {
  return status.includes('CRITICAL') || status.includes('ERROR') || status.includes('WARNING');
}

function isError(status: string): boolean {
  return status.includes('CRITICAL') || status.includes('ERROR');
}

function makePriority(status: string): 'P1' | 'P2' {
  return status.includes('CRITICAL') ? 'P1' : 'P2';
}

function makeRunbook(status: string, temp: number): string {
  if (status.includes('CRITICAL') || temp > 95) {
    return '1. IMMEDIATELY isolate machine power.\n2. Check coolant fluid levels and thermal sensor.\n3. Notify supervisor before restarting.';
  }
  if (status.includes('ERROR')) {
    return '1. Check power feed and circuit breakers.\n2. Inspect for physical damage or loose connections.\n3. Run diagnostic self-test before restart.';
  }
  return '1. Schedule preventive maintenance within 24 hours.\n2. Monitor temperature trend over next 2 hours.\n3. Alert floor supervisor if status worsens.';
}

/** Auto-generate a local ticket for a machine in anomaly state. */
function buildTicket(machine: Machine): Ticket {
  return {
    ticket_id:   `INC-${machine.id.slice(-3)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    machine_id:  machine.id,
    priority:    makePriority(machine.status),
    status:      'OPEN',
    description: `Anomaly detected on ${machine.id}: ${machine.status}. Temp: ${machine.temperature}°C, Vibration: ${machine.vibration} mm/s`,
    ai_runbook:  makeRunbook(machine.status, machine.temperature),
    created_at:  new Date().toISOString(),
  };
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',       icon: '⊞' },
  { id: 'map',       label: 'Live Factory Map',icon: '📍' },
  { id: 'tickets',   label: 'IT Tickets',      icon: '🎫' },
  { id: 'c2d',       label: 'C2D Control',     icon: '⚡' },
  { id: 'health',    label: 'System Health',   icon: '📊' },
];

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser,      setCurrentUser]      = useState<any | null>(null);
  const [userRole,         setUserRole]         = useState<'Admin' | 'Operator'>('Admin');
  const [assignedMachineId,setAssignedMachineId]= useState<string | null>(null);

  const [machines,         setMachines]         = useState<Machine[]>([]);
  const [tickets,          setTickets]          = useState<Ticket[]>([]);
  const [selectedMachineId,setSelectedMachineId]= useState<string>('');
  const [commandLogs,      setCommandLogs]      = useState<C2DCommandLog[]>([]);
  const [toasts,           setToasts]           = useState<ToastMessage[]>([]);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [wsConnected,      setWsConnected]      = useState(false);

  const [isDark,      setIsDark]      = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav,   setActiveNav]   = useState('dashboard');

  const wsRef           = useRef<WebSocket | null>(null);
  // Track which machine IDs already have an open ticket so we don't duplicate
  const ticketedMachines = useRef<Set<string>>(new Set());

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [{ id, type, title, message, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ── Auto-generate tickets from machine state ───────────────────────────────
  const syncTicketsFromMachines = useCallback((currentMachines: Machine[]) => {
    currentMachines.forEach(machine => {
      if (isAnomaly(machine.status) && !ticketedMachines.current.has(machine.id)) {
        ticketedMachines.current.add(machine.id);
        const newTicket = buildTicket(machine);
        setTickets(prev => {
          // Don't add if open ticket for this machine already exists
          const alreadyOpen = prev.some(t => t.machine_id === machine.id && t.status === 'OPEN');
          if (alreadyOpen) return prev;
          return [newTicket, ...prev];
        });
        if (isError(machine.status)) {
          addToast('error', '🚨 Critical Alert!', `${machine.id} is in ${machine.status}. Ticket ${newTicket.ticket_id} created.`);
        } else {
          addToast('warning', '⚠️ Warning Alert', `${machine.id} is in ${machine.status}. Ticket ${newTicket.ticket_id} created.`);
        }
      }
      // If machine recovers, clear it from the set so a new ticket can form if it fails again
      if (!isAnomaly(machine.status)) {
        ticketedMachines.current.delete(machine.id);
      }
    });
  }, [addToast]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleLoginSuccess = (user: any, role: string, machineId?: string) => {
    setCurrentUser(user);
    setUserRole(role as 'Admin' | 'Operator');
    if (machineId) setAssignedMachineId(machineId);
    addToast('success', 'Authentication Successful', `Logged in as ${role}`);
  };

  const handleLogout = () => {
    wsRef.current?.close();
    setCurrentUser(null);
    setAssignedMachineId(null);
    setMachines([]);
    setTickets([]);
    ticketedMachines.current.clear();
    setWsConnected(false);
  };

  // ── REST initial load (best-effort, silent on fail) ────────────────────────
  const fetchInitialData = useCallback(async () => {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}/data`, {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      if (!res.ok) return;
      const raw = await res.json();
      const parsed = raw.body ? JSON.parse(raw.body) : raw;
      const mData: Machine[] = (parsed.machines || []).map((m: any) => ({ ...m, id: m.id || m.MachineID }));
      const tData: Ticket[]  = (parsed.tickets  || []).map((t: any) => ({ ...t }));
      if (mData.length > 0) {
        setMachines(mData);
        setSelectedMachineId(prev => prev || mData[0].id);
        syncTicketsFromMachines(mData);
      }
      if (tData.length > 0) {
        setTickets(prev => {
          const existingIds = new Set(prev.map(t => t.ticket_id));
          const newOnes = tData.filter((t: Ticket) => !existingIds.has(t.ticket_id));
          return [...prev, ...newOnes];
        });
      }
    } catch {
      // Silently ignore — WebSocket data will hydrate the UI
    }
  }, [syncTicketsFromMachines]);

  // ── WebSocket (stable — no dependency on fetchInitialData) ────────────────
  useEffect(() => {
    if (!currentUser) return;

    fetchInitialData();

    if (!WS_URL) return;

    const url = `${WS_URL}?role=${userRole}${assignedMachineId ? `&machine_id=${assignedMachineId}` : ''}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      addToast('success', 'WebSocket Connected', 'Real-time bi-directional telemetry active.');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'TELEMETRY_UPDATE') {
          const d = payload.data;
          const machineId = d.machine_id || d.id;
          if (!machineId) return;

          setMachines(prev => {
            const updated = prev.find(m => m.id === machineId)
              ? prev.map(m => m.id === machineId ? { ...m, ...d, id: machineId, status: d.status || m.status } : m)
              : [...prev, { ...d, id: machineId }];

            // Auto-generate tickets from updated list (next tick)
            setTimeout(() => syncTicketsFromMachines(updated), 0);
            return updated;
          });

          if (!selectedMachineId) setSelectedMachineId(machineId);
        }

        if (payload.type === 'C2D_COMMAND') {
          addToast('warning', 'Admin Command Received!', `EXECUTE: ${payload.command}`);
          if (payload.command === 'STOP') {
            setMachines(prev => prev.map(m =>
              m.id === payload.machine_id ? { ...m, status: 'OFFLINE' as any, power_kw: 0, rpm: 0 } : m
            ));
          }
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      addToast('error', 'WebSocket Disconnected', 'Connection lost to edge network.');
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userRole, assignedMachineId]);

  // ── Resolve ticket ─────────────────────────────────────────────────────────
  const handleResolveTicket = async (ticketId: string) => {
    // Optimistic local update — always works
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: 'RESOLVED' } : t));
    // Find the machine and allow it to re-ticket if it's still broken
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    if (ticket) ticketedMachines.current.delete(ticket.machine_id);
    addToast('success', 'Ticket Resolved', `Ticket ${ticketId} marked as RESOLVED.`);

    // Also try to persist to cloud (fire-and-forget)
    if (API_URL) {
      fetch(`${API_URL}/tickets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, action: 'RESOLVE' }),
      }).catch(() => {});
    }
  };

  // ── Send C2D command ───────────────────────────────────────────────────────
  const handleSendCommand = async (machineId: string, command: 'START' | 'STOP' | 'PUSH_OTA', extraPayload?: any) => {
    setIsSendingCommand(true);
    const startTime = Date.now();
    const payload = { machine_id: machineId, command, ...(extraPayload || {}) };
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      } else if (API_URL) {
        await fetch(`${API_URL}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const latency = Date.now() - startTime;
      const log: C2DCommandLog = {
        id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
        machine_id: machineId, command, payload,
        timestamp: new Date().toLocaleTimeString(),
        status: 'SUCCESS', httpStatus: 200,
      };
      setCommandLogs(prev => [log, ...prev]);
      addToast('success', `C2D Command Sent (${latency}ms)`, `Dispatched '${command}' to ${machineId}.`);
    } catch (err: any) {
      addToast('error', 'C2D Dispatch Failed', err.message);
    } finally {
      setIsSendingCommand(false);
    }
  };

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => fetchInitialData(), [fetchInitialData]);

  // ── Render: Auth ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <AuthScreen onLoginSuccess={handleLoginSuccess} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // ── Render: Operator ───────────────────────────────────────────────────────
  if (userRole === 'Operator') {
    const assignedMachine = machines.find(m => m.id === assignedMachineId) || null;
    return (
      <div className={`h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-4 sm:p-6`}>
        <OperatorDashboard machine={assignedMachine} tickets={tickets} isDark={isDark} onLogout={handleLogout} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // ── Render: Admin ──────────────────────────────────────────────────────────
  const openTickets      = tickets.filter(t => t.status !== 'RESOLVED').length;

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>

      {/* ── Sidebar ── */}
      <aside className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} ${sidebarOpen ? 'w-60' : 'w-16'}`}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">DX</div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Manufacturing DX</p>
              <p className="text-xs text-blue-500">Command Center</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {sidebarOpen && <p className={`text-xs font-semibold uppercase tracking-widest px-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>WORKSPACE</p>}
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                activeNav === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} p-3`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
              <div className="overflow-hidden flex-1">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser.email}</p>
                <p className="text-xs text-slate-500 truncate">Administrator</p>
              </div>
              <button onClick={handleLogout} className="ml-auto flex items-center gap-1 bg-slate-800/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold border border-transparent hover:border-rose-500/20">
                ⇥ Logout
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-slate-500 hover:text-red-400 transition-colors">⇥</button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`flex-shrink-0 flex items-center gap-4 px-4 py-3 border-b ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {NAV_ITEMS.find(n => n.id === activeNav)?.icon} {NAV_ITEMS.find(n => n.id === activeNav)?.label || 'Dashboard'}
            </p>
            <p className="text-xs text-slate-500">Zero-Trust Enterprise Environment</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${wsConnected ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
              {wsConnected ? 'WS CONNECTED' : 'WS OFFLINE'}
            </span>
            <button onClick={() => setIsDark(!isDark)} className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`}>
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
          {/* Overview bar */}
          <div className={`rounded-xl p-5 flex items-center justify-between ${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Admin Operations Overview</h1>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {wsConnected ? 'Live WebSocket Stream Active' : 'WebSocket Offline — Waiting to reconnect'}
              </p>
            </div>
            <div className="hidden sm:flex gap-6">
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{machines.length}</p>
                <p className="text-xs text-slate-500">Live Nodes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{openTickets}</p>
                <p className="text-xs text-slate-500">Open Tickets</p>
              </div>
            </div>
          </div>

          {(activeNav === 'dashboard' || activeNav === 'map') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <LiveFleetMapWidget machines={machines} tickets={tickets} selectedMachineId={selectedMachineId} onSelectMachine={setSelectedMachineId} isDark={isDark} />
            </div>
          )}
          {(activeNav === 'dashboard' || activeNav === 'health') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <SystemHealthWidget machines={machines} tickets={tickets} isDark={isDark} />
            </div>
          )}
          {(activeNav === 'dashboard' || activeNav === 'tickets') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <ActiveTicketsWidget
                tickets={tickets}
                onResolveTicket={handleResolveTicket}
                onRefresh={handleRefresh}
                isLoading={false}
                onSelectMachine={setSelectedMachineId}
                pollSecondsRemaining={0}
                isDark={isDark}
              />
            </div>
          )}
          {(activeNav === 'dashboard' || activeNav === 'c2d') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <C2DCommandPanel machines={machines} selectedMachineId={selectedMachineId} onSelectMachine={setSelectedMachineId} onSendCommand={handleSendCommand} commandLogs={commandLogs} isSending={isSendingCommand} isDark={isDark} />
            </div>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
