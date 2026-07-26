import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { LiveFleetMapWidget } from './components/LiveFleetMapWidget';
import { SystemHealthWidget } from './components/SystemHealthWidget';
import { ActiveTicketsWidget } from './components/ActiveTicketsWidget';
import { C2DCommandPanel } from './components/C2DCommandPanel';
import { ToastContainer } from './components/ToastContainer';

import { Ticket, Machine, ToastMessage, C2DCommandLog } from './types';
import { INITIAL_MACHINES, INITIAL_TICKETS } from './mockData';
import { fetchAPI, isDemoUrl } from './api';

const LOCAL_STORAGE_KEY = 'dx_command_center_api_url';
const POLL_INTERVAL_SECONDS = 30;

// --- Sidebar Navigation Items ---
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: '⊞' },
  { id: 'map',        label: 'Live Factory Map',   icon: '📍' },
  { id: 'tickets',    label: 'IT Tickets',         icon: '🎫' },
  { id: 'c2d',        label: 'C2D Control',        icon: '⚡' },
  { id: 'health',     label: 'System Health',      icon: '📊' },
];

export default function App() {
  // Always start at the auth screen — no auto-login from localStorage
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [commandLogs, setCommandLogs] = useState<C2DCommandLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFetchingTickets, setIsFetchingTickets] = useState<boolean>(false);
  const [isSendingCommand, setIsSendingCommand] = useState<boolean>(false);
  const [pollSecondsRemaining, setPollSecondsRemaining] = useState<number>(POLL_INTERVAL_SECONDS);

  // UI State
  const [isDark, setIsDark] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeNav, setActiveNav] = useState<string>('dashboard');

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type, title, message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSaveUrl = (url: string) => {
    // Session-only: do not persist to localStorage so auth screen shows on next visit
    setApiUrl(url);
    addToast('success', 'Zero-Trust Gateway Connected', `Endpoint: ${url}`);
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setApiUrl(null);
    addToast('info', 'Session Ended', 'Please re-enter your API Gateway URL to reconnect.');
  };

  const fetchDashboardData = useCallback(async () => {
    if (!apiUrl) return;
    setIsFetchingTickets(true);
    try {
      // Fetch Tickets
      const ticketRes = await fetchAPI<any>(apiUrl, '/tickets', { method: 'GET' });
      let tData = ticketRes.data;
      if (tData && typeof tData === 'object' && 'tickets' in tData) tData = tData.tickets;
      if (Array.isArray(tData)) {
        const formattedTickets: Ticket[] = tData.map((item: any, idx: number) => ({
          ticket_id: item.ticket_id || item.id || `TCK-${8000 + idx}`,
          machine_id: item.machine_id || item.machineId || item.MachineID || 'UNKNOWN',
          priority: item.priority || item.Priority || 'P2',
          description: item.description || item.Description || item.desc || 'Edge anomaly detected.',
          ai_runbook: item.ai_runbook || item.AIRunbook || item.runbook || '1. Inspect node telemetry.',
          status: item.status || item.Status || 'OPEN',
          created_at: item.created_at || item.CreatedAt || item.createdAt || new Date().toISOString(),
          telemetry_snapshot: item.telemetry_snapshot,
        }));
        setTickets(formattedTickets);
      }

      // Fetch Machines
      const machineRes = await fetchAPI<any>(apiUrl, '/machines', { method: 'GET' });
      let mData = machineRes.data;
      if (mData && typeof mData === 'object' && 'machines' in mData) mData = mData.machines;
      if (Array.isArray(mData) && mData.length > 0) {
        setMachines(mData);
        // Default select the first machine if none selected
        setSelectedMachineId((prev) => prev || mData[0].id);
      }

      setPollSecondsRemaining(POLL_INTERVAL_SECONDS);
    } catch (err: any) {
      addToast('error', 'Dashboard Sync Error', `Failed to reach API: ${err.message || 'Network error'}`);
    } finally {
      setIsFetchingTickets(false);
    }
  }, [apiUrl, addToast]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchDashboardData();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    pollTimerRef.current = setInterval(fetchDashboardData, POLL_INTERVAL_SECONDS * 1000);
    countdownTimerRef.current = setInterval(() => {
      setPollSecondsRemaining((prev) => (prev <= 1 ? POLL_INTERVAL_SECONDS : prev - 1));
    }, 1000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [apiUrl, fetchDashboardData]);

  const handleResolveTicket = async (ticketId: string) => {
    if (!apiUrl) return;
    try {
      await fetchAPI(apiUrl, '/tickets', { method: 'PUT', body: JSON.stringify({ ticket_id: ticketId, action: 'RESOLVE' }) });
      addToast('success', 'Ticket Resolved', `Ticket ${ticketId} marked RESOLVED.`);
      setTickets((prev) => prev.map((t) => (t.ticket_id === ticketId ? { ...t, status: 'RESOLVED' } : t)));
      await fetchDashboardData();
    } catch (err: any) {
      addToast('error', 'Resolve Ticket Failed', err.message || 'Error executing PUT /tickets');
    }
  };

  const handleSendCommand = async (machineId: string, command: 'START' | 'STOP' | 'PUSH_OTA', extraPayload?: any) => {
    if (!apiUrl) return;
    setIsSendingCommand(true);
    const startTime = Date.now();
    try {
      const payload = { machine_id: machineId, command, ...(extraPayload || {}) };
      const response = await fetchAPI(apiUrl, '/commands', { method: 'POST', body: JSON.stringify(payload) });
      const latency = Date.now() - startTime;
      const newLog: C2DCommandLog = {
        id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
        machine_id: machineId, command, payload,
        timestamp: new Date().toLocaleTimeString(),
        status: 'SUCCESS',
        httpStatus: response.rawStatus || 200,
        responseData: response.data,
      };
      setCommandLogs((prev) => [newLog, ...prev]);
      addToast('success', `C2D Command Dispatched (${latency}ms)`, `Sent '${command}' to ${machineId}.`);
      if (command === 'STOP' || command === 'START') {
        setMachines((prev) => prev.map((m) => (m.id === machineId ? { ...m, status: 'HEALTHY', temperature: command === 'STOP' ? 45.0 : m.temperature } : m)));
      }
    } catch (err: any) {
      addToast('error', 'C2D Dispatch Failed', err.message || 'Error executing POST /commands');
    } finally {
      setIsSendingCommand(false);
    }
  };

  if (!apiUrl) {
    return (
      <>
        <AuthScreen onSaveUrl={handleSaveUrl} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isDemo = isDemoUrl(apiUrl);
  const openTickets = tickets.filter(t => t.status !== 'RESOLVED').length;
  const criticalMachines = machines.filter(m => m.status === 'ERROR').length;

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`
          flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
          ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}
          border-r
          ${sidebarOpen ? 'w-60' : 'w-16'}
        `}
      >
        {/* Sidebar Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            DX
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Manufacturing DX</p>
              <p className="text-xs text-blue-500">Command Center</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {sidebarOpen && (
            <p className={`text-xs font-semibold uppercase tracking-widest px-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              WORKSPACE
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
                ${activeNav === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && item.id === 'tickets' && openTickets > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {openTickets}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Info at Bottom */}
        <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} p-3`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                G
              </div>
              <div className="overflow-hidden">
                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Girish D R</p>
                <p className="text-xs text-slate-500 truncate">Admin</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="ml-auto text-slate-500 hover:text-red-400 transition-colors text-xs"
              >
                ⇥
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex justify-center text-slate-500 hover:text-red-400 transition-colors"
            >
              ⇥
            </button>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ===== TOP NAV BAR ===== */}
        <header className={`flex-shrink-0 flex items-center gap-4 px-4 py-3 border-b ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          {/* Hamburger to toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page Title */}
          <div>
            <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {NAV_ITEMS.find(n => n.id === activeNav)?.icon} {NAV_ITEMS.find(n => n.id === activeNav)?.label || 'Dashboard'}
            </p>
            <p className="text-xs text-slate-500">Zero-Trust Enterprise Environment</p>
          </div>

          {/* Stats Pills */}
          <div className="ml-4 hidden sm:flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              🎫 {openTickets} Open
            </span>
            {criticalMachines > 0 && (
              <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-500/20 text-red-400">
                ⚠️ {criticalMachines} Critical
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Dark / Light Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span
                className={`absolute w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`}
              >
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>

            {/* Export CSV */}
            <button
              onClick={() => window.open(`${apiUrl}/export`, '_blank')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              📥 Export CSV
            </button>

            {/* Refresh + poll indicator */}
            <button
              onClick={fetchDashboardData}
              disabled={isFetchingTickets}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <span className={isFetchingTickets ? 'animate-spin' : ''}>↻</span>
              <span className="hidden sm:inline">{isFetchingTickets ? 'Syncing...' : `${pollSecondsRemaining}s`}</span>
            </button>

            {isDemo && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                DEMO
              </span>
            )}
          </div>
        </header>

        {/* ===== SCROLLABLE MAIN CONTENT ===== */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>

          {/* Welcome Banner */}
          <div className={`rounded-xl p-5 flex items-center justify-between ${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Welcome back, Girish 👋
              </h1>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Here's your factory floor overview
              </p>
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{machines.length}</p>
                <p className="text-xs text-slate-500">Machines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{openTickets}</p>
                <p className="text-xs text-slate-500">Open Tickets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{machines.filter(m => m.status === 'HEALTHY').length}</p>
                <p className="text-xs text-slate-500">Healthy</p>
              </div>
            </div>
          </div>

          {/* Show all panels on Dashboard; filter by activeNav on specific sections */}
          {(activeNav === 'dashboard' || activeNav === 'map') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <LiveFleetMapWidget
                machines={machines}
                tickets={tickets}
                selectedMachineId={selectedMachineId}
                onSelectMachine={(id) => setSelectedMachineId(id)}
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
                onRefresh={fetchDashboardData}
                isLoading={isFetchingTickets}
                onSelectMachine={(id) => setSelectedMachineId(id)}
                pollSecondsRemaining={pollSecondsRemaining}
                isDark={isDark}
              />
            </div>
          )}

          {(activeNav === 'dashboard' || activeNav === 'c2d') && (
            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <C2DCommandPanel
                machines={machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={(id) => setSelectedMachineId(id)}
                onSendCommand={handleSendCommand}
                commandLogs={commandLogs}
                isSending={isSendingCommand}
                isDark={isDark}
              />
            </div>
          )}

          {/* Footer */}
          <p className={`text-center text-xs pb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Enterprise DX Command Center • Zero-Trust Edge Mesh • AWS Serverless
          </p>

        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
