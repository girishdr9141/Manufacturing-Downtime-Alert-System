import React from 'react';
import { Ticket } from '../types';
import { X, Clock, Trash2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface MachineHistoryModalProps {
  machineId: string;
  tickets: Ticket[];
  onClose: () => void;
  onClearHistory: (machineId: string) => void;
  isDark?: boolean;
}

export const MachineHistoryModal: React.FC<MachineHistoryModalProps> = ({
  machineId,
  tickets,
  onClose,
  onClearHistory,
  isDark = true,
}) => {
  // Filter tickets for this machine and sort by creation time (newest first)
  const historyTickets = tickets
    .filter(t => t.machine_id === machineId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const modalBg = isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';
  const overlayBg = isDark ? 'bg-slate-950/80' : 'bg-slate-900/50';
  const cardBg = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${overlayBg}`}>
      <div className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border ${modalBg}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-inherit">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-500" />
              Node History: {machineId}
            </h2>
            <p className={`text-sm mt-1 ${subText}`}>
              Historical anomaly and resolution log for this machine
            </p>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Timeline */}
        <div className="p-6 overflow-y-auto flex-1">
          {historyTickets.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 text-center ${subText}`}>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
              <p className="text-lg font-medium">No Historical Data</p>
              <p className="text-sm">This node has a perfect operating record.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-500/20 before:to-transparent">
              {historyTickets.map((ticket, index) => (
                <div key={ticket.ticket_id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                    ticket.status === 'RESOLVED' 
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' 
                      : 'bg-rose-500/20 border-rose-500/30 text-rose-500'
                  } ${isDark ? 'shadow-slate-900' : 'shadow-white bg-white'}`}>
                    {ticket.status === 'RESOLVED' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  
                  {/* Card */}
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm ${cardBg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                        ticket.status === 'RESOLVED' 
                          ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          : isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {ticket.status}
                      </span>
                      <span className={`text-[10px] font-mono flex items-center gap-1 ${subText}`}>
                        <Calendar className="w-3 h-3" />
                        {formatTime(ticket.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-sm mb-2">{ticket.description}</h3>
                    
                    {ticket.status === 'RESOLVED' && (
                      <div className={`mt-3 pt-3 border-t text-sm ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <span className={`block text-xs font-semibold mb-1 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Resolution Notes:</span>
                        <p className={subText}>{ticket.resolution_notes || 'Resolved via Operator Intervention.'}</p>
                        {ticket.resolved_at && (
                          <span className={`block text-[10px] font-mono mt-2 opacity-60`}>
                            Resolved at: {formatTime(ticket.resolved_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-inherit flex items-center justify-between bg-black/5 rounded-b-2xl">
          <p className={`text-xs ${subText}`}>
            Total Events Logged: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{historyTickets.length}</strong>
          </p>
          <button
            onClick={() => onClearHistory(machineId)}
            disabled={historyTickets.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              historyTickets.length === 0 
                ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' 
                : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Clear Database History
          </button>
        </div>
      </div>
    </div>
  );
};
