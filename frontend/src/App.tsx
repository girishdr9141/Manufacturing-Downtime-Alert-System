import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { LiveFleetMapWidget } from './components/LiveFleetMapWidget';
import { SystemHealthWidget } from './components/SystemHealthWidget';
import { ActiveTicketsWidget } from './components/ActiveTicketsWidget';
import { C2DCommandPanel } from './components/C2DCommandPanel';
import { ToastContainer } from './components/ToastContainer';
import { OperatorDashboard } from './components/OperatorDashboard';
import { FinancialImpactWidget } from './components/FinancialImpactWidget';
import { MachineHistoryModal } from './components/MachineHistoryModal';
import { useI18n } from './i18n';

import { Ticket, Machine, ToastMessage, C2DCommandLog } from './types';

// ─── Environment ─────────────────────────────────────────────────────────────
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const WS_URL  = (import.meta.env.VITE_WS_URL  || '').replace(/\/+$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isAnomaly(status: string): boolean {
  return (
    status.includes('CRITICAL') ||
    status.includes('ERROR') ||
    status.includes('WARNING') ||
    status.includes('PREDICTIVE') ||
    status.includes('MAINTENANCE')
  );
}

function isError(status: string): boolean {
  return status.includes('CRITICAL') || status.includes('ERROR');
}

function makePriority(status: string): 'P1' | 'P2' | 'P3' {
  if (status.includes('CRITICAL') || status.includes('ERROR')) return 'P1';
  if (status.includes('WARNING')) return 'P2';
  return 'P3';
}

function makeDescription(machineId: string, status: string, temp: number, vibration: number): string {
  if (status.includes('OVERHEAT'))     return `CRITICAL OVERHEAT on ${machineId}: Temperature ${temp}°C exceeds 95°C safety threshold. Immediate shutdown required.`;
  if (status.includes('POWER_LOSS'))   return `POWER LOSS on ${machineId}: Machine has lost primary power supply. RPM and output are zero.`;
  if (status.includes('SENSOR'))       return `SENSOR FAILURE on ${machineId}: Vibration sensor reading 0.0 mm/s — hardware sensor unresponsive or disconnected.`;
  if (status.includes('COMM_TIMEOUT')) return `COMMUNICATION TIMEOUT on ${machineId}: Edge node stopped responding to API gateway. Power draw critically low (${temp}°C).`;
  if (status.includes('HIGH_VIB'))     return `HIGH VIBRATION WARNING on ${machineId}: Vibration at ${vibration} mm/s exceeds 8.0 mm/s safety limit. Risk of bearing damage.`;
  if (status.includes('COOLANT'))      return `COOLANT TEMPERATURE WARNING on ${machineId}: Coolant temperature ${temp}°C approaching danger zone. Check coolant pump.`;
  if (status.includes('BEARING'))      return `BEARING WEAR WARNING on ${machineId}: Anomalous vibration (${vibration} mm/s) with sluggish RPM detected. Schedule bearing inspection.`;
  if (status.includes('MAINTENANCE'))  return `PREDICTIVE MAINTENANCE DUE on ${machineId}: Temp ${temp}°C, vibration ${vibration} mm/s trending upward. Maintenance required within 24h.`;
  return `Anomaly detected on ${machineId}: ${status}. Temp: ${temp}°C, Vibration: ${vibration} mm/s.`;
}

function makeRunbook(status: string, temp: number): string {
  if (status.includes('OVERHEAT'))
    return '1. IMMEDIATELY shut down the machine via STOP command.\n2. Check coolant fluid levels and circulation pump.\n3. Replace thermal sensor if readings remain abnormal.\n4. Do NOT restart until temperature drops below 60°C.';
  if (status.includes('POWER_LOSS'))
    return '1. Check main power feed and circuit breakers at panel.\n2. Inspect power supply unit for physical damage.\n3. Test backup UPS connection.\n4. Issue START command once power is restored.';
  if (status.includes('SENSOR'))
    return '1. Inspect vibration sensor cable for loose or broken connections.\n2. Replace sensor module (Part #VBS-440).\n3. Recalibrate sensor array using C2D → Custom Payload: {"action":"calibrate"}.\n4. Verify readings are non-zero before clearing ticket.';
  if (status.includes('COMM_TIMEOUT'))
    return '1. Check network cable or WiFi connection at edge node.\n2. Verify the edge agent process is running on the device.\n3. Reboot edge node remotely via STOP → START commands.\n4. Check firewall rules if issue persists.';
  if (status.includes('HIGH_VIB'))
    return '1. Reduce machine load by 30% immediately.\n2. Inspect rotor balance and coupling alignment.\n3. Check for foreign objects or mechanical obstruction.\n4. Schedule bearing inspection within 4 hours.';
  if (status.includes('COOLANT'))
    return '1. Check coolant pump flow rate — minimum 15 L/min required.\n2. Inspect coolant level in reservoir.\n3. Clean heat exchanger fins if blocked.\n4. Reduce operational speed by 20% until temperature normalises.';
  if (status.includes('BEARING'))
    return '1. Schedule planned downtime within 24 hours for bearing replacement.\n2. Apply emergency lubrication via access port B.\n3. Reduce RPM to below 1200 until maintenance is completed.\n4. Part required: Bearing Kit #BRG-7720.';
  if (status.includes('MAINTENANCE'))
    return '1. Schedule preventive maintenance within 24 hours.\n2. Run full diagnostic via C2D → Custom Payload: {"action":"full_diagnostics"}.\n3. Check lubrication levels on all moving parts.\n4. Document findings in maintenance log.';
  return '1. Inspect machine for visible damage or abnormalities.\n2. Check all sensor connections and power feeds.\n3. Run diagnostic self-test before restart.';
}

/** Auto-generate a local ticket for a machine in anomaly state. */
function buildTicket(machine: Machine): Ticket {
  return {
    ticket_id:   `INC-${machine.id.slice(-3)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    machine_id:  machine.id,
    priority:    makePriority(machine.status) as any,
    status:      'OPEN',
    description: makeDescription(machine.id, machine.status, machine.temperature, machine.vibration),
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
  const [historyModalMachineId, setHistoryModalMachineId] = useState<string | null>(null);
  const [commandLogs,      setCommandLogs]      = useState<C2DCommandLog[]>([]);
  const [toasts,           setToasts]           = useState<ToastMessage[]>([]);
  const [wsConnected,      setWsConnected]      = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  const { t, lang, setLang } = useI18n();

  const [isDark,      setIsDark]      = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav,   setActiveNav]   = useState('dashboard');

  // Auto-close sidebar on mobile load
  useEffect(() => {
    if (window.innerWidth < 640) {
      setSidebarOpen(false);
    }
  }, []);

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
      const tData: Ticket[]  = (parsed.tickets  || []).map((t: any) => ({ ...t, dispatched_expert: t.AssignedTo }));
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
              ? prev.map(m => m.id === machineId ? { 
                  ...m, 
                  ...d, 
                  id: machineId, 
                  status: d.status || m.status,
                  firmware: d.firmware || m.firmware || 'v1.0.0',
                  ip_address: d.ip_address || m.ip_address || '127.0.0.1'
                } : m)
              : [...prev, { 
                  ...d, 
                  id: machineId,
                  firmware: d.firmware || 'v1.0.0',
                  ip_address: d.ip_address || '127.0.0.1'
                }];

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

  // ── Send C2D command ───────────────────────────────────────────────────────
  const handleSendCommand = useCallback(async (machineId: string, command: string, extraPayload?: any) => {
    setIsSendingCommand(true);
    const startTime = Date.now();
    const payload = { machine_id: machineId, command, ...(extraPayload || {}) };
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'C2D_COMMAND', ...payload }));
      } else if (API_URL) {
        await fetch(`${API_URL}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'C2D_COMMAND', ...payload }),
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
      if (command !== 'RESOLVE_ISSUE') {
        addToast('success', `C2D Command Sent (${latency}ms)`, `Dispatched '${command}' to ${machineId}.`);
      }
    } catch (err: any) {
      addToast('error', 'C2D Dispatch Failed', err.message);
    } finally {
      setIsSendingCommand(false);
    }
  }, [addToast]);

  // ── Cross-Tab Notification Listener ────────────────────────────────────────
  // ── Cross-Tab Notification Listener ────────────────────────────────────────
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('mfg_dx_notifications');
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg.type === 'ISSUE_RESOLVED') {
          setTickets(prev => prev.map(t => t.ticket_id === msg.ticketId ? { ...t, status: 'RESOLVED', resolved_at: new Date().toISOString() } : t));
          const ticket = tickets.find(t => t.ticket_id === msg.ticketId);
          if (ticket) {
            ticketedMachines.current.delete(ticket.machine_id);
            
            // Optimistically heal the machine locally so the UI (including ML graphs) drops to 0% instantly
            setMachines(prev => prev.map(m => m.id === ticket.machine_id ? { ...m, status: 'HEALTHY' as any } : m));
            
            handleSendCommand(ticket.machine_id, 'RESOLVE_ISSUE');
          }
          
          if (userRole === 'Admin') {
            addToast('success', '✅ Issue Resolved by Operator', `${msg.expertName} successfully resolved ${msg.ticketId} on ${msg.machineId} at ${msg.resolvedAt}.`);
            // Heal the simulator directly so it doesn't regenerate the ticket!
            handleSendCommand(msg.machineId, 'RESOLVE_ISSUE');
          }
        }
      };
    } catch { /* ignore */ }
    return () => channel?.close();
  }, [userRole, tickets, addToast, handleSendCommand]);

  // ── Resolve ticket ─────────────────────────────────────────────────────────
  const handleResolveTicket = async (ticketId: string, expertName?: string, _notes?: string) => {
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: 'RESOLVED', resolved_at: new Date().toISOString(), resolution_notes: _notes } : t));
    const ticket = tickets.find(t => t.ticket_id === ticketId);
    
    if (ticket) {
      ticketedMachines.current.delete(ticket.machine_id);
      
      // OPTIMISTICALLY HEAL THE MACHINE LOCALLY FOR INSTANT GREEN FEEDBACK!
      setMachines(prev => prev.map(m => 
        m.id === ticket.machine_id 
          ? { ...m, status: 'HEALTHY' as any, temperature: 45, vibration: 2.0, power_kw: 5.0, rpm: 1450 } 
          : m
      ));
      
      // Tell the physical simulator to heal!
      handleSendCommand(ticket.machine_id, 'RESOLVE_ISSUE');
    }

    if (expertName) {
      addToast('success', '👷 Expert Dispatched!', `${expertName} has been notified and dispatched to ${ticket?.machine_id || 'the machine'}.`);
    } else {
      addToast('success', 'Ticket Resolved', `Ticket ${ticketId} marked as RESOLVED.`);
    }

    // Fallback if not provided, just to ensure UI shows varying notes if backend doesn't return immediately
    const resolution_notes_list = [
      "Recalibrated thermal sensors and flushed coolant system.",
      "Replaced worn bearings and verified RPM stability during load test.",
      "Cleared hardware fault cache and restarted edge telemetry agent.",
      "Tightened mechanical couplings and verified vibration limits.",
      "Performed emergency OTA firmware rollback to stable version.",
      "Inspected power feed, replaced blown fuse, and restored full power."
    ];
    const final_note = _notes || resolution_notes_list[Math.floor(Math.random() * resolution_notes_list.length)];
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: 'RESOLVED', resolved_at: new Date().toISOString(), resolution_notes: final_note } : t));

    if (API_URL) {
      fetch(`${API_URL}/tickets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, action: 'RESOLVE', assigned_to: expertName, notes: final_note }),
      }).catch(() => {});
    }
  };

  const handleClearHistory = async (machineId: string) => {
    // Optimistically remove RESOLVED tickets from UI
    setTickets(prev => prev.filter(t => !(t.machine_id === machineId && t.status === 'RESOLVED')));
    addToast('success', 'History Cleared', `Database records for ${machineId} have been deleted.`);
    setHistoryModalMachineId(null);
    
    if (API_URL) {
      fetch(`${API_URL}/history?machine_id=${machineId}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  };

  const handleDispatchExpert = (ticketId: string, expertName: string) => {
    addToast('success', '👷 Expert Dispatched!', `${expertName} has been dispatched. Waiting for resolution...`);
    setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, dispatched_expert: expertName } : t));
    if (API_URL) {
      fetch(`${API_URL}/tickets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, action: 'ASSIGN', assigned_to: expertName }),
      }).catch(() => {});
    }
  };



  // ── Manual refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => fetchInitialData(), [fetchInitialData]);

  // ── Render: Auth ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div key="auth-view" className="w-full h-screen">
        <AuthScreen onLoginSuccess={handleLoginSuccess} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // ── Render: Operator ───────────────────────────────────────────────────────
  if (userRole === 'Operator') {
    const assignedMachine = machines.find(m => m.id === assignedMachineId) || null;
    return (
      <div key="operator-view" className={`min-h-screen overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-4 sm:p-6 transition-colors duration-500`}>
        <OperatorDashboard 
          machine={assignedMachine} 
          tickets={tickets} 
          isDark={isDark} 
          onLogout={handleLogout} 
          currentUser={currentUser}
          onToggleTheme={() => setIsDark(!isDark)}
          onViewHistory={setHistoryModalMachineId}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // ── Render: Admin ──────────────────────────────────────────────────────────
  const openTickets      = tickets.filter(t => t.status !== 'RESOLVED').length;

  return (
    <div key="admin-view" className={`h-screen flex overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="sm:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`absolute z-40 h-full sm:relative flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} ${sidebarOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full sm:w-16 sm:translate-x-0'}`}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">DX</div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('loginTitle')}</p>
              <p className="text-xs text-blue-500">{t('commandCenter')}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {sidebarOpen && <p className={`text-xs font-semibold uppercase tracking-widest px-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>WORKSPACE</p>}
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                if (window.innerWidth < 640) setSidebarOpen(false);
              }}
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
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(currentUser.name || currentUser.email || 'A')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currentUser.name || currentUser.email}</p>
                <p className="text-xs text-slate-500 truncate">{t('adminRole')}</p>
              </div>
              <button onClick={handleLogout} className={`ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold border ${isDark ? 'bg-slate-800/50 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-transparent hover:border-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'}`}>
                ⇥ {t('logout')}
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
              {NAV_ITEMS.find(n => n.id === activeNav)?.icon} {t(NAV_ITEMS.find(n => n.id === activeNav)?.id as any) || t('dashboard')}
            </p>
            <p className="text-xs text-slate-500">{t('zeroTrust')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button onClick={() => setLang(lang === 'en' ? 'ja' : 'en')} className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'}`}>
              {lang === 'en' ? 'EN' : 'JA'}
            </button>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${wsConnected ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
              {wsConnected ? t('wsConnected') : t('wsOffline')}
            </span>
            <button onClick={() => setIsDark(!isDark)} className={`hidden sm:flex relative w-12 h-6 rounded-full transition-colors duration-300 items-center ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}>
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
              <h1 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('adminOverview')}</h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {wsConnected ? t('wsConnected') : t('wsOffline')}
              </p>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{machines.length}</p>
                <p className="text-xs text-slate-500">{t('liveNodes')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{openTickets}</p>
                <p className="text-xs text-slate-500">{t('openTickets')}</p>
              </div>
            </div>
          </div>

          {(activeNav === 'dashboard' || activeNav === 'tickets') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800/80 bg-slate-900/50' : 'border-slate-200 bg-white shadow-sm'}`}>
              <FinancialImpactWidget tickets={tickets} isDark={isDark} />
            </div>
          )}

          {(activeNav === 'dashboard' || activeNav === 'map') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <LiveFleetMapWidget 
                machines={machines} 
                tickets={tickets} 
                selectedMachineId={selectedMachineId} 
                onSelectMachine={setSelectedMachineId} 
                onViewHistory={setHistoryModalMachineId}
                isDark={isDark} 
              />
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
                onDispatchExpert={handleDispatchExpert}
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
      {historyModalMachineId && (
        <MachineHistoryModal
          machineId={historyModalMachineId}
          tickets={tickets}
          onClose={() => setHistoryModalMachineId(null)}
          onClearHistory={handleClearHistory}
          isDark={isDark}
        />
      )}
    </div>
  );
}
