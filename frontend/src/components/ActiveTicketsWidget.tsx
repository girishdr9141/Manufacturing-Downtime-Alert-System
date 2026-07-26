import React, { useState } from 'react';
import { Ticket, TicketPriority } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Cpu, 
  Filter, 
  Copy, 
  Check, 
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';

interface ActiveTicketsWidgetProps {
  tickets: Ticket[];
  onResolveTicket: (ticketId: string) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
  onSelectMachine: (machineId: string) => void;
  pollSecondsRemaining: number;
}

export const ActiveTicketsWidget: React.FC<ActiveTicketsWidgetProps> = ({
  tickets,
  onResolveTicket,
  onRefresh,
  isLoading,
  onSelectMachine,
  pollSecondsRemaining,
}) => {
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const openTickets = tickets.filter((t) => t.status === 'OPEN');

  const filteredTickets = openTickets.filter((t) => {
    const matchesPriority =
      priorityFilter === 'ALL' ||
      t.priority === priorityFilter ||
      (priorityFilter === 'P1' && t.priority === 'CRITICAL');

    const matchesSearch =
      t.machine_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPriority && matchesSearch;
  });

  const handleResolve = async (ticketId: string) => {
    setResolvingTicketId(ticketId);
    try {
      await onResolveTicket(ticketId);
    } finally {
      setResolvingTicketId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'P1':
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            CRITICAL P1
          </span>
        );
      case 'P2':
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-950/90 text-orange-300 border border-orange-500/50">
            HIGH P2
          </span>
        );
      case 'P3':
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/50">
            MEDIUM P3
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/50">
            LOW P4
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl flex flex-col h-full min-h-[460px] shadow-xl">
      
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white">Active Operational Tickets</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-bold border border-slate-700">
                {openTickets.length} OPEN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Real-time edge alert queue</p>
          </div>
        </div>

        {/* Auto-poll countdown bar */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-500 block">AUTO-POLL</span>
            <span className="text-xs text-cyan-400 font-bold">{pollSecondsRemaining}s</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Force refresh ticket queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        {/* Search input */}
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, machine ID, or symptoms..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 font-mono text-[11px]">
          {['ALL', 'P1', 'P2', 'P3'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-all border cursor-pointer whitespace-nowrap ${
                priorityFilter === p
                  ? 'bg-cyan-950 border-cyan-500/80 text-cyan-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Tickets List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[400px] scrollbar-thin scrollbar-thumb-slate-800">
        {isLoading && openTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span>Fetching live tickets from API Gateway...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl p-6 bg-slate-950/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-slate-200">No Open Tickets Found</h4>
            <p className="text-xs text-slate-500 mt-1">All edge nodes are currently operating within healthy thresholds.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.ticket_id;
            const isResolving = resolvingTicketId === ticket.ticket_id;

            return (
              <div
                key={ticket.ticket_id}
                className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200 shadow-lg group"
              >
                {/* Ticket Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_id}</span>
                    {getPriorityBadge(ticket.priority)}
                    <button
                      onClick={() => onSelectMachine(ticket.machine_id)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] border border-cyan-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                      title="View machine on map & command panel"
                    >
                      <Cpu className="w-3 h-3" />
                      {ticket.machine_id}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3">
                  {ticket.description}
                </p>

                {/* AI Runbook Drawer Toggle */}
                <div className="mt-2 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : ticket.ticket_id)}
                    className="w-full flex items-center justify-between text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-500/20 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Runbook Diagnostic</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* AI Runbook Expanded Content */}
                  {isExpanded && (
                    <div className="mt-2 p-3.5 bg-slate-900 border border-indigo-500/30 rounded-xl text-xs font-mono text-slate-300 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold border-b border-slate-800 pb-1.5 mb-2">
                        <span className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                          Recommended Remediation Plan
                        </span>
                        <button
                          onClick={() => handleCopy(ticket.ai_runbook, ticket.ticket_id)}
                          className="text-slate-400 hover:text-white transition-colors p-1"
                          title="Copy runbook steps"
                        >
                          {copiedCode === ticket.ticket_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        {ticket.ai_runbook}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolve Action Button */}
                <div className="mt-3 flex items-center justify-end">
                  <button
                    onClick={() => handleResolve(ticket.ticket_id)}
                    disabled={isResolving}
                    className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-950/50"
                    title="Send PUT {apiUrl}/tickets { ticket_id, action: 'RESOLVE' }"
                  >
                    {isResolving ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Resolve Ticket</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
