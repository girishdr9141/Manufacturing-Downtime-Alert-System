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

export default function App() {
  // Global State for API URL
  const [apiUrl, setApiUrl] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || null;
  });

  // State
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('PLASMA-GEN-001');
  const [commandLogs, setCommandLogs] = useState<C2DCommandLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFetchingTickets, setIsFetchingTickets] = useState<boolean>(false);
  const [isSendingCommand, setIsSendingCommand] = useState<boolean>(false);
  const [pollSecondsRemaining, setPollSecondsRemaining] = useState<number>(POLL_INTERVAL_SECONDS);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper Toast Dispatcher
  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handler to set and save API URL
  const handleSaveUrl = (url: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, url);
    setApiUrl(url);
    addToast('success', 'Zero-Trust Gateway Connected', `Target endpoint set to: ${url}`);
  };

  // Handler to logout / clear API URL
  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setApiUrl(null);
    addToast('info', 'Gateway Disconnected', 'Cleared stored AWS API Gateway URL.');
  };

  // Fetch Tickets logic from GET {apiUrl}/tickets
  const fetchTickets = useCallback(async () => {
    if (!apiUrl) return;

    setIsFetchingTickets(true);
    try {
      const response = await fetchAPI<any>(apiUrl, '/tickets', { method: 'GET' });
      let data = response.data;

      // Ensure data is array or object with tickets array
      if (data && typeof data === 'object' && 'tickets' in data) {
        data = data.tickets;
      }

      if (Array.isArray(data)) {
        // Map raw items if needed
        const formattedTickets: Ticket[] = data.map((item: any, idx: number) => ({
          ticket_id: item.ticket_id || item.id || `TCK-${8000 + idx}`,
          machine_id: item.machine_id || item.machineId || 'PLASMA-GEN-001',
          priority: item.priority || 'P2',
          description: item.description || item.desc || 'Edge anomaly detected.',
          ai_runbook: item.ai_runbook || item.AIRunbook || item.runbook || '1. Inspect node telemetry.\n2. Execute reset if required.',
          status: item.status || 'OPEN',
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          telemetry_snapshot: item.telemetry_snapshot,
        }));

        setTickets(formattedTickets);
      } else {
        // If mock fallback returned or unusual format
        setTickets((prev) => (prev.length ? prev : INITIAL_TICKETS));
      }
      
      // Reset poll timer
      setPollSecondsRemaining(POLL_INTERVAL_SECONDS);
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
      addToast(
        'error',
        'Ticket Queue Error',
        `Failed to reach GET ${apiUrl}/tickets: ${err.message || 'Network error'}`
      );
      // Fall back to current/initial tickets so UI stays functional
      setTickets((prev) => (prev.length ? prev : INITIAL_TICKETS));
    } finally {
      setIsFetchingTickets(false);
    }
  }, [apiUrl, addToast]);

  // Polling Effect
  useEffect(() => {
    if (!apiUrl) return;

    // Fetch immediately on load
    fetchTickets();

    // Reset timer interval
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    pollTimerRef.current = setInterval(() => {
      fetchTickets();
    }, POLL_INTERVAL_SECONDS * 1000);

    countdownTimerRef.current = setInterval(() => {
      setPollSecondsRemaining((prev) => (prev <= 1 ? POLL_INTERVAL_SECONDS : prev - 1));
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [apiUrl, fetchTickets]);

  // Handle Resolving a Ticket via PUT {apiUrl}/tickets
  const handleResolveTicket = async (ticketId: string) => {
    if (!apiUrl) return;

    try {
      const response = await fetchAPI(apiUrl, '/tickets', {
        method: 'PUT',
        body: JSON.stringify({
          ticket_id: ticketId,
          action: 'RESOLVE',
        }),
      });

      addToast('success', 'Ticket Resolved', `Ticket ${ticketId} status updated to RESOLVED.`);
      
      // Optimistically update ticket local state
      setTickets((prev) =>
        prev.map((t) => (t.ticket_id === ticketId ? { ...t, status: 'RESOLVED' } : t))
      );

      // Refetch tickets
      await fetchTickets();
    } catch (err: any) {
      addToast('error', 'Resolve Ticket Failed', err.message || 'Error executing PUT /tickets');
    }
  };

  // Handle Sending C2D Command via POST {apiUrl}/commands
  const handleSendCommand = async (
    machineId: string,
    command: 'START' | 'STOP' | 'PUSH_OTA',
    extraPayload?: any
  ) => {
    if (!apiUrl) return;

    setIsSendingCommand(true);
    const startTime = Date.now();

    try {
      const payload = {
        machine_id: machineId,
        command: command,
        ...(extraPayload || {}),
      };

      const response = await fetchAPI(apiUrl, '/commands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const latency = Date.now() - startTime;

      // Add to command execution terminal log
      const newLog: C2DCommandLog = {
        id: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
        machine_id: machineId,
        command,
        payload,
        timestamp: new Date().toLocaleTimeString(),
        status: 'SUCCESS',
        httpStatus: response.rawStatus || 200,
        responseData: response.data,
      };

      setCommandLogs((prev) => [newLog, ...prev]);

      addToast(
        'success',
        `C2D Command Dispatched (${latency}ms)`,
        `Sent '${command}' to ${machineId}. Endpoint returned HTTP 200 OK.`
      );

      // Simulate status change on machines if STOP or START
      if (command === 'STOP') {
        setMachines((prev) =>
          prev.map((m) => (m.id === machineId ? { ...m, status: 'HEALTHY', temperature: 45.0 } : m))
        );
      } else if (command === 'START') {
        setMachines((prev) =>
          prev.map((m) => (m.id === machineId ? { ...m, status: 'HEALTHY' } : m))
        );
      }
    } catch (err: any) {
      addToast('error', 'C2D Dispatch Failed', err.message || 'Error executing POST /commands');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // If apiUrl is null, show Authentication Screen
  if (!apiUrl) {
    return (
      <>
        <AuthScreen onSaveUrl={handleSaveUrl} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isDemo = isDemoUrl(apiUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header Navigation */}
      <Header
        apiUrl={apiUrl}
        onLogout={handleLogout}
        onRefreshTickets={fetchTickets}
        isRefreshing={isFetchingTickets}
        isDemo={isDemo}
      />

      {/* Main Command Center Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Bento Grid Top Section: Live Fleet Map (2 cols) & System Health Donut (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveFleetMapWidget
              machines={machines}
              tickets={tickets}
              selectedMachineId={selectedMachineId}
              onSelectMachine={(id) => setSelectedMachineId(id)}
            />
          </div>

          <div className="lg:col-span-1">
            <SystemHealthWidget machines={machines} tickets={tickets} />
          </div>
        </div>

        {/* Bento Grid Bottom Section: Active Operational Tickets (2 cols) & C2D Command Panel (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActiveTicketsWidget
              tickets={tickets}
              onResolveTicket={handleResolveTicket}
              onRefresh={fetchTickets}
              isLoading={isFetchingTickets}
              onSelectMachine={(id) => setSelectedMachineId(id)}
              pollSecondsRemaining={pollSecondsRemaining}
            />
          </div>

          <div className="lg:col-span-1">
            <C2DCommandPanel
              machines={machines}
              selectedMachineId={selectedMachineId}
              onSelectMachine={(id) => setSelectedMachineId(id)}
              onSendCommand={handleSendCommand}
              commandLogs={commandLogs}
              isSending={isSendingCommand}
            />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs font-mono text-slate-500">
        Enterprise DX Command Center &bull; Zero-Trust Edge Mesh Orchestration &bull; AWS API Gateway Integrated
      </footer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
