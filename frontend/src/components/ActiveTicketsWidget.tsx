import React, { useState } from 'react';
import { Ticket, TicketPriority } from '../types';
import {
  AlertTriangle, CheckCircle2, Bot, ChevronDown, ChevronUp,
  Clock, Cpu, Copy, Check, RefreshCw, Search, Sparkles
} from 'lucide-react';

interface ActiveTicketsWidgetProps {
  tickets: Ticket[];
  onResolveTicket: (ticketId: string) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
  onSelectMachine: (machineId: string) => void;
  pollSecondsRemaining: number;
  isDark?: boolean;
}

export const ActiveTicketsWidget: React.FC<ActiveTicketsWidgetProps> = ({
  tickets, onResolveTicket, onRefresh, isLoading, onSelectMachine, pollSecondsRemaining, isDark = true,
}) => {
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const filteredTickets = openTickets.filter((t) => {
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter || (priorityFilter === 'P1' && t.priority === 'CRITICAL');
    const matchesSearch = t.machine_id.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()) || t.ticket_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const handleResolve = async (ticketId: string) => {
    setResolvingTicketId(ticketId);
    try { await onResolveTicket(ticketId); } finally { setResolvingTicketId(null); }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Theme helpers
  const card = isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200 shadow-md';
  const headerBorder = isDark ? 'border-slate-800' : 'border-slate-200';
  const headerTitle = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const countBadge = isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300';
  const refreshBtn = isDark ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900';
  const searchInput = isDark ? 'bg-slate-950/80 border-slate-800 focus:border-cyan-500/80 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-300 focus:border-cyan-400 text-slate-800 placeholder-slate-400';
  const filterActive = isDark ? 'bg-cyan-950 border-cyan-500/80 text-cyan-300' : 'bg-cyan-50 border-cyan-400 text-cyan-700';
  const filterInactive = isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900';
  const ticketCard = isDark ? 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700/80' : 'bg-slate-50 border-slate-200 hover:border-slate-300';
  const ticketId = isDark ? 'text-slate-400' : 'text-slate-500';
  const machineBtn = isDark ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border-cyan-500/20' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 hover:text-cyan-800 border-cyan-300';
  const description = isDark ? 'text-slate-200' : 'text-slate-700';
  const divider = isDark ? 'border-slate-900' : 'border-slate-200';
  const runbookToggle = isDark ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/50 border-indigo-500/20' : 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200';
  const runbookBg = isDark ? 'bg-slate-900 border-indigo-500/30 text-slate-300' : 'bg-indigo-50 border-indigo-200 text-slate-700';
  const runbookInner = isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
  const runbookHeader = isDark ? 'text-indigo-300 border-slate-800' : 'text-indigo-600 border-indigo-200';
  const emptyBorder = isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-300 bg-slate-50';
  const emptyText = isDark ? 'text-slate-200' : 'text-slate-700';

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
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, machine ID, or symptoms..."
            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono outline-none transition-all ${searchInput}`} />
        </div>
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto font-mono text-[11px]">
          {['ALL', 'P1', 'P2', 'P3'].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-all border cursor-pointer whitespace-nowrap ${priorityFilter === p ? filterActive : filterInactive}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[400px]">
        {isLoading && openTickets.length === 0 ? (
          <div className={`py-12 text-center font-mono text-xs flex flex-col items-center gap-2 ${subText}`}>
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span>Fetching live tickets from API Gateway...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={`py-12 text-center border border-dashed rounded-xl p-6 ${emptyBorder}`}>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className={`text-sm font-semibold ${emptyText}`}>No Open Tickets Found</h4>
            <p className={`text-xs mt-1 ${subText}`}>All edge nodes are operating within healthy thresholds.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.ticket_id;
            const isResolving = resolvingTicketId === ticket.ticket_id;
            return (
              <div key={ticket.ticket_id} className={`border rounded-xl p-4 transition-all duration-200 shadow-sm ${ticketCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-xs font-bold ${ticketId}`}>{ticket.ticket_id}</span>
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

                <p className={`text-xs leading-relaxed font-sans mb-3 ${description}`}>{ticket.description}</p>

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

                <div className="mt-3 flex items-center justify-end">
                  <button onClick={() => handleResolve(ticket.ticket_id)} disabled={isResolving}
                    className={`font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm border ${isDark ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-700 hover:text-emerald-800'}`}>
                    {isResolving ? <div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
