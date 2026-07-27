import React, { useState } from 'react';
import { Ticket, TicketPriority } from '../types';
import {
  AlertTriangle, CheckCircle2, Bot, ChevronDown, ChevronUp,
  Clock, Cpu, Copy, Check, RefreshCw, Search, Sparkles,
  UserCheck, X, Send, Wrench
} from 'lucide-react';

interface ActiveTicketsWidgetProps {
  tickets: Ticket[];
  onResolveTicket: (ticketId: string, expertName?: string, notes?: string) => Promise<void>;
  onDispatchExpert?: (ticketId: string, expertName: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onSelectMachine: (machineId: string) => void;
  pollSecondsRemaining: number;
  isDark?: boolean;
}

const REPAIR_EXPERTS = [
  { name: 'Rajesh Kumar',    role: 'Senior Mechanical Engineer',  avatar: 'RK', specialty: 'Thermal & Cooling Systems' },
  { name: 'Priya Sharma',    role: 'Electrical Systems Lead',     avatar: 'PS', specialty: 'Power Supply & Circuits' },
  { name: 'Anil Verma',      role: 'Sensor Calibration Expert',   avatar: 'AV', specialty: 'IoT Sensors & Firmware' },
  { name: 'Deepa Nair',      role: 'Predictive Maintenance Eng.', avatar: 'DN', specialty: 'Bearing & Vibration Analysis' },
  { name: 'Suresh Pillai',   role: 'Network & Comms Specialist',  avatar: 'SP', specialty: 'Edge Connectivity & MQTT' },
  { name: 'Meera Iyer',      role: 'Field Service Technician',    avatar: 'MI', specialty: 'General Hardware Repair' },
];

export const ActiveTicketsWidget: React.FC<ActiveTicketsWidgetProps> = ({
  tickets, onResolveTicket, onDispatchExpert, onRefresh, isLoading, onSelectMachine, pollSecondsRemaining, isDark = true,
}) => {
  const [expandedTicketId, setExpandedTicketId]   = useState<string | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter]       = useState<string>('ALL');
  const [searchQuery, setSearchQuery]             = useState<string>('');
  const [copiedCode, setCopiedCode]               = useState<string | null>(null);

  // Expert allocation modal state
  const [allocationModal, setAllocationModal] = useState<{ ticketId: string; machineId: string } | null>(null);
  const [selectedExpert, setSelectedExpert]   = useState<string>('');
  const [repairNotes, setRepairNotes]         = useState<string>('');
  const [dispatched, setDispatched]           = useState<string | null>(null);

  const openTickets     = tickets.filter(t => t.status === 'OPEN');
  const filteredTickets = openTickets.filter(t => {
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter ||
      (priorityFilter === 'P1' && t.priority === 'CRITICAL');
    const matchesSearch = t.machine_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const openAllocationModal = (ticketId: string, machineId: string) => {
    setAllocationModal({ ticketId, machineId });
    setSelectedExpert('');
    setRepairNotes('');
    setDispatched(null);
  };

  const handleDispatch = async () => {
    if (!selectedExpert || !allocationModal) return;
    const expert = REPAIR_EXPERTS.find(e => e.name === selectedExpert);
    setDispatched(selectedExpert);

    const ticket = tickets.find(t => t.ticket_id === allocationModal.ticketId);
    if (ticket && expert) {
      try {
        const channel = new BroadcastChannel('mfg_dx_notifications');
        channel.postMessage({
          type: 'EXPERT_DISPATCHED',
          ticketId: ticket.ticket_id,
          machineId: ticket.machine_id,
          expertName: expert.name,
          expertRole: expert.role,
          notes: repairNotes,
          runbook: ticket.ai_runbook,
          description: ticket.description,
          priority: ticket.priority,
          dispatchedAt: new Date().toLocaleTimeString(),
        });
        channel.close();
      } catch (e) {}
    }

    if (onDispatchExpert) onDispatchExpert(allocationModal.ticketId, selectedExpert);

    setTimeout(() => {
      setAllocationModal(null);
    }, 1800);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Theme helpers
  const card          = isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200 shadow-md';
  const headerBorder  = isDark ? 'border-slate-800' : 'border-slate-200';
  const headerTitle   = isDark ? 'text-white' : 'text-slate-900';
  const subText       = isDark ? 'text-slate-400' : 'text-slate-500';
  const countBadge    = isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300';
  const refreshBtn    = isDark ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600';
  const searchInput   = isDark ? 'bg-slate-950/80 border-slate-800 focus:border-cyan-500/80 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400';
  const filterActive  = isDark ? 'bg-cyan-950 border-cyan-500/80 text-cyan-300' : 'bg-cyan-50 border-cyan-400 text-cyan-700';
  const filterInactive = isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-500';
  const ticketCard    = isDark ? 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700/80' : 'bg-slate-50 border-slate-200 hover:border-slate-300';
  const ticketIdCls   = isDark ? 'text-slate-400' : 'text-slate-500';
  const machineBtn    = isDark ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-300';
  const descCls       = isDark ? 'text-slate-200' : 'text-slate-700';
  const divider       = isDark ? 'border-slate-900' : 'border-slate-200';
  const runbookToggle = isDark ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/50 border-indigo-500/20' : 'text-indigo-600 bg-indigo-50 border-indigo-200';
  const runbookBg     = isDark ? 'bg-slate-900 border-indigo-500/30 text-slate-300' : 'bg-indigo-50 border-indigo-200 text-slate-700';
  const runbookInner  = isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
  const runbookHeader = isDark ? 'text-indigo-300 border-slate-800' : 'text-indigo-600 border-indigo-200';
  const emptyBorder   = isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-slate-50';
  const emptyText     = isDark ? 'text-slate-200' : 'text-slate-700';

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'P1': case 'CRITICAL':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-[0_0_10px_rgba(244,63,94,0.3)] ${isDark ? 'bg-rose-950/90 text-rose-300 border-rose-500/50' : 'bg-rose-100 text-rose-700 border-rose-300'}`}>CRITICAL P1</span>;
      case 'P2': case 'HIGH':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${isDark ? 'bg-orange-950/90 text-orange-300 border-orange-500/50' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>HIGH P2</span>;
      case 'P3': case 'MEDIUM':
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${isDark ? 'bg-amber-950/90 text-amber-300 border-amber-500/50' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>MEDIUM P3</span>;
      default:
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${isDark ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50' : 'bg-cyan-100 text-cyan-700 border-cyan-300'}`}>LOW P4</span>;
    }
  };

  return (
    <>
      {/* ── Expert Allocation Modal ── */}
      {allocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl font-sans ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isDark ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-600'}`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Allocate Repair Expert</h3>
                  <p className={`text-[11px] font-mono ${subText}`}>{allocationModal.machineId} · {allocationModal.ticketId}</p>
                </div>
              </div>
              <button onClick={() => setAllocationModal(null)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {dispatched ? (
              /* Dispatched confirmation */
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
                </div>
                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Expert Dispatched!</p>
                <p className={`text-sm ${subText}`}>
                  <span className="text-emerald-400 font-semibold">{dispatched}</span> has been notified and is en route to <span className="text-cyan-400 font-semibold">{allocationModal.machineId}</span>.
                </p>
                <p className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Awaiting operator confirmation of resolution...</p>
              </div>
            ) : (
              /* Expert selection form */
              <div className="p-5 space-y-4">
                <p className={`text-xs ${subText}`}>Select an available expert to dispatch to the machine floor. They will receive a push notification with the AI runbook and machine location.</p>

                {/* Expert cards */}
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {REPAIR_EXPERTS.map(expert => (
                    <button
                      key={expert.name}
                      onClick={() => setSelectedExpert(expert.name)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 ${
                        selectedExpert === expert.name
                          ? isDark ? 'bg-emerald-950/50 border-emerald-500/60 ring-1 ring-emerald-500/30' : 'bg-emerald-50 border-emerald-400'
                          : isDark ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        selectedExpert === expert.name ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {expert.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{expert.name}</p>
                        <p className={`text-[10px] truncate ${subText}`}>{expert.role}</p>
                        <p className={`text-[10px] font-mono truncate ${isDark ? 'text-cyan-500/80' : 'text-cyan-600'}`}>{expert.specialty}</p>
                      </div>
                      {selectedExpert === expert.name && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-[11px] font-mono uppercase mb-1 ${subText}`}>Dispatch Notes (optional)</label>
                  <textarea
                    value={repairNotes}
                    onChange={e => setRepairNotes(e.target.value)}
                    placeholder="e.g. Bring bearing kit BRG-7720, access via Gate B..."
                    rows={2}
                    className={`w-full border rounded-xl p-2.5 text-xs outline-none transition-colors resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600 focus:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-cyan-400'}`}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setAllocationModal(null)} className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                    Cancel
                  </button>
                  <button
                    onClick={handleDispatch}
                    disabled={!selectedExpert}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Expert & Resolve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Widget ── */}
      <div className={`border rounded-2xl p-5 flex flex-col h-full min-h-[460px] transition-colors duration-300 ${card}`}>

        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-3 ${headerBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isDark ? 'bg-amber-950/80 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-600'}`}>
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-semibold tracking-tight ${headerTitle}`}>Active Operational Tickets</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${countBadge}`}>{openTickets.length} OPEN</span>
              </div>
              <p className={`text-[11px] font-mono ${subText}`}>Real-time edge alert queue</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <span className={`text-[10px] block ${subText}`}>AUTO-POLL</span>
              <span className="text-xs text-cyan-500 font-bold">{pollSecondsRemaining}s</span>
            </div>
            <button onClick={onRefresh} disabled={isLoading} className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${refreshBtn}`} title="Force refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
          <div className="relative w-full sm:flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tickets, machine ID, or symptoms..."
              className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono outline-none transition-all ${searchInput}`} />
          </div>
          <div className="flex items-center gap-1 w-full sm:w-auto font-mono text-[11px]">
            {['ALL', 'P1', 'P2', 'P3'].map(p => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg transition-all border cursor-pointer ${priorityFilter === p ? filterActive : filterInactive}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[480px]">
          {filteredTickets.length === 0 ? (
            <div className={`py-12 text-center border border-dashed rounded-xl p-6 ${emptyBorder}`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <h4 className={`text-sm font-semibold ${emptyText}`}>No Open Tickets Found</h4>
              <p className={`text-xs mt-1 ${subText}`}>All edge nodes are operating within healthy thresholds.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isExpanded  = expandedTicketId === ticket.ticket_id;
              const isResolving = resolvingTicketId === ticket.ticket_id;
              return (
                <div key={ticket.ticket_id} className={`border rounded-xl p-4 transition-all duration-200 shadow-sm ${ticketCard}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-xs font-bold ${ticketIdCls}`}>{ticket.ticket_id}</span>
                      {getPriorityBadge(ticket.priority)}
                      <button onClick={() => onSelectMachine(ticket.machine_id)}
                        className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors flex items-center gap-1 cursor-pointer ${machineBtn}`}>
                        <Cpu className="w-3 h-3" /> {ticket.machine_id}
                      </button>
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] font-mono ${subText}`}>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed font-sans mb-3 ${descCls}`}>{ticket.description}</p>

                  <div className={`mt-2 pt-2 border-t ${divider}`}>
                    <button onClick={() => setExpandedTicketId(isExpanded ? null : ticket.ticket_id)}
                      className={`w-full flex items-center justify-between text-xs font-mono border rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${runbookToggle}`}>
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Runbook Diagnostic</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className={`mt-2 p-3.5 border rounded-xl text-xs font-mono space-y-2 ${runbookBg}`}>
                        <div className={`flex items-center justify-between text-[11px] font-semibold border-b pb-1.5 mb-2 ${runbookHeader}`}>
                          <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Recommended Remediation Plan</span>
                          <button onClick={() => handleCopy(ticket.ai_runbook, ticket.ticket_id)} className={`transition-colors p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                            {copiedCode === ticket.ticket_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className={`whitespace-pre-wrap leading-relaxed text-[11px] p-2.5 rounded-lg border ${runbookInner}`}>{ticket.ai_runbook}</div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openAllocationModal(ticket.ticket_id, ticket.machine_id)}
                      className={`font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${isDark ? 'bg-blue-950/60 hover:bg-blue-900 border-blue-500/40 text-blue-300 hover:text-white' : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700'}`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Allocate Expert</span>
                    </button>
                    <button
                      onClick={async () => {
                        setResolvingTicketId(ticket.ticket_id);
                        try { await onResolveTicket(ticket.ticket_id); } finally { setResolvingTicketId(null); }
                      }}
                      disabled={isResolving}
                      className={`font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border ${isDark ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 hover:text-white' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-700'}`}
                    >
                      {isResolving ? <div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Resolve</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
